use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
    token_interface::{self, Mint as IMint, TokenAccount as ITokenAccount, TokenInterface, TransferChecked},
};

declare_id!("B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t");

// -----------------
// Scoring (tier-only rank is derived client-side)
// -----------------
const SCORE_PER_ATTEMPT: u64 = 1;
const SCORE_PER_VAULT_CREATED: u64 = 50;
const SCORE_PER_WIN: u64 = 250;

// -----------------
// Program
// -----------------
#[program]
pub mod vault_game {
    use super::*;

    pub fn initialize_global(ctx: Context<InitializeGlobal>, skr_mint: Pubkey) -> Result<()> {
        let gs = &mut ctx.accounts.global_state;
        gs.authority = ctx.accounts.authority.key();
        gs.skr_mint = skr_mint;
        gs.vault_count = 0;
        gs.bump = ctx.bumps.global_state;

        let mv = &mut ctx.accounts.mega_vault;
        mv.bump = ctx.bumps.mega_vault;
        Ok(())
    }

    /// Admin-only: set the globally-visible Mega Vault "challenge" vault.
    pub fn set_mega_challenge_vault(ctx: Context<SetMegaChallengeVault>, vault: Pubkey) -> Result<()> {
        require_keys_eq!(ctx.accounts.authority.key(), ctx.accounts.global_state.authority, VaultError::NotAuthorized);

        let mc = &mut ctx.accounts.mega_challenge;
        mc.authority = ctx.accounts.authority.key();
        mc.vault = vault;
        mc.bump = ctx.bumps.mega_challenge;

        Ok(())
    }

    /// Touch (initialize) a player profile.
    ///
    /// Customary for mobile-first Seeker/Saga-style apps: this ensures the PlayerProfile PDA
    /// exists immediately after connect, even before any gameplay actions.
    pub fn touch_player(ctx: Context<TouchPlayer>) -> Result<()> {
        let pp = &mut ctx.accounts.player_profile;
        pp.authority = ctx.accounts.player.key();
        pp.last_seen_ts = Clock::get()?.unix_timestamp;
        pp.bump = ctx.bumps.player_profile;
        Ok(())
    }

    /// Create a new vault.
    ///
    /// Fees are SKR by default; SOL is allowed as fallback.
    /// - If `fee_mint` is Some(mint): fees are paid in that SPL token (must equal GlobalState.skr_mint in v1).
    /// - If `fee_mint` is None: fees are paid in SOL.
    pub fn create_vault(ctx: Context<CreateVault>, args: CreateVaultArgs) -> Result<()> {
        require!(args.end_ts > Clock::get()?.unix_timestamp, VaultError::BadEndTs);
        // Allow zero-fee vaults for free-to-play/demo mode.
        // (u64 is always >= 0)

        let gs = &mut ctx.accounts.global_state;
        let vault = &mut ctx.accounts.vault;

        // Record vault id used for PDA signing.
        vault.vault_id = gs.vault_count;

        // Touch player profile (init if needed) + record creation.
        let pp = &mut ctx.accounts.player_profile;
        pp.authority = ctx.accounts.creator.key();
        pp.vaults_created = pp.vaults_created.checked_add(1).ok_or(VaultError::MathOverflow)?;
        pp.score = pp.score.checked_add(SCORE_PER_VAULT_CREATED).ok_or(VaultError::MathOverflow)?;
        pp.last_seen_ts = Clock::get()?.unix_timestamp;
        pp.bump = ctx.bumps.player_profile;

        // v1 vaults are token vaults (SKR). SOL is kept as fallback for later.
        // v1: token vaults only (SKR)
        require!(args.fee_mint.is_some(), VaultError::PrizeRequiresMint);
        require_keys_eq!(ctx.accounts.fee_mint.key(), gs.skr_mint, VaultError::UnsupportedFeeMint);
        vault.fee_mint = ctx.accounts.fee_mint.key();
        vault.is_sol_fee = false;

        // Prize lock rules (SKR)
        if args.prize_amount > 0 {
            require!(args.prize_amount >= 1000, VaultError::PrizeTooSmall);
        }

        vault.creator = ctx.accounts.creator.key();
        vault.status = VaultStatus::Active as u8;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.end_ts = args.end_ts;
        vault.secret_hash = args.secret_hash;
        vault.prize_amount = args.prize_amount;
        vault.paid_out = false;

        // Guess fee ladder (attempts-only): fee increases 1.2x each attempt.
        // Starting fee is derived from creator base fee and PIN length.
        // v1: standard vaults are 3–6 digits. Mega vault uses 8 digits.
        require!((3..=6).contains(&args.pin_len) || args.pin_len == 8, VaultError::BadPinLen);

        let mult: u64 = match args.pin_len {
            3 => 100,
            4 => 25,
            5 => 10,
            6 => 10,
            8 => 1,
            _ => 10,
        };

        let starting = if args.base_fee_amount == 0 {
            0
        } else {
            args.base_fee_amount
                .checked_mul(mult)
                .ok_or(VaultError::MathOverflow)?
        };

        vault.starting_fee_amount = starting;
        vault.current_fee_amount = starting;
        vault.attempt_count = 0;

        vault.total_fees_collected = 0;
        vault.winner_fee_pool = 0;

        // Lock prize (SKR) into vault_prize_ata.
        if args.prize_amount > 0 {
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi = CpiContext::new(
                cpi_program,
                Transfer {
                    from: ctx.accounts.creator_fee_ata.to_account_info(),
                    to: ctx.accounts.vault_prize_ata.to_account_info(),
                    authority: ctx.accounts.creator.to_account_info(),
                },
            );
            token::transfer(cpi, args.prize_amount)?;
        }
        vault.winner = None;
        vault.settled_at = None;
        vault.bump = ctx.bumps.vault;

        gs.vault_count = gs.vault_count.checked_add(1).ok_or(VaultError::MathOverflow)?;

        emit!(VaultCreated {
            vault: vault.key(),
            creator: vault.creator,
            end_ts: vault.end_ts,
            is_sol_fee: vault.is_sol_fee,
            fee_mint: vault.fee_mint,
            guess_fee_amount: vault.starting_fee_amount,
        });

        Ok(())
    }

    /// Make a guess (SOL fallback path).
    pub fn make_guess_sol(ctx: Context<MakeGuessSol>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.status == VaultStatus::Active as u8, VaultError::VaultNotActive);
        require!(Clock::get()?.unix_timestamp <= vault.end_ts, VaultError::VaultExpired);
        require!(vault.is_sol_fee, VaultError::WrongFeeCurrency);

        // Touch player profile (init if needed) + record attempt.
        let pp = &mut ctx.accounts.player_profile;
        pp.authority = ctx.accounts.player.key();
        pp.attempts = pp.attempts.checked_add(1).ok_or(VaultError::MathOverflow)?;
        pp.score = pp.score.checked_add(SCORE_PER_ATTEMPT).ok_or(VaultError::MathOverflow)?;
        pp.last_seen_ts = Clock::get()?.unix_timestamp;
        pp.bump = ctx.bumps.player_profile;

        let fee = vault.current_fee_amount;
        if fee == 0 {
            // Free-to-play attempt: no transfers.
            vault.attempt_count = vault.attempt_count.checked_add(1).ok_or(VaultError::MathOverflow)?;

            emit!(GuessMade {
                vault: vault.key(),
                player: ctx.accounts.player.key(),
                fee: 0,
                winner_cut: 0,
                mega_cut: 0,
            });
            return Ok(());
        }

        let (winner_cut, mega_cut) = split_fee(fee)?;

        // 80% -> mega_vault PDA, 20% -> vault PDA (kept for winner payout)
        let ix1 = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player.key(),
            &ctx.accounts.mega_vault.key(),
            mega_cut,
        );
        anchor_lang::solana_program::program::invoke(
            &ix1,
            &[
                ctx.accounts.player.to_account_info(),
                ctx.accounts.mega_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        let ix2 = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.player.key(),
            &vault.key(),
            winner_cut,
        );
        anchor_lang::solana_program::program::invoke(
            &ix2,
            &[
                ctx.accounts.player.to_account_info(),
                vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        vault.total_fees_collected = vault
            .total_fees_collected
            .checked_add(fee)
            .ok_or(VaultError::MathOverflow)?;
        vault.winner_fee_pool = vault
            .winner_fee_pool
            .checked_add(winner_cut)
            .ok_or(VaultError::MathOverflow)?;

        vault.attempt_count = vault.attempt_count.checked_add(1).ok_or(VaultError::MathOverflow)?;
        vault.current_fee_amount = next_fee(vault.current_fee_amount)?;

        emit!(GuessMade {
            vault: vault.key(),
            player: ctx.accounts.player.key(),
            fee,
            winner_cut,
            mega_cut,
        });

        Ok(())
    }

    /// Make a guess (SPL token path, SKR in v1).
    pub fn make_guess_spl(ctx: Context<MakeGuessSpl>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.status == VaultStatus::Active as u8, VaultError::VaultNotActive);
        require!(Clock::get()?.unix_timestamp <= vault.end_ts, VaultError::VaultExpired);
        require!(!vault.is_sol_fee, VaultError::WrongFeeCurrency);
        require_keys_eq!(ctx.accounts.fee_mint.key(), vault.fee_mint, VaultError::WrongFeeMint);

        // Touch player profile (init if needed) + record attempt.
        let pp = &mut ctx.accounts.player_profile;
        pp.authority = ctx.accounts.player.key();
        pp.attempts = pp.attempts.checked_add(1).ok_or(VaultError::MathOverflow)?;
        pp.score = pp.score.checked_add(SCORE_PER_ATTEMPT).ok_or(VaultError::MathOverflow)?;
        pp.last_seen_ts = Clock::get()?.unix_timestamp;
        pp.bump = ctx.bumps.player_profile;

        let fee = vault.current_fee_amount;
        if fee == 0 {
            vault.attempt_count = vault.attempt_count.checked_add(1).ok_or(VaultError::MathOverflow)?;

            emit!(GuessMade {
                vault: vault.key(),
                player: ctx.accounts.player.key(),
                fee: 0,
                winner_cut: 0,
                mega_cut: 0,
            });
            return Ok(());
        }

        let (winner_cut, mega_cut) = split_fee(fee)?;

        let cpi_program = ctx.accounts.token_program.to_account_info();

        // 80% -> mega vault
        let cpi1 = CpiContext::new(
            cpi_program.clone(),
            Transfer {
                from: ctx.accounts.player_fee_ata.to_account_info(),
                to: ctx.accounts.mega_vault_fee_ata.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(cpi1, mega_cut)?;

        // 20% -> vault pool
        let cpi2 = CpiContext::new(
            cpi_program,
            Transfer {
                from: ctx.accounts.player_fee_ata.to_account_info(),
                to: ctx.accounts.vault_fee_ata.to_account_info(),
                authority: ctx.accounts.player.to_account_info(),
            },
        );
        token::transfer(cpi2, winner_cut)?;

        vault.total_fees_collected = vault.total_fees_collected.checked_add(fee).ok_or(VaultError::MathOverflow)?;
        vault.winner_fee_pool = vault
            .winner_fee_pool
            .checked_add(winner_cut)
            .ok_or(VaultError::MathOverflow)?;

        vault.attempt_count = vault.attempt_count.checked_add(1).ok_or(VaultError::MathOverflow)?;
        vault.current_fee_amount = next_fee(vault.current_fee_amount)?;

        emit!(GuessMade {
            vault: vault.key(),
            player: ctx.accounts.player.key(),
            fee,
            winner_cut,
            mega_cut,
        });

        Ok(())
    }

    /// Claim win by revealing a secret whose hash matches the vault's committed secret hash.
    /// First valid claimer becomes the winner.
    pub fn claim_win(ctx: Context<ClaimWin>, secret: Vec<u8>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.status == VaultStatus::Active as u8, VaultError::VaultNotActive);
        require!(Clock::get()?.unix_timestamp <= vault.end_ts, VaultError::VaultExpired);
        require!(vault.winner.is_none(), VaultError::AlreadyHasWinner);

        let computed = solana_sha256_hasher::hash(&secret).to_bytes();
        require!(computed == vault.secret_hash, VaultError::BadSecret);

        vault.winner = Some(ctx.accounts.player.key());
        vault.status = VaultStatus::Settled as u8;
        vault.settled_at = Some(Clock::get()?.unix_timestamp);

        // Touch player profile (init if needed) + record win.
        let pp = &mut ctx.accounts.player_profile;
        pp.authority = ctx.accounts.player.key();
        pp.wins = pp.wins.checked_add(1).ok_or(VaultError::MathOverflow)?;
        pp.score = pp.score.checked_add(SCORE_PER_WIN).ok_or(VaultError::MathOverflow)?;
        pp.last_seen_ts = Clock::get()?.unix_timestamp;
        pp.bump = ctx.bumps.player_profile;

        emit!(VaultWon {
            vault: vault.key(),
            winner: ctx.accounts.player.key(),
        });

        Ok(())
    }

    /// Claim prize + vault pool as the winner after the vault expires.
    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // Pull values out first to avoid borrow conflicts during CPI.
        let end_ts = ctx.accounts.vault.end_ts;
        let paid_out = ctx.accounts.vault.paid_out;
        let winner = ctx.accounts.vault.winner;
        let prize_amount = ctx.accounts.vault.prize_amount;
        let vault_id_bytes = ctx.accounts.vault.vault_id.to_le_bytes();
        let bump = ctx.accounts.vault.bump;

        require!(now > end_ts, VaultError::VaultNotExpired);
        require!(!paid_out, VaultError::AlreadyPaidOut);
        require!(winner == Some(ctx.accounts.winner.key()), VaultError::NotWinner);

        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", vault_id_bytes.as_ref(), &[bump]]];

        // Transfer locked prize + vault fee pool to the winner.
        let total_prize = prize_amount;

        if total_prize > 0 {
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi = CpiContext::new_with_signer(
                cpi_program.clone(),
                Transfer {
                    from: ctx.accounts.vault_prize_ata.to_account_info(),
                    to: ctx.accounts.winner_fee_ata.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(cpi, total_prize)?;
        }

        // Winner pool (80% slices of attempt fees) lives in vault_fee_ata.
        let pool_amount = ctx.accounts.vault_fee_ata.amount;
        if pool_amount > 0 {
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi = CpiContext::new_with_signer(
                cpi_program,
                Transfer {
                    from: ctx.accounts.vault_fee_ata.to_account_info(),
                    to: ctx.accounts.winner_fee_ata.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(cpi, pool_amount)?;
        }

        ctx.accounts.vault.paid_out = true;

        Ok(())
    }

    /// Reclaim prize as the creator after expiry if nobody wins.
    /// Creator receives: locked prize + 50% of vault pool.
    /// Mega vault receives: remaining 50% of vault pool (in addition to its 20% live cut).
    pub fn reclaim_prize(ctx: Context<ReclaimPrize>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        // Pull values out first to avoid borrow conflicts during CPI.
        let end_ts = ctx.accounts.vault.end_ts;
        let paid_out = ctx.accounts.vault.paid_out;
        let winner = ctx.accounts.vault.winner;
        let creator_key = ctx.accounts.vault.creator;
        let prize_amount = ctx.accounts.vault.prize_amount;
        let vault_id_bytes = ctx.accounts.vault.vault_id.to_le_bytes();
        let bump = ctx.accounts.vault.bump;

        require!(now > end_ts, VaultError::VaultNotExpired);
        require!(!paid_out, VaultError::AlreadyPaidOut);
        require!(winner.is_none(), VaultError::AlreadyHasWinner);
        require!(creator_key == ctx.accounts.creator.key(), VaultError::NotCreator);

        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", vault_id_bytes.as_ref(), &[bump]]];

        // Return locked prize.
        let total_prize = prize_amount;
        if total_prize > 0 {
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi = CpiContext::new_with_signer(
                cpi_program.clone(),
                Transfer {
                    from: ctx.accounts.vault_prize_ata.to_account_info(),
                    to: ctx.accounts.creator_fee_ata.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                signer_seeds,
            );
            token::transfer(cpi, total_prize)?;
        }

        // Split vault pool 50/50 between creator and mega vault.
        let pool_amount = ctx.accounts.vault_fee_ata.amount;
        if pool_amount > 0 {
            let creator_cut = pool_amount / 2;
            let mega_cut = pool_amount.checked_sub(creator_cut).ok_or(VaultError::MathOverflow)?;

            let cpi_program = ctx.accounts.token_program.to_account_info();

            if creator_cut > 0 {
                let cpi = CpiContext::new_with_signer(
                    cpi_program.clone(),
                    Transfer {
                        from: ctx.accounts.vault_fee_ata.to_account_info(),
                        to: ctx.accounts.creator_fee_ata.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                );
                token::transfer(cpi, creator_cut)?;
            }

            if mega_cut > 0 {
                let cpi = CpiContext::new_with_signer(
                    cpi_program,
                    Transfer {
                        from: ctx.accounts.vault_fee_ata.to_account_info(),
                        to: ctx.accounts.mega_vault_fee_ata.to_account_info(),
                        authority: ctx.accounts.vault.to_account_info(),
                    },
                    signer_seeds,
                );
                token::transfer(cpi, mega_cut)?;
            }
        }

        ctx.accounts.vault.paid_out = true;
        ctx.accounts.vault.status = VaultStatus::Cancelled as u8;

        Ok(())
    }

    /// Creator-only: deposit an extra reward (any SPL mint / standard NFT) into the vault.
    ///
    /// The reward is escrowed in a vault-owned (PDA) token account.
    pub fn add_reward(ctx: Context<AddReward>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::BadRewardAmount);
        require!(ctx.accounts.vault.creator == ctx.accounts.creator.key(), VaultError::NotCreator);

        // (Re)initialize reward record.
        let reward = &mut ctx.accounts.reward;
        if reward.mint == Pubkey::default() {
            reward.vault = ctx.accounts.vault.key();
            reward.mint = ctx.accounts.reward_mint.key();
            reward.token_program = ctx.accounts.token_program.key();
            reward.amount = 0;
            reward.claimed = false;
            reward.bump = ctx.bumps.reward;
        } else {
            require_keys_eq!(reward.mint, ctx.accounts.reward_mint.key(), VaultError::RewardWrongMint);
            require_keys_eq!(reward.token_program, ctx.accounts.token_program.key(), VaultError::RewardWrongTokenProgram);
            require!(!reward.claimed, VaultError::RewardAlreadyClaimed);
        }

        // Transfer from creator -> vault escrow.
        let decimals = ctx.accounts.reward_mint.decimals;
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi = CpiContext::new(
            cpi_program,
            TransferChecked {
                from: ctx.accounts.creator_reward_ata.to_account_info(),
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.vault_reward_ata.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        );
        token_interface::transfer_checked(cpi, amount, decimals)?;

        reward.amount = reward.amount.checked_add(amount).ok_or(VaultError::MathOverflow)?;

        Ok(())
    }

    /// Winner claims a single extra reward after the vault expires.
    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(now > ctx.accounts.vault.end_ts, VaultError::VaultNotExpired);
        require!(ctx.accounts.vault.winner == Some(ctx.accounts.winner.key()), VaultError::NotWinner);

        let reward = &mut ctx.accounts.reward;
        require!(!reward.claimed, VaultError::RewardAlreadyClaimed);
        require!(reward.amount > 0, VaultError::BadRewardAmount);

        let vault_id_bytes = ctx.accounts.vault.vault_id.to_le_bytes();
        let bump = ctx.accounts.vault.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", vault_id_bytes.as_ref(), &[bump]]];

        let decimals = ctx.accounts.reward_mint.decimals;
        let amount = reward.amount;

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi = CpiContext::new_with_signer(
            cpi_program,
            TransferChecked {
                from: ctx.accounts.vault_reward_ata.to_account_info(),
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.winner_reward_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token_interface::transfer_checked(cpi, amount, decimals)?;

        reward.amount = 0;
        reward.claimed = true;

        Ok(())
    }

    /// Creator reclaims a single extra reward after expiry if nobody won.
    pub fn reclaim_reward(ctx: Context<ReclaimReward>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        require!(now > ctx.accounts.vault.end_ts, VaultError::VaultNotExpired);
        require!(ctx.accounts.vault.winner.is_none(), VaultError::AlreadyHasWinner);
        require!(ctx.accounts.vault.creator == ctx.accounts.creator.key(), VaultError::NotCreator);

        let reward = &mut ctx.accounts.reward;
        require!(!reward.claimed, VaultError::RewardAlreadyClaimed);
        require!(reward.amount > 0, VaultError::BadRewardAmount);

        let vault_id_bytes = ctx.accounts.vault.vault_id.to_le_bytes();
        let bump = ctx.accounts.vault.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", vault_id_bytes.as_ref(), &[bump]]];

        let decimals = ctx.accounts.reward_mint.decimals;
        let amount = reward.amount;

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi = CpiContext::new_with_signer(
            cpi_program,
            TransferChecked {
                from: ctx.accounts.vault_reward_ata.to_account_info(),
                mint: ctx.accounts.reward_mint.to_account_info(),
                to: ctx.accounts.creator_reward_ata.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token_interface::transfer_checked(cpi, amount, decimals)?;

        reward.amount = 0;
        reward.claimed = true;

        Ok(())
    }
}

fn next_fee(prev_fee: u64) -> Result<u64> {
    // ceil(prev_fee * 1.2) == ceil(prev_fee * 6 / 5)
    let n = prev_fee.checked_mul(6).ok_or(VaultError::MathOverflow)?;
    Ok((n + 4) / 5)
}

fn split_fee(fee: u64) -> Result<(u64, u64)> {
    // v1 economics: 80% -> vault pool (winner), 20% -> mega vault
    let winner_cut = fee
        .checked_mul(80)
        .ok_or(VaultError::MathOverflow)?
        / 100;
    let mega_cut = fee.checked_sub(winner_cut).ok_or(VaultError::MathOverflow)?;
    Ok((winner_cut, mega_cut))
}

// -----------------
// Args
// -----------------
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateVaultArgs {
    pub end_ts: i64,
    pub secret_hash: [u8; 32],

    /// Locked prize amount (SKR) held by the vault.
    /// 0 is allowed for demo/free vaults.
    pub prize_amount: u64,

    /// Base attempt fee chosen by creator. (0 = free vault)
    pub base_fee_amount: u64,

    /// Numeric PIN length (3–6). Used to scale the starting attempt cost.
    pub pin_len: u8,

    /// Fee mint. v1: must be Some(GlobalState.skr_mint) for token vaults.
    pub fee_mint: Option<Pubkey>,
}

// -----------------
// Accounts
// -----------------
#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::LEN,
        seeds = [b"global"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = authority,
        space = 8 + MegaVault::LEN,
        seeds = [b"mega_vault"],
        bump
    )]
    pub mega_vault: Account<'info, MegaVault>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TouchPlayer<'info> {
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerProfile::LEN,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetMegaChallengeVault<'info> {
    #[account(mut, seeds=[b"global"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + MegaChallenge::LEN,
        seeds=[b"mega_challenge"],
        bump
    )]
    pub mega_challenge: Account<'info, MegaChallenge>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(args: CreateVaultArgs)]
pub struct CreateVault<'info> {
    #[account(mut, seeds=[b"global"], bump = global_state.bump)]
    pub global_state: Box<Account<'info, GlobalState>>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Box<Account<'info, MegaVault>>,

    #[account(
        init,
        payer = creator,
        space = 8 + Vault::LEN,
        seeds = [b"vault", global_state.vault_count.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + PlayerProfile::LEN,
        seeds = [b"player", creator.key().as_ref()],
        bump
    )]
    pub player_profile: Box<Account<'info, PlayerProfile>>,

    // v1: SKR mint (matches global_state.skr_mint)
    pub fee_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = creator_fee_ata.mint == fee_mint.key() @ VaultError::WrongFeeMint,
        constraint = creator_fee_ata.owner == creator.key() @ VaultError::WrongFeeOwner
    )]
    pub creator_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_prize_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = fee_mint,
        associated_token::authority = mega_vault,
    )]
    pub mega_vault_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeGuessSol<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Account<'info, MegaVault>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerProfile::LEN,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeGuessSpl<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Account<'info, MegaVault>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerProfile::LEN,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub fee_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = player_fee_ata.mint == fee_mint.key() @ VaultError::WrongFeeMint,
        constraint = player_fee_ata.owner == player.key() @ VaultError::WrongFeeOwner
    )]
    pub player_fee_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = mega_vault,
    )]
    pub mega_vault_fee_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_fee_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWin<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + PlayerProfile::LEN,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Box<Account<'info, MegaVault>>,

    pub fee_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_prize_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = winner_fee_ata.mint == fee_mint.key() @ VaultError::WrongFeeMint,
        constraint = winner_fee_ata.owner == winner.key() @ VaultError::WrongFeeOwner
    )]
    pub winner_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub winner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReclaimPrize<'info> {
    #[account(mut)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Box<Account<'info, MegaVault>>,

    pub fee_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = vault,
    )]
    pub vault_prize_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = creator_fee_ata.mint == fee_mint.key() @ VaultError::WrongFeeMint,
        constraint = creator_fee_ata.owner == creator.key() @ VaultError::WrongFeeOwner
    )]
    pub creator_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::mint = fee_mint,
        associated_token::authority = mega_vault,
    )]
    pub mega_vault_fee_ata: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// -----------------
// Reward escrow (any SPL / standard NFT)
// -----------------

#[derive(Accounts)]
pub struct AddReward<'info> {
    #[account(mut)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        init_if_needed,
        payer = creator,
        space = 8 + VaultReward::LEN,
        seeds = [b"reward", vault.key().as_ref(), reward_mint.key().as_ref()],
        bump
    )]
    pub reward: Box<Account<'info, VaultReward>>,

    pub reward_mint: InterfaceAccount<'info, IMint>,

    #[account(
        mut,
        constraint = creator_reward_ata.owner == creator.key() @ VaultError::WrongFeeOwner,
        constraint = creator_reward_ata.mint == reward_mint.key() @ VaultError::RewardWrongMint
    )]
    pub creator_reward_ata: InterfaceAccount<'info, ITokenAccount>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = reward_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_reward_ata: InterfaceAccount<'info, ITokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [b"reward", vault.key().as_ref(), reward_mint.key().as_ref()],
        bump = reward.bump,
        constraint = reward.vault == vault.key() @ VaultError::RewardWrongVault,
        constraint = reward.mint == reward_mint.key() @ VaultError::RewardWrongMint,
        constraint = reward.token_program == token_program.key() @ VaultError::RewardWrongTokenProgram,
    )]
    pub reward: Box<Account<'info, VaultReward>>,

    pub reward_mint: InterfaceAccount<'info, IMint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_reward_ata: InterfaceAccount<'info, ITokenAccount>,

    #[account(
        init_if_needed,
        payer = winner,
        associated_token::mint = reward_mint,
        associated_token::authority = winner,
        associated_token::token_program = token_program,
    )]
    pub winner_reward_ata: InterfaceAccount<'info, ITokenAccount>,

    #[account(mut)]
    pub winner: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReclaimReward<'info> {
    #[account(mut)]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        mut,
        seeds = [b"reward", vault.key().as_ref(), reward_mint.key().as_ref()],
        bump = reward.bump,
        constraint = reward.vault == vault.key() @ VaultError::RewardWrongVault,
        constraint = reward.mint == reward_mint.key() @ VaultError::RewardWrongMint,
        constraint = reward.token_program == token_program.key() @ VaultError::RewardWrongTokenProgram,
    )]
    pub reward: Box<Account<'info, VaultReward>>,

    pub reward_mint: InterfaceAccount<'info, IMint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = vault,
        associated_token::token_program = token_program,
    )]
    pub vault_reward_ata: InterfaceAccount<'info, ITokenAccount>,

    #[account(
        init_if_needed,
        payer = creator,
        associated_token::mint = reward_mint,
        associated_token::authority = creator,
        associated_token::token_program = token_program,
    )]
    pub creator_reward_ata: InterfaceAccount<'info, ITokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

// -----------------
// State
// -----------------
#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub skr_mint: Pubkey,
    pub vault_count: u64,
    pub bump: u8,
}
impl GlobalState {
    pub const LEN: usize = 32 + 32 + 8 + 1;
}

/// Separate PDA to avoid resizing `GlobalState` on devnet.
#[account]
pub struct MegaChallenge {
    pub authority: Pubkey,
    pub vault: Pubkey,
    pub bump: u8,
}
impl MegaChallenge {
    pub const LEN: usize = 32 + 32 + 1;
}

#[account]
pub struct MegaVault {
    pub bump: u8,
}
impl MegaVault {
    pub const LEN: usize = 1;
}

#[account]
pub struct PlayerProfile {
    pub authority: Pubkey,
    pub attempts: u64,
    pub wins: u64,
    pub vaults_created: u64,
    pub score: u64,
    pub last_seen_ts: i64,
    pub bump: u8,
}
impl PlayerProfile {
    pub const LEN: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Vault {
    pub creator: Pubkey,
    pub status: u8,
    pub created_at: i64,
    pub end_ts: i64,
    pub secret_hash: [u8; 32],

    // Vault id used for PDA signing (seeded by global_state.vault_count at creation time)
    pub vault_id: u64,

    // Locked prize amount (SKR)
    pub prize_amount: u64,

    // Guess fee ladder (attempts-only)
    pub starting_fee_amount: u64,
    pub current_fee_amount: u64,
    pub attempt_count: u64,

    pub is_sol_fee: bool,
    pub fee_mint: Pubkey,

    pub total_fees_collected: u64,
    pub winner_fee_pool: u64,

    pub winner: Option<Pubkey>,
    pub settled_at: Option<i64>,

    // Settlement guard
    pub paid_out: bool,

    pub bump: u8,
}
impl Vault {
    // Old len + vault_id(8) + prize_amount(8) + paid_out(1)
    pub const LEN: usize = (32 + 1 + 8 + 8 + 32) + 8 + 8 + (8 + 8 + 8) + 1 + 32 + 8 + 8 + (1 + 32) + (1 + 8) + 1 + 1;
}

/// Extra rewards (any SPL mint / standard NFT) escrowed inside a vault.
///
/// v1 scope:
/// - Supports Tokenkeg + Token-2022 via `token_interface`.
/// - Does NOT support compressed NFTs (cNFTs) or programmable NFT rule sets.
#[account]
pub struct VaultReward {
    pub vault: Pubkey,
    pub mint: Pubkey,
    pub token_program: Pubkey,
    pub amount: u64,
    pub claimed: bool,
    pub bump: u8,
}
impl VaultReward {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 1 + 1;
}

#[repr(u8)]
pub enum VaultStatus {
    Active = 1,
    Settled = 2,
    Cancelled = 3,
}

// -----------------
// Events
// -----------------
#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub creator: Pubkey,
    pub end_ts: i64,
    pub is_sol_fee: bool,
    pub fee_mint: Pubkey,
    pub guess_fee_amount: u64,
}

#[event]
pub struct GuessMade {
    pub vault: Pubkey,
    pub player: Pubkey,
    pub fee: u64,
    pub winner_cut: u64,
    pub mega_cut: u64,
}

#[event]
pub struct VaultWon {
    pub vault: Pubkey,
    pub winner: Pubkey,
}

// -----------------
// Errors
// -----------------
#[error_code]
pub enum VaultError {
    #[msg("Bad end timestamp")]
    BadEndTs,
    #[msg("Bad PIN length")]
    BadPinLen,
    #[msg("Prize requires SPL mint")]
    PrizeRequiresMint,
    #[msg("Prize too small")]
    PrizeTooSmall,
    #[msg("Bad fee")]
    BadFee,
    #[msg("Bad reward amount")]
    BadRewardAmount,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Vault not active")]
    VaultNotActive,
    #[msg("Vault expired")]
    VaultExpired,
    #[msg("Vault has not expired")]
    VaultNotExpired,
    #[msg("Already paid out")]
    AlreadyPaidOut,
    #[msg("Not the winner")]
    NotWinner,
    #[msg("Not the creator")]
    NotCreator,
    #[msg("Unsupported fee mint (SKR only for now)")]
    UnsupportedFeeMint,
    #[msg("Wrong fee currency for this vault")]
    WrongFeeCurrency,
    #[msg("Wrong fee mint")]
    WrongFeeMint,
    #[msg("Wrong fee token account owner")]
    WrongFeeOwner,
    #[msg("Vault already has winner")]
    AlreadyHasWinner,
    #[msg("Incorrect secret")]
    BadSecret,

    #[msg("Reward already claimed")]
    RewardAlreadyClaimed,
    #[msg("Reward vault mismatch")]
    RewardWrongVault,
    #[msg("Reward mint mismatch")]
    RewardWrongMint,
    #[msg("Reward token program mismatch")]
    RewardWrongTokenProgram,
}

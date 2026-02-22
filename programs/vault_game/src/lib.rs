use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t");

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

    /// Create a new vault.
    ///
    /// Fees are SKR by default; SOL is allowed as fallback.
    /// - If `fee_mint` is Some(mint): fees are paid in that SPL token (must equal GlobalState.skr_mint in v1).
    /// - If `fee_mint` is None: fees are paid in SOL.
    pub fn create_vault(ctx: Context<CreateVault>, args: CreateVaultArgs) -> Result<()> {
        require!(args.end_ts > Clock::get()?.unix_timestamp, VaultError::BadEndTs);
        // Allow zero-fee vaults for free-to-play/demo mode.
        require!(args.guess_fee_amount >= 0, VaultError::BadFee);

        let gs = &mut ctx.accounts.global_state;
        let vault = &mut ctx.accounts.vault;

        if let Some(mint) = args.fee_mint {
            require_keys_eq!(mint, gs.skr_mint, VaultError::UnsupportedFeeMint);
            vault.fee_mint = mint;
            vault.is_sol_fee = false;
        } else {
            vault.fee_mint = Pubkey::default();
            vault.is_sol_fee = true;
        }

        vault.creator = ctx.accounts.creator.key();
        vault.status = VaultStatus::Active as u8;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.end_ts = args.end_ts;
        vault.secret_hash = args.secret_hash;

        // Guess fee ladder (attempts-only): fee increases 1.2x each attempt.
        vault.starting_fee_amount = args.guess_fee_amount;
        vault.current_fee_amount = args.guess_fee_amount;
        vault.attempt_count = 0;

        vault.total_fees_collected = 0;
        vault.winner_fee_pool = 0;
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
    /// First valid claimer becomes the winner (v1: marks Settled; asset distribution comes next).
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

        emit!(VaultWon {
            vault: vault.key(),
            winner: ctx.accounts.player.key(),
        });

        Ok(())
    }
}

fn next_fee(prev_fee: u64) -> Result<u64> {
    // ceil(prev_fee * 1.2) == ceil(prev_fee * 6 / 5)
    let n = prev_fee.checked_mul(6).ok_or(VaultError::MathOverflow)?;
    Ok((n + 4) / 5)
}

fn split_fee(fee: u64) -> Result<(u64, u64)> {
    let winner_cut = fee
        .checked_mul(20)
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
    pub guess_fee_amount: u64,
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
#[instruction(args: CreateVaultArgs)]
pub struct CreateVault<'info> {
    #[account(mut, seeds=[b"global"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = creator,
        space = 8 + Vault::LEN,
        seeds = [b"vault", global_state.vault_count.to_le_bytes().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeGuessSol<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Account<'info, MegaVault>,

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

    #[account(mut)]
    pub player: Signer<'info>,
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

#[account]
pub struct MegaVault {
    pub bump: u8,
}
impl MegaVault {
    pub const LEN: usize = 1;
}

#[account]
pub struct Vault {
    pub creator: Pubkey,
    pub status: u8,
    pub created_at: i64,
    pub end_ts: i64,
    pub secret_hash: [u8; 32],

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

    pub bump: u8,
}
impl Vault {
    pub const LEN: usize = 32 + 1 + 8 + 8 + 32 + (8 + 8 + 8) + 1 + 32 + 8 + 8 + (1 + 32) + (1 + 8) + 1;
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
    #[msg("Bad fee")]
    BadFee,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Vault not active")]
    VaultNotActive,
    #[msg("Vault expired")]
    VaultExpired,
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
}

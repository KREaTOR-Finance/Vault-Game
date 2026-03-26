use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

declare_id!("7dEcm9oky2scx64qDAGEmRYgYovA5qr9qktmswdhTVN");

// VaultCrack v1: minimal payment rails + escrow.
// - Secrets/guess verification are OFF-CHAIN.
// - Attempts are on-chain txns that pay fees and split 50/50: Mega Vault vs Vault Pool.
// - Backend authority can set winner; if uncracked at expiry, finalize sets winner=creator (or treasury for system vaults).
// - Claim is immediately available once winner is set.

#[program]
pub mod vault_game {
    use super::*;

    pub fn initialize_global(
        ctx: Context<InitializeGlobal>,
        skr_mint: Pubkey,
        backend_authority: Pubkey,
        treasury: Pubkey,
    ) -> Result<()> {
        let gs = &mut ctx.accounts.global_state;
        gs.authority = ctx.accounts.authority.key();
        gs.backend_authority = backend_authority;
        gs.treasury = treasury;
        gs.skr_mint = skr_mint;
        gs.vault_count = 0;
        gs.bump = ctx.bumps.global_state;

        let mv = &mut ctx.accounts.mega_vault;
        mv.bump = ctx.bumps.mega_vault;

        Ok(())
    }

    pub fn set_mega_challenge_vault(
        ctx: Context<SetMegaChallengeVault>,
        vault: Pubkey,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.global_state.authority,
            VaultError::NotAuthorized
        );

        let mc = &mut ctx.accounts.mega_challenge;
        mc.authority = ctx.accounts.authority.key();
        mc.vault = vault;
        mc.bump = ctx.bumps.mega_challenge;
        Ok(())
    }

    /// Create a new vault.
    ///
    /// v1 (alpha): SPL-token only (SKR on mainnet; devnet test mint in dev).
    pub fn create_vault(ctx: Context<CreateVault>, args: CreateVaultArgs) -> Result<()> {
        require!(
            args.end_ts > Clock::get()?.unix_timestamp,
            VaultError::BadEndTs
        );
        require!(
            (3..=6).contains(&args.pin_len) || args.pin_len == 8,
            VaultError::BadPinLen
        );

        let gs = &mut ctx.accounts.global_state;
        let vault = &mut ctx.accounts.vault;

        // v1: SPL only; fee mint must be SKR.
        require_keys_eq!(
            ctx.accounts.fee_mint.key(),
            gs.skr_mint,
            VaultError::UnsupportedFeeMint
        );

        vault.creator = ctx.accounts.creator.key();
        vault.is_system = args.is_system;
        vault.status = VaultStatus::Active as u8;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.end_ts = args.end_ts;
        vault.pin_len = args.pin_len;
        vault.vault_id = gs.vault_count;

        vault.is_sol = false;
        vault.mint = ctx.accounts.fee_mint.key();

        vault.prize_amount = args.prize_amount;
        vault.base_fee = args.base_fee;
        vault.fee_step = if args.fee_step == 0 { 1 } else { args.fee_step };
        vault.current_fee = args.base_fee;
        vault.attempt_count = 0;

        vault.winner = None;
        vault.settled_at = None;
        vault.paid_out = false;
        vault.bump = ctx.bumps.vault;

        // Lock prize into vault_prize_ata.
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

        gs.vault_count = gs
            .vault_count
            .checked_add(1)
            .ok_or(VaultError::MathOverflow)?;

        emit!(VaultCreated {
            vault: vault.key(),
            creator: vault.creator,
            end_ts: vault.end_ts,
            mint: vault.mint,
            base_fee: vault.base_fee,
            fee_step: vault.fee_step,
            prize_amount: vault.prize_amount,
            pin_len: vault.pin_len,
            is_system: vault.is_system,
        });

        Ok(())
    }

    /// Paid attempt: charges current_fee and splits 50/50 between mega vault and vault fee pool.
    pub fn attempt_spl(ctx: Context<AttemptSpl>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            vault.status == VaultStatus::Active as u8,
            VaultError::VaultNotActive
        );
        require!(
            Clock::get()?.unix_timestamp <= vault.end_ts,
            VaultError::VaultExpired
        );
        require!(!vault.paid_out, VaultError::AlreadyPaidOut);
        require!(vault.winner.is_none(), VaultError::AlreadyHasWinner);

        let fee = vault.current_fee;
        if fee > 0 {
            let mega_cut = fee / 2;
            let vault_cut = fee.checked_sub(mega_cut).ok_or(VaultError::MathOverflow)?;

            let cpi_program = ctx.accounts.token_program.to_account_info();

            // 50% -> mega vault
            let cpi1 = CpiContext::new(
                cpi_program.clone(),
                Transfer {
                    from: ctx.accounts.player_fee_ata.to_account_info(),
                    to: ctx.accounts.mega_vault_fee_ata.to_account_info(),
                    authority: ctx.accounts.player.to_account_info(),
                },
            );
            token::transfer(cpi1, mega_cut)?;

            // 50% -> vault pool
            let cpi2 = CpiContext::new(
                cpi_program,
                Transfer {
                    from: ctx.accounts.player_fee_ata.to_account_info(),
                    to: ctx.accounts.vault_fee_ata.to_account_info(),
                    authority: ctx.accounts.player.to_account_info(),
                },
            );
            token::transfer(cpi2, vault_cut)?;

            emit!(Attempted {
                vault: vault.key(),
                player: ctx.accounts.player.key(),
                fee,
                mega_cut,
                vault_cut,
                new_fee: fee
                    .checked_add(vault.fee_step)
                    .ok_or(VaultError::MathOverflow)?,
            });
        } else {
            emit!(Attempted {
                vault: vault.key(),
                player: ctx.accounts.player.key(),
                fee: 0,
                mega_cut: 0,
                vault_cut: 0,
                new_fee: vault.fee_step,
            });
        }

        vault.attempt_count = vault
            .attempt_count
            .checked_add(1)
            .ok_or(VaultError::MathOverflow)?;
        vault.current_fee = vault
            .current_fee
            .checked_add(vault.fee_step)
            .ok_or(VaultError::MathOverflow)?;

        Ok(())
    }

    /// Backend-authority only: set winner immediately when backend verifies the guess off-chain.
    pub fn set_winner(ctx: Context<SetWinner>, winner: Pubkey) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.backend_authority.key(),
            ctx.accounts.global_state.backend_authority,
            VaultError::NotAuthorized
        );

        let vault = &mut ctx.accounts.vault;
        require!(
            vault.status == VaultStatus::Active as u8,
            VaultError::VaultNotActive
        );
        require!(vault.winner.is_none(), VaultError::AlreadyHasWinner);
        require!(!vault.paid_out, VaultError::AlreadyPaidOut);

        vault.winner = Some(winner);
        vault.status = VaultStatus::Settled as u8;
        vault.settled_at = Some(Clock::get()?.unix_timestamp);

        emit!(WinnerSet {
            vault: vault.key(),
            winner
        });
        Ok(())
    }

    /// Anyone can finalize after expiry if uncracked. Winner becomes creator, or treasury for system vaults.
    pub fn finalize_expired(ctx: Context<FinalizeExpired>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let vault = &mut ctx.accounts.vault;

        require!(
            vault.status == VaultStatus::Active as u8,
            VaultError::VaultNotActive
        );
        require!(now > vault.end_ts, VaultError::VaultNotExpired);
        require!(vault.winner.is_none(), VaultError::AlreadyHasWinner);
        require!(!vault.paid_out, VaultError::AlreadyPaidOut);

        let winner = if vault.is_system {
            ctx.accounts.global_state.treasury
        } else {
            vault.creator
        };

        vault.winner = Some(winner);
        vault.status = VaultStatus::Settled as u8;
        vault.settled_at = Some(now);

        emit!(WinnerSet {
            vault: vault.key(),
            winner
        });
        Ok(())
    }

    /// Winner claims immediately after settlement. Transfers prize escrow + vault fee pool.
    pub fn claim_spl(ctx: Context<ClaimSpl>) -> Result<()> {
        // Pull values first to avoid borrow conflicts during CPI.
        let status = ctx.accounts.vault.status;
        let paid_out = ctx.accounts.vault.paid_out;
        let winner = ctx.accounts.vault.winner;
        let prize_amount = ctx.accounts.vault.prize_amount;
        let vault_id_bytes = ctx.accounts.vault.vault_id.to_le_bytes();
        let bump = ctx.accounts.vault.bump;

        require!(
            status == VaultStatus::Settled as u8,
            VaultError::VaultNotSettled
        );
        require!(!paid_out, VaultError::AlreadyPaidOut);
        require!(
            winner == Some(ctx.accounts.winner.key()),
            VaultError::NotWinner
        );

        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", vault_id_bytes.as_ref(), &[bump]]];

        // Transfer prize
        if prize_amount > 0 {
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
            token::transfer(cpi, prize_amount)?;
        }

        // Transfer vault fee pool (entire balance)
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
        emit!(Claimed {
            vault: ctx.accounts.vault.key(),
            winner: ctx.accounts.winner.key(),
            prize: prize_amount,
            pool: pool_amount
        });
        Ok(())
    }
}

// -----------------
// Args
// -----------------
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateVaultArgs {
    pub end_ts: i64,
    pub pin_len: u8,
    pub is_system: bool,

    /// Escrowed prize/deposit amount (in mint minor units).
    pub prize_amount: u64,

    /// Initial attempt fee.
    pub base_fee: u64,

    /// Fee increment per attempt (default 1 if 0).
    pub fee_step: u64,
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
pub struct AttemptSpl<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut, seeds=[b"mega_vault"], bump = mega_vault.bump)]
    pub mega_vault: Account<'info, MegaVault>,

    #[account(
        constraint = fee_mint.key() == vault.mint @ VaultError::WrongFeeMint,
    )]
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

    #[account(mut)]
    pub player: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetWinner<'info> {
    #[account(mut, seeds=[b"global"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,

    pub backend_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct FinalizeExpired<'info> {
    #[account(seeds=[b"global"], bump = global_state.bump)]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct ClaimSpl<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.vault_id.to_le_bytes().as_ref()],
        bump = vault.bump,
    )]
    pub vault: Box<Account<'info, Vault>>,

    #[account(
        constraint = fee_mint.key() == vault.mint @ VaultError::WrongFeeMint,
    )]
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

// -----------------
// State
// -----------------

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub backend_authority: Pubkey,
    pub treasury: Pubkey,
    pub skr_mint: Pubkey,
    pub vault_count: u64,
    pub bump: u8,
}
impl GlobalState {
    pub const LEN: usize = 32 + 32 + 32 + 32 + 8 + 1;
}

#[account]
pub struct MegaVault {
    pub bump: u8,
}
impl MegaVault {
    pub const LEN: usize = 1;
}

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
pub struct Vault {
    pub creator: Pubkey,
    pub is_system: bool,
    pub status: u8,
    pub created_at: i64,
    pub end_ts: i64,
    pub pin_len: u8,

    pub vault_id: u64,

    pub is_sol: bool,
    pub mint: Pubkey,

    pub prize_amount: u64,

    pub base_fee: u64,
    pub fee_step: u64,
    pub current_fee: u64,
    pub attempt_count: u64,

    pub winner: Option<Pubkey>,
    pub settled_at: Option<i64>,

    pub paid_out: bool,

    pub bump: u8,
}
impl Vault {
    pub const LEN: usize = 32 + // creator
        1 +  // is_system
        1 +  // status
        8 +  // created_at
        8 +  // end_ts
        1 +  // pin_len
        8 +  // vault_id
        1 +  // is_sol
        32 + // mint
        8 +  // prize_amount
        8 +  // base_fee
        8 +  // fee_step
        8 +  // current_fee
        8 +  // attempt_count
        (1 + 32) + // winner
        (1 + 8) +  // settled_at
        1 +  // paid_out
        1; // bump
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
    pub mint: Pubkey,
    pub base_fee: u64,
    pub fee_step: u64,
    pub prize_amount: u64,
    pub pin_len: u8,
    pub is_system: bool,
}

#[event]
pub struct Attempted {
    pub vault: Pubkey,
    pub player: Pubkey,
    pub fee: u64,
    pub mega_cut: u64,
    pub vault_cut: u64,
    pub new_fee: u64,
}

#[event]
pub struct WinnerSet {
    pub vault: Pubkey,
    pub winner: Pubkey,
}

#[event]
pub struct Claimed {
    pub vault: Pubkey,
    pub winner: Pubkey,
    pub prize: u64,
    pub pool: u64,
}

// -----------------
// Errors
// -----------------

#[error_code]
pub enum VaultError {
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Bad end timestamp")]
    BadEndTs,
    #[msg("Bad PIN length")]
    BadPinLen,
    #[msg("Unsupported fee mint")]
    UnsupportedFeeMint,
    #[msg("Wrong fee mint")]
    WrongFeeMint,
    #[msg("Wrong fee owner")]
    WrongFeeOwner,
    #[msg("Vault not active")]
    VaultNotActive,
    #[msg("Vault expired")]
    VaultExpired,
    #[msg("Vault not expired")]
    VaultNotExpired,
    #[msg("Vault not settled")]
    VaultNotSettled,
    #[msg("Already paid out")]
    AlreadyPaidOut,
    #[msg("Already has winner")]
    AlreadyHasWinner,
    #[msg("Not winner")]
    NotWinner,
    #[msg("Math overflow")]
    MathOverflow,
}

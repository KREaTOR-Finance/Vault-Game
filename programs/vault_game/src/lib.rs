use anchor_lang::prelude::*;

declare_id!("B1uj973FayJZYCHVJx3td57zMMBzg4n6UENB3bS24F3t");

#[program]
pub mod vault_game {
    use super::*;

    pub fn initialize_global(ctx: Context<InitializeGlobal>) -> Result<()> {
        let gs = &mut ctx.accounts.global_state;
        gs.authority = ctx.accounts.authority.key();
        gs.vault_count = 0;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [b"global"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub authority: Pubkey,
    pub vault_count: u64,
}

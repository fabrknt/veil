use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::error::DarkPoolError;
use crate::state::{PerpOrderCommitment, OrderStatus};
use crate::instructions::submit_perp_order::{COMMITMENT_SEED, COLLATERAL_VAULT_SEED};

/// Permissionless instruction: anyone can expire an order after TTL.
/// Collateral is returned to the trader.
pub fn handler(ctx: Context<ExpireOrder>) -> Result<()> {
    let clock = Clock::get()?;
    let commitment = &ctx.accounts.commitment;

    require!(
        commitment.is_expired(clock.unix_timestamp),
        DarkPoolError::OrderNotExpired
    );

    let commitment_seeds = &[
        COMMITMENT_SEED,
        &commitment.commitment_id.to_le_bytes(),
        &[commitment.bump],
    ];
    let signer_seeds = &[&commitment_seeds[..]];

    // Return collateral
    let vault_balance = ctx.accounts.collateral_vault.amount;
    if vault_balance > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.collateral_vault.to_account_info(),
                    to: ctx.accounts.trader_usdc.to_account_info(),
                    authority: ctx.accounts.commitment.to_account_info(),
                },
                signer_seeds,
            ),
            vault_balance,
        )?;
    }

    // Close vault
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.collateral_vault.to_account_info(),
            destination: ctx.accounts.trader.to_account_info(),
            authority: ctx.accounts.commitment.to_account_info(),
        },
        signer_seeds,
    ))?;

    let commitment = &mut ctx.accounts.commitment;
    commitment.status = OrderStatus::Expired;

    msg!("Order {} expired", commitment.commitment_id);
    Ok(())
}

#[derive(Accounts)]
pub struct ExpireOrder<'info> {
    /// Anyone can crank expiration
    pub cranker: Signer<'info>,

    #[account(
        mut,
        seeds = [COMMITMENT_SEED, &commitment.commitment_id.to_le_bytes()],
        bump = commitment.bump,
        constraint = commitment.is_pending() @ DarkPoolError::OrderNotPending,
    )]
    pub commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, commitment.key().as_ref()],
        bump,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    /// CHECK: Trader's USDC account — verified by commitment.trader
    #[account(
        mut,
        constraint = trader_usdc.owner == commitment.trader @ DarkPoolError::UnauthorizedOwner,
    )]
    pub trader_usdc: Account<'info, TokenAccount>,

    /// CHECK: Trader receives vault rent
    #[account(mut, constraint = trader.key() == commitment.trader)]
    pub trader: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
}

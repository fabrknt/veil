use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::error::DarkPoolError;
use crate::state::{PerpOrderCommitment, OrderStatus};
use crate::instructions::submit_perp_order::{COMMITMENT_SEED, COLLATERAL_VAULT_SEED};

pub fn handler(ctx: Context<CancelOrder>) -> Result<()> {
    let commitment = &ctx.accounts.commitment;
    let commitment_seeds = &[
        COMMITMENT_SEED,
        &commitment.commitment_id.to_le_bytes(),
        &[commitment.bump],
    ];
    let signer_seeds = &[&commitment_seeds[..]];

    // Return collateral
    let vault_balance = ctx.accounts.collateral_vault.amount;
    if vault_balance > 0 {
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.collateral_vault.to_account_info(),
                to: ctx.accounts.trader_usdc.to_account_info(),
                authority: ctx.accounts.commitment.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, vault_balance)?;
    }

    // Close vault account
    let close_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.collateral_vault.to_account_info(),
            destination: ctx.accounts.trader.to_account_info(),
            authority: ctx.accounts.commitment.to_account_info(),
        },
        signer_seeds,
    );
    token::close_account(close_ctx)?;

    let commitment = &mut ctx.accounts.commitment;
    commitment.status = OrderStatus::Cancelled;

    msg!("Order {} cancelled", commitment.commitment_id);
    Ok(())
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(
        mut,
        seeds = [COMMITMENT_SEED, &commitment.commitment_id.to_le_bytes()],
        bump = commitment.bump,
        constraint = commitment.trader == trader.key() @ DarkPoolError::UnauthorizedOwner,
        constraint = commitment.is_cancellable() @ DarkPoolError::OrderNotCancellable,
    )]
    pub commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, commitment.key().as_ref()],
        bump,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = trader_usdc.owner == trader.key() @ DarkPoolError::UnauthorizedOwner,
    )]
    pub trader_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

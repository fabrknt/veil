use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::error::DarkPoolError;
use crate::state::*;
use crate::instructions::initialize::CONFIG_SEED;
use crate::instructions::submit_perp_order::{COMMITMENT_SEED, COLLATERAL_VAULT_SEED};
use crate::instructions::reveal_match::TRADE_SEED;

pub fn handler(
    ctx: Context<SettleTrade>,
    venue_tx_sig: Vec<u8>,
) -> Result<()> {
    let clock = Clock::get()?;

    // Record venue settlement proof
    let trade = &mut ctx.accounts.trade_record;
    trade.venue_tx_sig = venue_tx_sig;
    trade.settled_at = clock.unix_timestamp;

    // Mark both commitments as settled
    ctx.accounts.bid_commitment.status = OrderStatus::Settled;
    ctx.accounts.ask_commitment.status = OrderStatus::Settled;

    // Calculate per-side fee
    let fee_per_side = trade.fee_amount / 2;

    // Return collateral to both traders
    // Bid side
    let bid_seeds = &[
        COMMITMENT_SEED,
        &ctx.accounts.bid_commitment.commitment_id.to_le_bytes(),
        &[ctx.accounts.bid_commitment.bump],
    ];
    let bid_signer = &[&bid_seeds[..]];

    let bid_vault_balance = ctx.accounts.bid_collateral_vault.amount;
    if bid_vault_balance > 0 {
        let bid_return = bid_vault_balance.saturating_sub(fee_per_side);

        if bid_return > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.bid_collateral_vault.to_account_info(),
                        to: ctx.accounts.bid_trader_usdc.to_account_info(),
                        authority: ctx.accounts.bid_commitment.to_account_info(),
                    },
                    bid_signer,
                ),
                bid_return,
            )?;
        }

        // Transfer fee portion to fee recipient
        if fee_per_side > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.bid_collateral_vault.to_account_info(),
                        to: ctx.accounts.fee_recipient_usdc.to_account_info(),
                        authority: ctx.accounts.bid_commitment.to_account_info(),
                    },
                    bid_signer,
                ),
                fee_per_side,
            )?;
        }
    }

    // Close bid vault
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.bid_collateral_vault.to_account_info(),
            destination: ctx.accounts.solver.to_account_info(),
            authority: ctx.accounts.bid_commitment.to_account_info(),
        },
        bid_signer,
    ))?;

    // Ask side
    let ask_seeds = &[
        COMMITMENT_SEED,
        &ctx.accounts.ask_commitment.commitment_id.to_le_bytes(),
        &[ctx.accounts.ask_commitment.bump],
    ];
    let ask_signer = &[&ask_seeds[..]];

    let ask_vault_balance = ctx.accounts.ask_collateral_vault.amount;
    if ask_vault_balance > 0 {
        let ask_return = ask_vault_balance.saturating_sub(fee_per_side);

        if ask_return > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.ask_collateral_vault.to_account_info(),
                        to: ctx.accounts.ask_trader_usdc.to_account_info(),
                        authority: ctx.accounts.ask_commitment.to_account_info(),
                    },
                    ask_signer,
                ),
                ask_return,
            )?;
        }

        if fee_per_side > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.ask_collateral_vault.to_account_info(),
                        to: ctx.accounts.fee_recipient_usdc.to_account_info(),
                        authority: ctx.accounts.ask_commitment.to_account_info(),
                    },
                    ask_signer,
                ),
                fee_per_side,
            )?;
        }
    }

    // Close ask vault
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.ask_collateral_vault.to_account_info(),
            destination: ctx.accounts.solver.to_account_info(),
            authority: ctx.accounts.ask_commitment.to_account_info(),
        },
        ask_signer,
    ))?;

    msg!("Trade {} settled", trade.trade_id);
    Ok(())
}

#[derive(Accounts)]
pub struct SettleTrade<'info> {
    #[account(mut)]
    pub solver: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.solver == solver.key() @ DarkPoolError::UnauthorizedSolver,
    )]
    pub config: Account<'info, DarkPoolConfig>,

    #[account(
        mut,
        seeds = [TRADE_SEED, &trade_record.trade_id.to_le_bytes()],
        bump = trade_record.bump,
        constraint = trade_record.settled_at == 0 @ DarkPoolError::AlreadySettled,
    )]
    pub trade_record: Account<'info, DarkTradeRecord>,

    #[account(
        mut,
        seeds = [COMMITMENT_SEED, &bid_commitment.commitment_id.to_le_bytes()],
        bump = bid_commitment.bump,
    )]
    pub bid_commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        mut,
        seeds = [COMMITMENT_SEED, &ask_commitment.commitment_id.to_le_bytes()],
        bump = ask_commitment.bump,
    )]
    pub ask_commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, bid_commitment.key().as_ref()],
        bump,
    )]
    pub bid_collateral_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, ask_commitment.key().as_ref()],
        bump,
    )]
    pub ask_collateral_vault: Account<'info, TokenAccount>,

    /// CHECK: Bid trader's USDC account for collateral return
    #[account(mut)]
    pub bid_trader_usdc: Account<'info, TokenAccount>,

    /// CHECK: Ask trader's USDC account for collateral return
    #[account(mut)]
    pub ask_trader_usdc: Account<'info, TokenAccount>,

    /// Fee recipient USDC account
    #[account(
        mut,
        constraint = fee_recipient_usdc.owner == config.fee_recipient,
    )]
    pub fee_recipient_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

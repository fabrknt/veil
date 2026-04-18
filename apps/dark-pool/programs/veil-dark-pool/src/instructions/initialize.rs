use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::error::DarkPoolError;
use crate::state::DarkPoolConfig;

pub const CONFIG_SEED: &[u8] = b"dark_pool_config";
pub const MAX_FEE_BPS: u16 = 500;

pub fn handler(
    ctx: Context<Initialize>,
    solver: Pubkey,
    fee_bps: u16,
    min_order_usdc: u64,
    max_order_usdc: u64,
) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, DarkPoolError::InvalidFeeBps);

    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.solver = solver;
    config.fee_recipient = ctx.accounts.admin.key();
    config.fee_bps = fee_bps;
    config.usdc_mint = ctx.accounts.usdc_mint.key();
    config.commitment_count = 0;
    config.trade_count = 0;
    config.min_order_usdc = min_order_usdc;
    config.max_order_usdc = max_order_usdc;
    config.is_active = true;
    config.bump = ctx.bumps.config;

    msg!("Dark pool initialized. Solver: {}", solver);
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + DarkPoolConfig::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, DarkPoolConfig>,

    pub usdc_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

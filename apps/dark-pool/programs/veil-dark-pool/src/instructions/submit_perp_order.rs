use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::error::DarkPoolError;
use crate::state::{DarkPoolConfig, PerpOrderCommitment, OrderStatus};
use crate::instructions::initialize::CONFIG_SEED;

pub const COMMITMENT_SEED: &[u8] = b"commitment";
pub const COLLATERAL_VAULT_SEED: &[u8] = b"collateral_vault";
pub const MAX_TTL_SECONDS: i64 = 3600;
pub const MAX_MARKET_ID: u8 = 2; // SOL=0, BTC=1, ETH=2
pub const MIN_PAYLOAD_SIZE: usize = 24;
pub const MAX_PAYLOAD_SIZE: usize = 128;

pub fn handler(
    ctx: Context<SubmitPerpOrder>,
    collateral_amount: u64,
    market_id: u8,
    ttl_seconds: u32,
    commitment_hash: [u8; 32],
    user_encryption_pubkey: [u8; 32],
    encrypted_payload: Vec<u8>,
) -> Result<()> {
    let config = &ctx.accounts.config;
    require!(config.is_active, DarkPoolError::PoolNotActive);
    require!(collateral_amount > 0, DarkPoolError::InvalidCollateral);
    require!(collateral_amount >= config.min_order_usdc, DarkPoolError::BelowMinOrder);
    require!(collateral_amount <= config.max_order_usdc, DarkPoolError::AboveMaxOrder);
    require!(market_id <= MAX_MARKET_ID, DarkPoolError::InvalidMarketId);
    require!((ttl_seconds as i64) <= MAX_TTL_SECONDS, DarkPoolError::TtlTooLong);
    require!(
        encrypted_payload.len() >= MIN_PAYLOAD_SIZE && encrypted_payload.len() <= MAX_PAYLOAD_SIZE,
        DarkPoolError::InvalidPayloadLength
    );

    let clock = Clock::get()?;

    // Transfer USDC collateral to vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.trader_usdc.to_account_info(),
            to: ctx.accounts.collateral_vault.to_account_info(),
            authority: ctx.accounts.trader.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, collateral_amount)?;

    // Initialize commitment
    let commitment = &mut ctx.accounts.commitment;
    commitment.trader = ctx.accounts.trader.key();
    commitment.commitment_id = config.commitment_count;
    commitment.commitment_hash = commitment_hash;
    commitment.collateral_amount = collateral_amount;
    commitment.market_id = market_id;
    commitment.status = OrderStatus::Pending;
    commitment.created_at = clock.unix_timestamp;
    commitment.expires_at = clock.unix_timestamp + ttl_seconds as i64;
    commitment.user_encryption_pubkey = user_encryption_pubkey;
    commitment.encrypted_payload = encrypted_payload;
    commitment.bump = ctx.bumps.commitment;

    // Increment counter
    let config = &mut ctx.accounts.config;
    config.commitment_count = config.commitment_count.checked_add(1)
        .ok_or(DarkPoolError::ArithmeticOverflow)?;

    msg!("Perp order committed: id={}, market={}", commitment.commitment_id, market_id);
    Ok(())
}

#[derive(Accounts)]
pub struct SubmitPerpOrder<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.is_active @ DarkPoolError::PoolNotActive,
    )]
    pub config: Account<'info, DarkPoolConfig>,

    #[account(
        init,
        payer = trader,
        space = 8 + PerpOrderCommitment::INIT_SPACE,
        seeds = [COMMITMENT_SEED, &config.commitment_count.to_le_bytes()],
        bump,
    )]
    pub commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        init,
        payer = trader,
        seeds = [COLLATERAL_VAULT_SEED, commitment.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = commitment,
    )]
    pub collateral_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = trader_usdc.mint == config.usdc_mint @ DarkPoolError::InvalidCollateral,
        constraint = trader_usdc.owner == trader.key() @ DarkPoolError::UnauthorizedOwner,
    )]
    pub trader_usdc: Account<'info, TokenAccount>,

    #[account(constraint = usdc_mint.key() == config.usdc_mint)]
    pub usdc_mint: Account<'info, anchor_spl::token::Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

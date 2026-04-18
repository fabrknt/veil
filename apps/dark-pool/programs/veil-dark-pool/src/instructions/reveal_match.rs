use anchor_lang::prelude::*;

use crate::error::DarkPoolError;
use crate::state::*;
use crate::instructions::initialize::CONFIG_SEED;
use crate::instructions::submit_perp_order::COMMITMENT_SEED;

pub const TRADE_SEED: &[u8] = b"dark_trade";

/// Perp order payload layout (must match PERP_ORDER_SCHEMA in @fabrknt/veil-core):
/// side(u8) + orderType(u8) + price(u64) + quantity(u64) + maxSlippageBps(u16) + marketId(u8) + padding(5) = 26 bytes
const PERP_PAYLOAD_SIZE: usize = 26;

pub fn handler(
    ctx: Context<RevealMatch>,
    // Decrypted params from bid commitment
    bid_side: u8,
    bid_order_type: u8,
    bid_price: u64,
    bid_quantity: u64,
    bid_slippage_bps: u16,
    bid_market_id: u8,
    // Decrypted params from ask commitment
    ask_side: u8,
    ask_order_type: u8,
    ask_price: u64,
    ask_quantity: u64,
    ask_slippage_bps: u16,
    ask_market_id: u8,
    // Match params
    exec_price: u64,
    fill_quantity: u64,
    venue: u8,
) -> Result<()> {
    // Verify bid commitment hash
    let bid_hash = compute_perp_payload_hash(
        bid_side, bid_order_type, bid_price, bid_quantity, bid_slippage_bps, bid_market_id,
    );
    require!(
        bid_hash == ctx.accounts.bid_commitment.commitment_hash,
        DarkPoolError::PayloadHashMismatch
    );

    // Verify ask commitment hash
    let ask_hash = compute_perp_payload_hash(
        ask_side, ask_order_type, ask_price, ask_quantity, ask_slippage_bps, ask_market_id,
    );
    require!(
        ask_hash == ctx.accounts.ask_commitment.commitment_hash,
        DarkPoolError::PayloadHashMismatch
    );

    // Verify sides: bid=0 (long), ask=1 (short)
    require!(bid_side == 0, DarkPoolError::PayloadHashMismatch);
    require!(ask_side == 1, DarkPoolError::PayloadHashMismatch);

    // Verify markets match
    require!(
        ctx.accounts.bid_commitment.market_id == ctx.accounts.ask_commitment.market_id,
        DarkPoolError::MarketMismatch
    );

    // Verify price crossing: bid >= ask (for limit orders)
    // Market orders (orderType=1) always cross
    if bid_order_type == 0 && ask_order_type == 0 {
        require!(bid_price >= ask_price, DarkPoolError::PayloadHashMismatch);
    }

    // Calculate fee
    let config = &ctx.accounts.config;
    let notional = (exec_price as u128)
        .checked_mul(fill_quantity as u128)
        .ok_or(DarkPoolError::ArithmeticOverflow)?
        / 1_000_000; // 6 decimal price * 6 decimal qty → normalize
    let fee = (notional * config.fee_bps as u128 / 10_000) as u64;

    // Create trade record
    let trade = &mut ctx.accounts.trade_record;
    trade.trade_id = config.trade_count;
    trade.bid_commitment = ctx.accounts.bid_commitment.key();
    trade.ask_commitment = ctx.accounts.ask_commitment.key();
    trade.buyer = ctx.accounts.bid_commitment.trader;
    trade.seller = ctx.accounts.ask_commitment.trader;
    trade.market_id = ctx.accounts.bid_commitment.market_id;
    trade.exec_price = exec_price;
    trade.quantity = fill_quantity;
    trade.venue = venue;
    trade.venue_tx_sig = Vec::new();
    trade.fee_amount = fee;
    trade.settled_at = 0;
    trade.bump = ctx.bumps.trade_record;

    // Mark commitments as matched
    ctx.accounts.bid_commitment.status = OrderStatus::Matched;
    ctx.accounts.ask_commitment.status = OrderStatus::Matched;

    // Increment trade counter
    let config = &mut ctx.accounts.config;
    config.trade_count = config.trade_count.checked_add(1)
        .ok_or(DarkPoolError::ArithmeticOverflow)?;

    msg!("Match revealed: trade_id={}, price={}, qty={}", trade.trade_id, exec_price, fill_quantity);
    Ok(())
}

/// Recompute SHA-256 hash of perp order params for commitment verification.
/// Layout matches PERP_ORDER_SCHEMA: side(1) + orderType(1) + price(8) + qty(8) + slippage(2) + marketId(1) + padding(5) = 26
fn compute_perp_payload_hash(
    side: u8,
    order_type: u8,
    price: u64,
    quantity: u64,
    slippage_bps: u16,
    market_id: u8,
) -> [u8; 32] {
    let mut payload = [0u8; PERP_PAYLOAD_SIZE];
    payload[0] = side;
    payload[1] = order_type;
    payload[2..10].copy_from_slice(&price.to_le_bytes());
    payload[10..18].copy_from_slice(&quantity.to_le_bytes());
    payload[18..20].copy_from_slice(&slippage_bps.to_le_bytes());
    payload[20] = market_id;
    // bytes 21..28 remain zero (padding)

    let hash_result = anchor_lang::solana_program::hash::hash(&payload);
    hash_result.to_bytes()
}

#[derive(Accounts)]
pub struct RevealMatch<'info> {
    #[account(mut)]
    pub solver: Signer<'info>,

    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        constraint = config.is_active @ DarkPoolError::PoolNotActive,
        constraint = config.solver == solver.key() @ DarkPoolError::UnauthorizedSolver,
    )]
    pub config: Account<'info, DarkPoolConfig>,

    #[account(
        mut,
        seeds = [COMMITMENT_SEED, &bid_commitment.commitment_id.to_le_bytes()],
        bump = bid_commitment.bump,
        constraint = bid_commitment.is_pending() @ DarkPoolError::OrderNotPending,
    )]
    pub bid_commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        mut,
        seeds = [COMMITMENT_SEED, &ask_commitment.commitment_id.to_le_bytes()],
        bump = ask_commitment.bump,
        constraint = ask_commitment.is_pending() @ DarkPoolError::OrderNotPending,
    )]
    pub ask_commitment: Account<'info, PerpOrderCommitment>,

    #[account(
        init,
        payer = solver,
        space = 8 + DarkTradeRecord::INIT_SPACE,
        seeds = [TRADE_SEED, &config.trade_count.to_le_bytes()],
        bump,
    )]
    pub trade_record: Account<'info, DarkTradeRecord>,

    pub system_program: Program<'info, System>,
}

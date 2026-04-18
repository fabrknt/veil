use anchor_lang::prelude::*;

pub mod error;
pub mod state;
pub mod instructions;

use instructions::*;

declare_id!("VDPoo1DarkPoo1DarkPoo1DarkPoo1DarkPoo111111");

#[program]
pub mod veil_dark_pool {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        solver: Pubkey,
        fee_bps: u16,
        min_order_usdc: u64,
        max_order_usdc: u64,
    ) -> Result<()> {
        initialize::handler(ctx, solver, fee_bps, min_order_usdc, max_order_usdc)
    }

    pub fn submit_perp_order(
        ctx: Context<SubmitPerpOrder>,
        collateral_amount: u64,
        market_id: u8,
        ttl_seconds: u32,
        commitment_hash: [u8; 32],
        user_encryption_pubkey: [u8; 32],
        encrypted_payload: Vec<u8>,
    ) -> Result<()> {
        submit_perp_order::handler(
            ctx, collateral_amount, market_id, ttl_seconds,
            commitment_hash, user_encryption_pubkey, encrypted_payload,
        )
    }

    pub fn cancel_order(ctx: Context<CancelOrder>) -> Result<()> {
        cancel_order::handler(ctx)
    }

    pub fn reveal_match(
        ctx: Context<RevealMatch>,
        bid_side: u8,
        bid_order_type: u8,
        bid_price: u64,
        bid_quantity: u64,
        bid_slippage_bps: u16,
        bid_market_id: u8,
        ask_side: u8,
        ask_order_type: u8,
        ask_price: u64,
        ask_quantity: u64,
        ask_slippage_bps: u16,
        ask_market_id: u8,
        exec_price: u64,
        fill_quantity: u64,
        venue: u8,
    ) -> Result<()> {
        reveal_match::handler(
            ctx,
            bid_side, bid_order_type, bid_price, bid_quantity, bid_slippage_bps, bid_market_id,
            ask_side, ask_order_type, ask_price, ask_quantity, ask_slippage_bps, ask_market_id,
            exec_price, fill_quantity, venue,
        )
    }

    pub fn settle_trade(
        ctx: Context<SettleTrade>,
        venue_tx_sig: Vec<u8>,
    ) -> Result<()> {
        settle_trade::handler(ctx, venue_tx_sig)
    }

    pub fn expire_order(ctx: Context<ExpireOrder>) -> Result<()> {
        expire_order::handler(ctx)
    }
}

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct DarkTradeRecord {
    /// Global trade ID
    pub trade_id: u64,
    /// Buyer's commitment PDA
    pub bid_commitment: Pubkey,
    /// Seller's commitment PDA
    pub ask_commitment: Pubkey,
    /// Buyer wallet
    pub buyer: Pubkey,
    /// Seller wallet
    pub seller: Pubkey,
    /// Market identifier
    pub market_id: u8,
    /// Execution price (6 decimals)
    pub exec_price: u64,
    /// Fill quantity (6 decimals)
    pub quantity: u64,
    /// Settlement venue: 0=drift, 1=jupiter
    pub venue: u8,
    /// Transaction signature from venue settlement
    #[max_len(88)]
    pub venue_tx_sig: Vec<u8>,
    /// Protocol fee charged (USDC, 6 decimals)
    pub fee_amount: u64,
    /// Settlement timestamp
    pub settled_at: i64,
    /// Bump seed
    pub bump: u8,
}

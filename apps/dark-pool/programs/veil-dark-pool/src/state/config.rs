use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct DarkPoolConfig {
    /// Admin authority
    pub admin: Pubkey,
    /// Authorized solver/relayer pubkey
    pub solver: Pubkey,
    /// Fee recipient
    pub fee_recipient: Pubkey,
    /// Protocol fee in basis points
    pub fee_bps: u16,
    /// USDC mint address
    pub usdc_mint: Pubkey,
    /// Global commitment counter
    pub commitment_count: u64,
    /// Global trade counter
    pub trade_count: u64,
    /// Minimum order size in USDC (6 decimals)
    pub min_order_usdc: u64,
    /// Maximum order size in USDC (6 decimals)
    pub max_order_usdc: u64,
    /// Whether the pool is active
    pub is_active: bool,
    /// Bump seed
    pub bump: u8,
}

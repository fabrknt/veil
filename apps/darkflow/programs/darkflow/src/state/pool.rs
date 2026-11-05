use anchor_lang::prelude::*;

/// Dark liquidity pool with encrypted positions
///
/// Individual LP positions are encrypted and stored separately.
/// Only aggregate statistics are public.
#[account]
#[derive(InitSpace)]
pub struct DarkPool {
    /// Pool authority
    pub authority: Pubkey,

    /// Token A mint
    pub token_a_mint: Pubkey,

    /// Token B mint
    pub token_b_mint: Pubkey,

    /// Pool's encryption public key (X25519)
    /// LPs encrypt their deposit amounts using this key
    pub encryption_pubkey: [u8; 32],

    /// Fee rate in basis points (e.g., 30 = 0.3%)
    pub fee_rate_bps: u16,

    /// Total positions (public aggregate)
    pub position_count: u64,

    /// Total orders processed
    pub order_count: u64,

    /// Total volume in token A (public aggregate)
    pub total_volume_a: u64,

    /// Total volume in token B (public aggregate)
    pub total_volume_b: u64,

    /// Pool state commitment (Merkle root of all positions)
    pub state_commitment: [u8; 32],

    /// Timestamp of last state update
    pub last_update: i64,

    /// Whether the pool is active
    pub is_active: bool,

    /// Bump seed for PDA
    pub bump: u8,

    /// Trusted solver/attestor. Order execution and dark swaps must be signed
    /// by this key (see `zk_verify`: the on-chain proof check is a hash, so
    /// this signature is the actual gate until a real verifier is added).
    /// Set at init by the pool authority; changeable via update_pool_config.
    pub solver: Pubkey,
}

/// Public pool aggregates (queryable without revealing individual positions)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct PoolAggregates {
    /// Total value locked (in token A equivalent)
    pub tvl_token_a: u64,

    /// Total value locked (in token B equivalent)
    pub tvl_token_b: u64,

    /// Number of liquidity providers
    pub lp_count: u64,

    /// 24-hour volume
    pub volume_24h: u64,

    /// Current utilization rate (basis points)
    pub utilization_bps: u16,

    /// Average position size (encrypted, for display only)
    pub avg_position_commitment: [u8; 32],
}

impl DarkPool {
    /// Update the state commitment after position changes
    pub fn update_state_commitment(&mut self, new_commitment: [u8; 32]) -> Result<()> {
        self.state_commitment = new_commitment;
        self.last_update = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Increment position count
    pub fn increment_position_count(&mut self) {
        self.position_count = self.position_count.saturating_add(1);
    }

    /// Decrement position count
    pub fn decrement_position_count(&mut self) {
        self.position_count = self.position_count.saturating_sub(1);
    }

    /// Increment order count
    pub fn increment_order_count(&mut self) {
        self.order_count = self.order_count.saturating_add(1);
    }

    /// Add to volume
    pub fn add_volume(&mut self, amount_a: u64, amount_b: u64) {
        self.total_volume_a = self.total_volume_a.saturating_add(amount_a);
        self.total_volume_b = self.total_volume_b.saturating_add(amount_b);
    }
}

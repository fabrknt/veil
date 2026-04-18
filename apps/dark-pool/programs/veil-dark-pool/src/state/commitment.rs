use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderStatus {
    /// Submitted, awaiting match
    Pending,
    /// Matched in dark pool
    Matched,
    /// Settlement confirmed on venue
    Settled,
    /// Sent to public book (fallback)
    Routed,
    /// Cancelled by trader
    Cancelled,
    /// TTL elapsed, collateral returned
    Expired,
}

#[account]
#[derive(InitSpace)]
pub struct PerpOrderCommitment {
    /// Trader who submitted the order
    pub trader: Pubkey,
    /// Global commitment ID
    pub commitment_id: u64,
    /// SHA-256 hash of encrypted perp order payload
    pub commitment_hash: [u8; 32],
    /// USDC collateral deposited
    pub collateral_amount: u64,
    /// Market identifier: 0=SOL, 1=BTC, 2=ETH (public for book separation)
    pub market_id: u8,
    /// Order status
    pub status: OrderStatus,
    /// Creation timestamp
    pub created_at: i64,
    /// Expiration timestamp (auto-cancel after TTL)
    pub expires_at: i64,
    /// User's X25519 encryption public key (solver needs for decryption)
    pub user_encryption_pubkey: [u8; 32],
    /// Encrypted payload bytes (nonce + ciphertext)
    #[max_len(128)]
    pub encrypted_payload: Vec<u8>,
    /// Bump seed
    pub bump: u8,
}

impl PerpOrderCommitment {
    pub fn is_cancellable(&self) -> bool {
        self.status == OrderStatus::Pending
    }

    pub fn is_pending(&self) -> bool {
        self.status == OrderStatus::Pending
    }

    pub fn is_expired(&self, now: i64) -> bool {
        now >= self.expires_at && self.status == OrderStatus::Pending
    }
}

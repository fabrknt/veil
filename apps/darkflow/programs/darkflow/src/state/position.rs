use anchor_lang::prelude::*;

/// Encrypted LP position
///
/// The actual amounts are encrypted. Only the position owner
/// can decrypt and prove ownership via ZK proofs.
#[account]
#[derive(InitSpace)]
pub struct EncryptedPosition {
    /// Position owner
    pub owner: Pubkey,

    /// Pool this position belongs to
    pub pool: Pubkey,

    /// Encrypted amount data (NaCl box encrypted)
    /// Contains: amount_a, amount_b, share_percentage
    #[max_len(256)]
    pub encrypted_data: Vec<u8>,

    /// Commitment to the position (Pedersen commitment)
    /// Used for ZK verification without revealing amounts
    pub commitment: [u8; 32],

    /// Nullifier for this position (prevents double-withdraw)
    pub nullifier: [u8; 32],

    /// Position entry timestamp
    pub created_at: i64,

    /// Last update timestamp
    pub updated_at: i64,

    /// Whether position is active
    pub is_active: bool,

    /// Bump seed for PDA
    pub bump: u8,

    /// Liquidity units held by this position (pro-rata claim on the vaults)
    pub liquidity: u64,
}

impl EncryptedPosition {
    /// Create a new encrypted position
    pub fn new(
        owner: Pubkey,
        pool: Pubkey,
        encrypted_data: Vec<u8>,
        commitment: [u8; 32],
        nullifier: [u8; 32],
        bump: u8,
        liquidity: u64,
    ) -> Result<Self> {
        let now = Clock::get()?.unix_timestamp;
        Ok(Self {
            owner,
            pool,
            encrypted_data,
            commitment,
            nullifier,
            created_at: now,
            updated_at: now,
            is_active: true,
            bump,
            liquidity,
        })
    }

    /// Mark position as withdrawn
    pub fn deactivate(&mut self) -> Result<()> {
        self.is_active = false;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Update encrypted data (for partial withdrawals)
    pub fn update_encrypted_data(&mut self, new_data: Vec<u8>, new_commitment: [u8; 32]) -> Result<()> {
        self.encrypted_data = new_data;
        self.commitment = new_commitment;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

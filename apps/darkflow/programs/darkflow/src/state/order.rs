use anchor_lang::prelude::*;

/// Dark order status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderStatus {
    /// Order is pending execution
    Pending,
    /// Order has been filled
    Filled,
    /// Order was cancelled by maker
    Cancelled,
    /// Order expired
    Expired,
}

/// Dark order for private swap execution
///
/// Order parameters (amount, min output) are encrypted.
/// Only the authorized solver can decrypt and execute.
#[account]
#[derive(InitSpace)]
pub struct DarkOrder {
    /// Order maker
    pub maker: Pubkey,

    /// Pool for this order
    pub pool: Pubkey,

    /// Input token mint
    pub input_mint: Pubkey,

    /// Output token mint
    pub output_mint: Pubkey,

    /// Encrypted order parameters
    /// Contains: input_amount, min_output_amount, slippage_bps
    #[max_len(256)]
    pub encrypted_params: Vec<u8>,

    /// Commitment to order parameters (for verification)
    pub commitment: [u8; 32],

    /// Input amount (public, for escrow)
    pub input_amount: u64,

    /// Minimum output the maker accepts, set by the maker at submit time.
    /// Public (an on-chain check needs the plain value); the solver cannot
    /// change it.
    pub min_output: u64,

    /// Order deadline (Unix timestamp)
    pub deadline: i64,

    /// Order status
    pub status: OrderStatus,

    /// Solver who executed (if filled)
    pub executed_by: Option<Pubkey>,

    /// Execution timestamp
    pub executed_at: Option<i64>,

    /// Output amount received (encrypted)
    #[max_len(64)]
    pub encrypted_output: Vec<u8>,

    /// Order creation timestamp
    pub created_at: i64,

    /// Bump seed for PDA
    pub bump: u8,
}

impl DarkOrder {
    /// Create a new dark order
    pub fn new(
        maker: Pubkey,
        pool: Pubkey,
        input_mint: Pubkey,
        output_mint: Pubkey,
        encrypted_params: Vec<u8>,
        commitment: [u8; 32],
        input_amount: u64,
        min_output: u64,
        deadline: i64,
        bump: u8,
    ) -> Result<Self> {
        Ok(Self {
            maker,
            pool,
            input_mint,
            output_mint,
            encrypted_params,
            commitment,
            input_amount,
            min_output,
            deadline,
            status: OrderStatus::Pending,
            executed_by: None,
            executed_at: None,
            encrypted_output: Vec::new(),
            created_at: Clock::get()?.unix_timestamp,
            bump,
        })
    }

    /// Check if order is expired
    pub fn is_expired(&self) -> Result<bool> {
        let now = Clock::get()?.unix_timestamp;
        Ok(now > self.deadline)
    }

    /// Check if order can be executed
    pub fn can_execute(&self) -> Result<bool> {
        Ok(self.status == OrderStatus::Pending && !self.is_expired()?)
    }

    /// Mark order as filled
    pub fn fill(&mut self, solver: Pubkey, encrypted_output: Vec<u8>) -> Result<()> {
        self.status = OrderStatus::Filled;
        self.executed_by = Some(solver);
        self.executed_at = Some(Clock::get()?.unix_timestamp);
        self.encrypted_output = encrypted_output;
        Ok(())
    }

    /// Mark order as cancelled
    pub fn cancel(&mut self) {
        self.status = OrderStatus::Cancelled;
    }

    /// Mark order as expired
    pub fn expire(&mut self) {
        self.status = OrderStatus::Expired;
    }
}

/// Nullifier account to prevent replay attacks
#[account]
#[derive(InitSpace)]
pub struct NullifierAccount {
    /// The nullifier value
    pub nullifier: [u8; 32],

    /// When it was used
    pub used_at: i64,
}

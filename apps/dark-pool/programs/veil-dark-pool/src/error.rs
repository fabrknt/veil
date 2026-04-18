use anchor_lang::prelude::*;

#[error_code]
pub enum DarkPoolError {
    #[msg("Pool is not active")]
    PoolNotActive,

    #[msg("Unauthorized: only admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Unauthorized: only the solver can perform this action")]
    UnauthorizedSolver,

    #[msg("Unauthorized: only the order owner can perform this action")]
    UnauthorizedOwner,

    #[msg("Order is not in a cancellable state")]
    OrderNotCancellable,

    #[msg("Order is not pending")]
    OrderNotPending,

    #[msg("Order has not expired yet")]
    OrderNotExpired,

    #[msg("Invalid encrypted payload length")]
    InvalidPayloadLength,

    #[msg("Invalid collateral amount")]
    InvalidCollateral,

    #[msg("Collateral below minimum order size")]
    BelowMinOrder,

    #[msg("Collateral exceeds maximum order size")]
    AboveMaxOrder,

    #[msg("Invalid market ID")]
    InvalidMarketId,

    #[msg("TTL too long (max 3600 seconds)")]
    TtlTooLong,

    #[msg("Payload hash mismatch: decrypted params don't match commitment")]
    PayloadHashMismatch,

    #[msg("Trade already settled")]
    AlreadySettled,

    #[msg("Invalid fee basis points")]
    InvalidFeeBps,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Commitments must be for the same market")]
    MarketMismatch,
}

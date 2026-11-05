use anchor_lang::prelude::*;

/// Program-wide config. Holds the admin allowed to create pools.
/// Created once by the program upgrade authority (initialize_config).
#[account]
#[derive(InitSpace)]
pub struct DarkFlowConfig {
    /// Only this key may create pools
    pub admin: Pubkey,

    /// Bump seed for PDA
    pub bump: u8,
}

impl DarkFlowConfig {
    pub const SEED: &'static [u8] = b"config";
}

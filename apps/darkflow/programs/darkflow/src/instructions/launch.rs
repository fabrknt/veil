use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::{LaunchConfidentialToken, BuyFromLaunch, LaunchStatus};
use crate::errors::DarkFlowError;

/// Launch a token with confidential bonding curve
pub fn launch_confidential_token(
    ctx: Context<LaunchConfidentialToken>,
    token_mint: Pubkey,
    encrypted_curve_params: Vec<u8>,
    initial_price: u64,
    max_supply: u64,
) -> Result<()> {
    // Validate parameters
    require!(initial_price > 0, DarkFlowError::InvalidAmount);
    require!(max_supply > 0, DarkFlowError::InvalidAmount);
    require!(
        encrypted_curve_params.len() > 0 && encrypted_curve_params.len() <= 256,
        DarkFlowError::InvalidEncryptedData
    );

    let launch = &mut ctx.accounts.launch;
    let now = Clock::get()?.unix_timestamp;

    launch.creator = ctx.accounts.creator.key();
    launch.token_mint = token_mint;
    launch.payment_mint = ctx.accounts.payment_mint.key();
    launch.encrypted_curve_params = encrypted_curve_params;
    launch.initial_price = initial_price;
    launch.max_supply = max_supply;
    launch.encrypted_sold = Vec::new();
    launch.approximate_sold = 0;
    launch.buyer_count = 0;
    launch.total_payments = 0;
    launch.status = LaunchStatus::Active;
    launch.start_time = now;
    launch.end_time = 0; // No end time by default
    launch.state_commitment = [0u8; 32];
    launch.created_at = now;
    launch.bump = 0; // No PDA derivation, using default

    msg!("Confidential token launch created");
    msg!("Token: {}", token_mint);
    msg!("Initial price: {}", initial_price);
    msg!("Max supply: {}", max_supply);

    Ok(())
}

/// Buy tokens from a confidential launch
pub fn buy_from_launch(
    ctx: Context<BuyFromLaunch>,
    encrypted_amount: Vec<u8>,
    commitment: [u8; 32],
    payment_amount: u64,
) -> Result<()> {
    let launch = &mut ctx.accounts.launch;

    // Validate launch is active
    require!(launch.is_active()?, DarkFlowError::LaunchNotActive);

    // Validate payment
    require!(payment_amount > 0, DarkFlowError::InvalidAmount);

    // Validate encrypted amount
    require!(
        encrypted_amount.len() > 0 && encrypted_amount.len() <= 128,
        DarkFlowError::InvalidEncryptedData
    );

    // Validate commitment
    require!(commitment != [0u8; 32], DarkFlowError::InvalidCommitment);

    // Calculate tokens to receive based on bonding curve
    // In production, this would use the encrypted curve params via MPC
    let tokens_to_receive = calculate_tokens_for_payment(
        payment_amount,
        launch.initial_price,
        launch.approximate_sold,
        launch.max_supply,
    )?;

    // Check not sold out
    require!(
        launch.approximate_sold + tokens_to_receive <= launch.max_supply,
        DarkFlowError::LaunchSoldOut
    );

    // Transfer payment
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.buyer_payment_token.to_account_info(),
            to: ctx.accounts.launch_vault.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, payment_amount)?;

    // Update encrypted sold amount
    let encrypted_sold_update = update_encrypted_sold(
        &launch.encrypted_sold,
        &encrypted_amount,
    );

    // Record purchase
    launch.record_purchase(payment_amount, encrypted_sold_update);

    // Check if sold out
    if launch.approximate_sold >= launch.max_supply {
        launch.mark_sold_out();
    }

    msg!("Confidential purchase completed");
    msg!("Payment: {}", payment_amount);
    msg!("Buyers: {}", launch.buyer_count);

    Ok(())
}

// Helper functions

fn calculate_tokens_for_payment(
    payment: u64,
    initial_price: u64,
    _current_sold: u64,
    _max_supply: u64,
) -> Result<u64> {
    // Simple linear bonding curve: price increases with supply
    // price = initial_price * (1 + sold / max_supply)
    // For simplicity, use initial price for now

    let tokens = payment
        .checked_div(initial_price.max(1))
        .ok_or(DarkFlowError::MathOverflow)?;

    Ok(tokens)
}

fn update_encrypted_sold(current: &[u8], addition: &[u8]) -> Vec<u8> {
    // Placeholder: homomorphically add encrypted values
    // In production, use actual FHE or MPC
    let mut result = current.to_vec();
    result.extend_from_slice(addition);
    result
}

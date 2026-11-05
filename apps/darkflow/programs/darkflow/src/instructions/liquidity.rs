use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::{AddLiquidityEncrypted, RemoveLiquidityPrivate, EncryptedPosition};
use crate::errors::DarkFlowError;
use crate::zk_verify;

/// Add liquidity with encrypted amount
pub fn add_liquidity_encrypted(
    ctx: Context<AddLiquidityEncrypted>,
    encrypted_amount: Vec<u8>,
    commitment: [u8; 32],
    amount_a: u64,
    amount_b: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Validate pool is active
    require!(pool.is_active, DarkFlowError::PoolNotActive);

    // Validate amounts
    require!(amount_a > 0 || amount_b > 0, DarkFlowError::InvalidAmount);

    // Validate encrypted data
    require!(
        encrypted_amount.len() > 0 && encrypted_amount.len() <= 256,
        DarkFlowError::InvalidEncryptedData
    );

    // Validate commitment is not zero
    require!(commitment != [0u8; 32], DarkFlowError::InvalidCommitment);

    // Transfer token A to vault
    if amount_a > 0 {
        let transfer_a_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.lp_token_a.to_account_info(),
                to: ctx.accounts.vault_a.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        );
        token::transfer(transfer_a_ctx, amount_a)?;
    }

    // Transfer token B to vault
    if amount_b > 0 {
        let transfer_b_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.lp_token_b.to_account_info(),
                to: ctx.accounts.vault_b.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        );
        token::transfer(transfer_b_ctx, amount_b)?;
    }

    // Create nullifier for this position
    let nullifier = create_nullifier(&commitment, &ctx.accounts.lp.key());

    // Initialize position
    let position = &mut ctx.accounts.position;
    let bump = ctx.bumps.position;

    **position = EncryptedPosition::new(
        ctx.accounts.lp.key(),
        pool.key(),
        encrypted_amount,
        commitment,
        nullifier,
        bump,
    )?;

    // Update pool state
    pool.increment_position_count();

    msg!("Added encrypted liquidity");
    msg!("Position commitment: {:?}", &commitment[..8]);
    msg!("Pool position count: {}", pool.position_count);

    Ok(())
}

/// Remove liquidity with ZK proof of ownership
pub fn remove_liquidity_private(
    ctx: Context<RemoveLiquidityPrivate>,
    position_commitment: [u8; 32],
    zk_proof: Vec<u8>,
    withdraw_percentage_bps: u16,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let position = &ctx.accounts.position;

    // Validate pool is active
    require!(pool.is_active, DarkFlowError::PoolNotActive);

    // Validate position is active
    require!(position.is_active, DarkFlowError::PositionNotActive);

    // Validate commitment matches
    require!(
        position.commitment == position_commitment,
        DarkFlowError::InvalidCommitment
    );

    // Validate ZK proof (Noir circuit verification). This is only a hash
    // check (see zk_verify); the real gate is the owner signature enforced by
    // `has_one = owner` on the position.
    require!(
        zk_verify::verify_position_proof(&zk_proof, &position_commitment),
        DarkFlowError::InvalidZkProof
    );

    // Validate withdrawal percentage
    require!(
        withdraw_percentage_bps > 0 && withdraw_percentage_bps <= 10000,
        DarkFlowError::InvalidAmount
    );

    // Calculate withdrawal amounts
    // In production, this would be computed via MPC or derived from the proof
    let vault_a_balance = ctx.accounts.vault_a.amount;
    let vault_b_balance = ctx.accounts.vault_b.amount;

    // Simplified: withdraw proportional to position count
    // In production, use encrypted share from position
    let share = 10000u64 / pool.position_count.max(1);
    let withdraw_a = (vault_a_balance * share * withdraw_percentage_bps as u64) / (10000 * 10000);
    let withdraw_b = (vault_b_balance * share * withdraw_percentage_bps as u64) / (10000 * 10000);

    // Transfer tokens back to owner
    let _pool_key = pool.key();
    let seeds = &[
        b"dark_pool",
        pool.token_a_mint.as_ref(),
        pool.token_b_mint.as_ref(),
        &[pool.bump],
    ];
    let signer = &[&seeds[..]];

    if withdraw_a > 0 {
        let transfer_a_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_a.to_account_info(),
                to: ctx.accounts.owner_token_a.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_a_ctx, withdraw_a)?;
    }

    if withdraw_b > 0 {
        let transfer_b_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_b.to_account_info(),
                to: ctx.accounts.owner_token_b.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_b_ctx, withdraw_b)?;
    }

    // Update pool state
    if withdraw_percentage_bps == 10000 {
        pool.decrement_position_count();
    }

    msg!("Removed liquidity privately");
    msg!("Withdrew {}% of position", withdraw_percentage_bps / 100);

    Ok(())
}

/// Create a nullifier from commitment and owner using blake3 with domain separation
fn create_nullifier(commitment: &[u8; 32], owner: &Pubkey) -> [u8; 32] {
    let mut input = [0u8; 82];
    input[..32].copy_from_slice(commitment);
    input[32..64].copy_from_slice(owner.as_ref());
    input[64..82].copy_from_slice(b"darkflow_nullifier");
    *blake3::hash(&input).as_bytes()
}


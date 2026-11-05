use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::{AddLiquidityEncrypted, RemoveLiquidityPrivate, EncryptedPosition, MINIMUM_LIQUIDITY};
use crate::errors::DarkFlowError;
use crate::zk_verify;

/// Add liquidity with encrypted amount
pub fn add_liquidity_encrypted(
    ctx: Context<AddLiquidityEncrypted>,
    encrypted_amount: Vec<u8>,
    commitment: [u8; 32],
    amount_a: u64,
    amount_b: u64,
    min_liquidity: u64,
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

    // Liquidity units for this deposit, priced against the reserves before
    // the deposit (Uniswap v2 style). The first deposit locks
    // MINIMUM_LIQUIDITY so the supply never returns to zero.
    let reserve_a = ctx.accounts.vault_a.amount;
    let reserve_b = ctx.accounts.vault_b.amount;
    let total = pool.total_liquidity;
    // (deposit_a, deposit_b) are what is actually taken from the LP: on later
    // deposits only the amounts matching the pool ratio (rounded up, in the
    // pool's favour); the excess stays with the LP.
    let (liquidity, deposit_a, deposit_b) = if total == 0 {
        require!(amount_a > 0 && amount_b > 0, DarkFlowError::InvalidAmount);
        let root = isqrt((amount_a as u128) * (amount_b as u128));
        require!(root > MINIMUM_LIQUIDITY as u128, DarkFlowError::InvalidAmount);
        pool.total_liquidity = MINIMUM_LIQUIDITY;
        ((root - MINIMUM_LIQUIDITY as u128) as u64, amount_a, amount_b)
    } else {
        require!(reserve_a > 0 && reserve_b > 0, DarkFlowError::InvalidAmount);
        let by_a = (amount_a as u128) * (total as u128) / (reserve_a as u128);
        let by_b = (amount_b as u128) * (total as u128) / (reserve_b as u128);
        let liq = by_a.min(by_b);
        let need_a = (liq * (reserve_a as u128)).div_ceil(total as u128);
        let need_b = (liq * (reserve_b as u128)).div_ceil(total as u128);
        (
            u64::try_from(liq).map_err(|_| DarkFlowError::MathOverflow)?,
            (need_a as u64).min(amount_a),
            (need_b as u64).min(amount_b),
        )
    };
    require!(liquidity > 0, DarkFlowError::InvalidAmount);
    // Slippage bound: reserves can move between quoting and execution
    require!(liquidity >= min_liquidity, DarkFlowError::SlippageExceeded);
    pool.total_liquidity = pool
        .total_liquidity
        .checked_add(liquidity)
        .ok_or(DarkFlowError::MathOverflow)?;

    // Transfer token A to vault
    if deposit_a > 0 {
        let transfer_a_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.lp_token_a.to_account_info(),
                to: ctx.accounts.vault_a.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        );
        token::transfer(transfer_a_ctx, deposit_a)?;
    }

    // Transfer token B to vault
    if deposit_b > 0 {
        let transfer_b_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.lp_token_b.to_account_info(),
                to: ctx.accounts.vault_b.to_account_info(),
                authority: ctx.accounts.lp.to_account_info(),
            },
        );
        token::transfer(transfer_b_ctx, deposit_b)?;
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
        liquidity,
    )?;

    // Update pool state
    pool.increment_position_count();
    pool.next_position_id = pool
        .next_position_id
        .checked_add(1)
        .ok_or(DarkFlowError::MathOverflow)?;

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
    let position = &mut ctx.accounts.position;

    // No pool.is_active check here: LPs can always withdraw, even from a
    // paused pool.

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

    // Pro-rata payout: burn part of this position's liquidity and pay out the
    // same fraction of the pool's total liquidity from each vault.
    let total = pool.total_liquidity as u128;
    require!(total > 0, DarkFlowError::InvalidAmount);
    let burn = if withdraw_percentage_bps == 10000 {
        position.liquidity
    } else {
        ((position.liquidity as u128) * (withdraw_percentage_bps as u128) / 10000) as u64
    };
    require!(burn > 0, DarkFlowError::InvalidAmount);
    let withdraw_a = ((ctx.accounts.vault_a.amount as u128) * (burn as u128) / total) as u64;
    let withdraw_b = ((ctx.accounts.vault_b.amount as u128) * (burn as u128) / total) as u64;

    position.liquidity = position.liquidity.checked_sub(burn).ok_or(DarkFlowError::MathOverflow)?;
    pool.total_liquidity = pool.total_liquidity.checked_sub(burn).ok_or(DarkFlowError::MathOverflow)?;

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

    // Close the position once it holds no liquidity (rent back to the owner)
    if ctx.accounts.position.liquidity == 0 {
        ctx.accounts.pool.decrement_position_count();
        ctx.accounts.position.close(ctx.accounts.owner.to_account_info())?;
    }

    msg!("Removed liquidity privately");
    msg!("Withdrew {}% of position", withdraw_percentage_bps / 100);

    Ok(())
}

/// Integer square root (floor)
fn isqrt(n: u128) -> u128 {
    if n < 2 {
        return n;
    }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

/// Create a nullifier from commitment and owner using blake3 with domain separation
fn create_nullifier(commitment: &[u8; 32], owner: &Pubkey) -> [u8; 32] {
    let mut input = [0u8; 82];
    input[..32].copy_from_slice(commitment);
    input[32..64].copy_from_slice(owner.as_ref());
    input[64..82].copy_from_slice(b"darkflow_nullifier");
    *blake3::hash(&input).as_bytes()
}

#[cfg(test)]
mod tests {
    use super::isqrt;

    #[test]
    fn isqrt_floors() {
        for n in 0u128..10_000 {
            let r = isqrt(n);
            assert!(r * r <= n && (r + 1) * (r + 1) > n, "n={n} r={r}");
        }
        let big = (u64::MAX as u128) * (u64::MAX as u128);
        assert_eq!(isqrt(big), u64::MAX as u128);
    }
}

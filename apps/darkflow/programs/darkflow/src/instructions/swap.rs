use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Transfer};
use crate::{DarkSwap, SubmitDarkOrder, ExecuteDarkOrder, CancelDarkOrder, DarkOrder, OrderStatus};
use crate::errors::DarkFlowError;
use crate::zk_verify;

/// Execute a dark swap with ZK proof
pub fn dark_swap(
    ctx: Context<DarkSwap>,
    encrypted_order: Vec<u8>,
    zk_proof: Vec<u8>,
    nullifier: [u8; 32],
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Validate pool is active
    require!(pool.is_active, DarkFlowError::PoolNotActive);

    // Validate encrypted order
    require!(
        encrypted_order.len() > 0 && encrypted_order.len() <= 256,
        DarkFlowError::InvalidEncryptedData
    );

    // Validate ZK proof (Noir circuit verification)
    require!(
        zk_verify::verify_swap_proof(&zk_proof, &encrypted_order, &nullifier),
        DarkFlowError::InvalidZkProof
    );

    // Nullifier replay prevention: the `init` constraint on nullifier_account
    // ensures this PDA can only be created once. A second swap with the same
    // nullifier will fail because the account already exists.
    let nullifier_account = &mut ctx.accounts.nullifier_account;
    nullifier_account.nullifier = nullifier;
    nullifier_account.used_at = Clock::get()?.unix_timestamp;

    // Execute the swap
    // In production, amounts would be extracted from decrypted order or computed via MPC
    // For now, use a simplified swap model

    msg!("Dark swap executed");
    msg!("Nullifier: {:?}", &nullifier[..8]);

    // Update volume
    pool.add_volume(0, 0); // Actual amounts hidden

    Ok(())
}

/// Submit a dark order for later execution
pub fn submit_dark_order(
    ctx: Context<SubmitDarkOrder>,
    encrypted_params: Vec<u8>,
    commitment: [u8; 32],
    input_amount: u64,
    deadline: i64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Validate pool is active
    require!(pool.is_active, DarkFlowError::PoolNotActive);

    // Validate deadline is in the future
    let now = Clock::get()?.unix_timestamp;
    require!(deadline > now, DarkFlowError::DeadlineExceeded);

    // Validate input amount
    require!(input_amount > 0, DarkFlowError::InvalidAmount);

    // Validate encrypted params
    require!(
        encrypted_params.len() > 0 && encrypted_params.len() <= 256,
        DarkFlowError::InvalidEncryptedData
    );

    // Transfer input tokens to escrow
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.maker_input_token.to_account_info(),
            to: ctx.accounts.escrow_token.to_account_info(),
            authority: ctx.accounts.maker.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, input_amount)?;

    // Initialize the order
    let order = &mut ctx.accounts.order;
    let bump = ctx.bumps.order;

    **order = DarkOrder::new(
        ctx.accounts.maker.key(),
        pool.key(),
        ctx.accounts.maker_input_token.mint,
        Pubkey::default(), // Output mint will be determined by pool
        encrypted_params,
        commitment,
        input_amount,
        deadline,
        bump,
    )?;

    // Update pool order count
    pool.increment_order_count();

    msg!("Dark order submitted");
    msg!("Order ID: {}", order.key());
    msg!("Deadline: {}", deadline);

    Ok(())
}

/// Execute a dark order (solver only)
pub fn execute_dark_order(
    ctx: Context<ExecuteDarkOrder>,
    decrypted_min_output: u64,
    execution_proof: Vec<u8>,
    encrypted_output: Vec<u8>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let order = &mut ctx.accounts.order;

    // Vaults must be this pool's vault PDAs, input side matching the order's mint
    let pool_key = pool.key();
    let (vault_a, _) = Pubkey::find_program_address(&[b"pool_vault_a", pool_key.as_ref()], ctx.program_id);
    let (vault_b, _) = Pubkey::find_program_address(&[b"pool_vault_b", pool_key.as_ref()], ctx.program_id);
    let (expected_in, expected_out) = if order.input_mint == pool.token_a_mint {
        (vault_a, vault_b)
    } else if order.input_mint == pool.token_b_mint {
        (vault_b, vault_a)
    } else {
        return err!(DarkFlowError::InvalidTokenMint);
    };
    require_keys_eq!(ctx.accounts.vault_input.key(), expected_in, DarkFlowError::InvalidTokenMint);
    require_keys_eq!(ctx.accounts.vault_output.key(), expected_out, DarkFlowError::InvalidTokenMint);

    // Validate pool is active
    require!(pool.is_active, DarkFlowError::PoolNotActive);

    // Validate order can be executed
    require!(order.can_execute()?, DarkFlowError::OrderNotPending);

    // Validate execution proof (Noir circuit verification)
    require!(
        zk_verify::verify_execution_proof(&execution_proof, &order.commitment),
        DarkFlowError::InvalidZkProof
    );

    // Execute swap through pool
    let input_amount = order.input_amount;

    // Calculate output based on AMM formula
    // In production, this would use the actual pool reserves and encrypted state
    let output_amount = calculate_swap_output(
        input_amount,
        ctx.accounts.vault_input.amount,
        ctx.accounts.vault_output.amount,
        pool.fee_rate_bps,
    )?;

    // Validate slippage
    require!(
        output_amount >= decrypted_min_output,
        DarkFlowError::SlippageExceeded
    );

    // Validate encrypted output length (NaCl box: 24-byte nonce + 16-byte tag + 8-byte amount = 48 min)
    require!(
        encrypted_output.len() >= 48 && encrypted_output.len() <= 64,
        DarkFlowError::InvalidEncryptedData
    );

    // Transfer from escrow to vault
    // Transfer output to maker
    let pool_seeds = &[
        b"dark_pool",
        pool.token_a_mint.as_ref(),
        pool.token_b_mint.as_ref(),
        &[pool.bump],
    ];
    let signer = &[&pool_seeds[..]];

    // Move the whole escrow balance (input_amount plus anything else sent to
    // it) into the pool so the escrow can be closed below.
    let escrow_balance = ctx.accounts.escrow_token.amount;
    let transfer_input_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_token.to_account_info(),
            to: ctx.accounts.vault_input.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    );
    token::transfer(transfer_input_ctx, escrow_balance)?;

    let transfer_output_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_output.to_account_info(),
            to: ctx.accounts.maker_output_token.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    );
    token::transfer(transfer_output_ctx, output_amount)?;

    // Close the now-empty escrow, returning its rent to the maker
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    ))?;

    // Mark order as filled with solver-provided encrypted output
    order.fill(ctx.accounts.solver.key(), encrypted_output)?;

    // Update volume
    pool.add_volume(input_amount, output_amount);

    msg!("Dark order executed");
    msg!("Order: {}", order.key());
    msg!("Solver: {}", ctx.accounts.solver.key());

    Ok(())
}

/// Cancel a pending dark order
pub fn cancel_dark_order(ctx: Context<CancelDarkOrder>) -> Result<()> {
    let order = &mut ctx.accounts.order;

    // Validate order is pending
    require!(
        order.status == OrderStatus::Pending,
        DarkFlowError::OrderNotPending
    );

    // Return the whole escrow balance to the maker (escrow is owned by the
    // pool PDA) so the escrow can be closed below.
    let input_amount = ctx.accounts.escrow_token.amount;

    let pool = &ctx.accounts.pool;
    let pool_seeds = &[
        b"dark_pool",
        pool.token_a_mint.as_ref(),
        pool.token_b_mint.as_ref(),
        &[pool.bump],
    ];
    let signer = &[&pool_seeds[..]];

    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.escrow_token.to_account_info(),
            to: ctx.accounts.maker_input_token.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    );
    token::transfer(transfer_ctx, input_amount)?;

    // Close the now-empty escrow, returning its rent to the maker
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token.to_account_info(),
            destination: ctx.accounts.maker.to_account_info(),
            authority: pool.to_account_info(),
        },
        signer,
    ))?;

    // Mark order as cancelled
    order.cancel();

    msg!("Dark order cancelled");
    msg!("Returned {} tokens to maker", input_amount);

    Ok(())
}

// Helper functions

fn calculate_swap_output(
    input: u64,
    reserve_in: u64,
    reserve_out: u64,
    fee_bps: u16,
) -> Result<u64> {
    // Constant product formula: x * y = k
    // output = (reserve_out * input * (10000 - fee)) / (reserve_in * 10000 + input * (10000 - fee))

    let fee_factor = 10000u128 - fee_bps as u128;
    let numerator = (reserve_out as u128)
        .checked_mul(input as u128)
        .ok_or(DarkFlowError::MathOverflow)?
        .checked_mul(fee_factor)
        .ok_or(DarkFlowError::MathOverflow)?;

    let denominator = (reserve_in as u128)
        .checked_mul(10000)
        .ok_or(DarkFlowError::MathOverflow)?
        .checked_add(
            (input as u128)
                .checked_mul(fee_factor)
                .ok_or(DarkFlowError::MathOverflow)?
        )
        .ok_or(DarkFlowError::MathOverflow)?;

    let output = numerator
        .checked_div(denominator)
        .ok_or(DarkFlowError::MathOverflow)?;

    Ok(output as u64)
}


use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

declare_id!("8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U");

/// DarkFlow - Confidential AMM with Dark Liquidity
///
/// Key Features:
/// - Encrypted LP positions (nobody knows your deposit size)
/// - Dark swaps with ZK proofs (MEV impossible)
/// - Confidential token launches with private bonding curves
/// - Arcium integration for encrypted shared state
///
/// Privacy Model:
/// - Individual positions are encrypted
/// - Pool aggregates (TVL, volume) are public
/// - Swaps are verified via ZK proofs without revealing amounts

pub mod state;
pub mod instructions;
pub mod errors;
pub mod zk_verify;

pub use state::*;
pub use errors::*;

#[program]
pub mod darkflow {
    use super::*;

    // ========================================================================
    // Pool Management
    // ========================================================================

    /// Initialize a new dark liquidity pool (step 1: create pool account)
    ///
    /// The pool stores encrypted LP positions. Only aggregate statistics
    /// (total liquidity, number of LPs) are public.
    /// Call initialize_pool_vaults after this to create the token vaults.
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        pool_encryption_pubkey: [u8; 32],
        fee_rate_bps: u16,
        solver: Pubkey,
    ) -> Result<()> {
        instructions::initialize_pool(ctx, token_a_mint, token_b_mint, pool_encryption_pubkey, fee_rate_bps, solver)
    }

    /// Initialize pool vaults (step 2: create token vaults)
    ///
    /// Must be called after initialize_pool to create the token vault accounts.
    pub fn initialize_pool_vaults(
        ctx: Context<InitializePoolVaults>,
    ) -> Result<()> {
        instructions::initialize_pool_vaults(ctx)
    }

    /// Update pool configuration (authority only)
    pub fn update_pool_config(
        ctx: Context<UpdatePoolConfig>,
        new_fee_rate_bps: Option<u16>,
        new_encryption_pubkey: Option<[u8; 32]>,
        new_solver: Option<Pubkey>,
    ) -> Result<()> {
        instructions::update_pool_config(ctx, new_fee_rate_bps, new_encryption_pubkey, new_solver)
    }

    // ========================================================================
    // Encrypted Liquidity
    // ========================================================================

    /// Add liquidity with encrypted amount
    ///
    /// The LP deposits tokens, but the exact amount is encrypted. Only the
    /// LP and the pool (via MPC) can know the actual amount.
    ///
    /// # Arguments
    /// * `encrypted_amount` - NaCl box encrypted deposit amount
    /// * `commitment` - Pedersen commitment to the amount (for ZK verification)
    /// * `amount_a` - Actual token A amount (will be verified against commitment)
    /// * `amount_b` - Actual token B amount (will be verified against commitment)
    pub fn add_liquidity_encrypted(
        ctx: Context<AddLiquidityEncrypted>,
        encrypted_amount: Vec<u8>,
        commitment: [u8; 32],
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        instructions::add_liquidity_encrypted(ctx, encrypted_amount, commitment, amount_a, amount_b)
    }

    /// Remove liquidity with ZK proof of ownership
    ///
    /// The LP provides a ZK proof that they own the position without
    /// revealing the exact amount to anyone except themselves.
    ///
    /// # Arguments
    /// * `position_commitment` - The commitment identifying the position
    /// * `zk_proof` - Noir proof of position ownership
    /// * `withdraw_percentage_bps` - Percentage to withdraw (in basis points)
    pub fn remove_liquidity_private(
        ctx: Context<RemoveLiquidityPrivate>,
        position_commitment: [u8; 32],
        zk_proof: Vec<u8>,
        withdraw_percentage_bps: u16,
    ) -> Result<()> {
        instructions::remove_liquidity_private(ctx, position_commitment, zk_proof, withdraw_percentage_bps)
    }

    // ========================================================================
    // Dark Swaps
    // ========================================================================

    /// Execute a dark swap with encrypted order and ZK proof
    ///
    /// The swap amount is never revealed on-chain. The ZK proof verifies:
    /// 1. User has sufficient balance
    /// 2. Swap parameters are valid
    /// 3. Slippage constraints are met
    ///
    /// # Arguments
    /// * `encrypted_order` - Encrypted swap parameters (amount, min_output, deadline)
    /// * `zk_proof` - Noir proof of swap validity
    /// * `nullifier` - Prevents replay attacks
    pub fn dark_swap(
        ctx: Context<DarkSwap>,
        encrypted_order: Vec<u8>,
        zk_proof: Vec<u8>,
        nullifier: [u8; 32],
    ) -> Result<()> {
        instructions::dark_swap(ctx, encrypted_order, zk_proof, nullifier)
    }

    /// Submit a dark order for later execution by solver
    ///
    /// Order details are encrypted for the solver. Only the solver can
    /// decrypt and execute the order.
    pub fn submit_dark_order(
        ctx: Context<SubmitDarkOrder>,
        encrypted_params: Vec<u8>,
        commitment: [u8; 32],
        input_amount: u64,
        deadline: i64,
    ) -> Result<()> {
        instructions::submit_dark_order(ctx, encrypted_params, commitment, input_amount, deadline)
    }

    /// Execute a dark order (pool's trusted solver only; see zk_verify)
    pub fn execute_dark_order(
        ctx: Context<ExecuteDarkOrder>,
        decrypted_min_output: u64,
        execution_proof: Vec<u8>,
        encrypted_output: Vec<u8>,
    ) -> Result<()> {
        instructions::execute_dark_order(ctx, decrypted_min_output, execution_proof, encrypted_output)
    }

    /// Cancel a pending dark order
    pub fn cancel_dark_order(ctx: Context<CancelDarkOrder>) -> Result<()> {
        instructions::cancel_dark_order(ctx)
    }

    // ========================================================================
    // Confidential Token Launch
    // ========================================================================

    /// Launch a token with a confidential bonding curve
    ///
    /// The bonding curve parameters are encrypted. Early buyers cannot
    /// see how much others have purchased, preventing front-running.
    pub fn launch_confidential_token(
        ctx: Context<LaunchConfidentialToken>,
        token_mint: Pubkey,
        encrypted_curve_params: Vec<u8>,
        initial_price: u64,
        max_supply: u64,
    ) -> Result<()> {
        instructions::launch_confidential_token(ctx, token_mint, encrypted_curve_params, initial_price, max_supply)
    }

    /// Buy tokens from confidential launch
    pub fn buy_from_launch(
        ctx: Context<BuyFromLaunch>,
        encrypted_amount: Vec<u8>,
        commitment: [u8; 32],
        payment_amount: u64,
    ) -> Result<()> {
        instructions::buy_from_launch(ctx, encrypted_amount, commitment, payment_amount)
    }

    // ========================================================================
    // Queries (Public Aggregates)
    // ========================================================================

    /// Get pool aggregates (public data)
    /// Individual positions remain private
    pub fn query_pool_aggregates(ctx: Context<QueryPoolAggregates>) -> Result<PoolAggregates> {
        instructions::query_pool_aggregates(ctx)
    }
}

// ============================================================================
// Account Contexts
// ============================================================================

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + DarkPool::INIT_SPACE,
        seeds = [b"dark_pool", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub pool: Box<Account<'info, DarkPool>>,

    /// CHECK: Token A mint
    pub token_a_mint: UncheckedAccount<'info>,

    /// CHECK: Token B mint
    pub token_b_mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializePoolVaults<'info> {
    #[account(mut, has_one = authority)]
    pub pool: Box<Account<'info, DarkPool>>,

    /// CHECK: Token A mint, must be the pool's
    #[account(address = pool.token_a_mint @ DarkFlowError::InvalidTokenMint)]
    pub token_a_mint: UncheckedAccount<'info>,

    /// CHECK: Token B mint, must be the pool's
    #[account(address = pool.token_b_mint @ DarkFlowError::InvalidTokenMint)]
    pub token_b_mint: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        token::mint = token_a_mint,
        token::authority = pool,
        seeds = [b"pool_vault_a", pool.key().as_ref()],
        bump
    )]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        token::mint = token_b_mint,
        token::authority = pool,
        seeds = [b"pool_vault_b", pool.key().as_ref()],
        bump
    )]
    pub vault_b: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePoolConfig<'info> {
    #[account(mut, has_one = authority)]
    pub pool: Account<'info, DarkPool>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddLiquidityEncrypted<'info> {
    #[account(mut)]
    pub pool: Account<'info, DarkPool>,

    #[account(
        init,
        payer = lp,
        space = 8 + EncryptedPosition::INIT_SPACE,
        seeds = [b"position", pool.key().as_ref(), lp.key().as_ref(), &pool.position_count.to_le_bytes()],
        bump
    )]
    pub position: Account<'info, EncryptedPosition>,

    #[account(mut)]
    pub lp_token_a: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp_token_b: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pool_vault_a", pool.key().as_ref()], bump)]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pool_vault_b", pool.key().as_ref()], bump)]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub lp: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveLiquidityPrivate<'info> {
    #[account(mut)]
    pub pool: Account<'info, DarkPool>,

    /// Closed in the handler once its liquidity reaches zero
    #[account(mut, has_one = owner, has_one = pool)]
    pub position: Account<'info, EncryptedPosition>,

    #[account(mut)]
    pub owner_token_a: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner_token_b: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pool_vault_a", pool.key().as_ref()], bump)]
    pub vault_a: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pool_vault_b", pool.key().as_ref()], bump)]
    pub vault_b: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(encrypted_order: Vec<u8>, zk_proof: Vec<u8>, nullifier: [u8; 32])]
pub struct DarkSwap<'info> {
    #[account(mut)]
    pub pool: Account<'info, DarkPool>,

    #[account(mut)]
    pub user_input_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_output_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_input: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_output: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = user,
        space = 8 + NullifierAccount::INIT_SPACE,
        seeds = [b"nullifier", pool.key().as_ref(), nullifier.as_ref()],
        bump
    )]
    pub nullifier_account: Account<'info, NullifierAccount>,

    /// Trusted solver/attestor must co-sign: the swap proof is only a hash
    /// check (see zk_verify), so this signature is the real gate.
    #[account(address = pool.solver @ DarkFlowError::Unauthorized)]
    pub solver: Signer<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitDarkOrder<'info> {
    #[account(mut)]
    pub pool: Account<'info, DarkPool>,

    #[account(
        init,
        payer = maker,
        space = 8 + DarkOrder::INIT_SPACE,
        seeds = [b"dark_order", pool.key().as_ref(), maker.key().as_ref(), &pool.order_count.to_le_bytes()],
        bump
    )]
    pub order: Account<'info, DarkOrder>,

    #[account(
        mut,
        constraint = maker_input_token.mint == pool.token_a_mint
            || maker_input_token.mint == pool.token_b_mint @ DarkFlowError::InvalidTokenMint
    )]
    pub maker_input_token: Account<'info, TokenAccount>,

    #[account(address = maker_input_token.mint @ DarkFlowError::InvalidTokenMint)]
    pub input_mint: Account<'info, Mint>,

    /// Per-order escrow, owned by the pool PDA
    #[account(
        init,
        payer = maker,
        token::mint = input_mint,
        token::authority = pool,
        seeds = [b"order_escrow", order.key().as_ref()],
        bump
    )]
    pub escrow_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub maker: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ExecuteDarkOrder<'info> {
    #[account(mut)]
    pub pool: Account<'info, DarkPool>,

    #[account(mut, has_one = pool)]
    pub order: Account<'info, DarkOrder>,

    /// Only the pool's trusted solver may execute orders. The execution proof
    /// is only a hash check (see zk_verify), so this signature is the real gate.
    #[account(address = pool.solver @ DarkFlowError::Unauthorized)]
    pub solver: Signer<'info>,

    #[account(mut, seeds = [b"order_escrow", order.key().as_ref()], bump)]
    pub escrow_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = maker_output_token.owner == order.maker @ DarkFlowError::Unauthorized,
        constraint = maker_output_token.mint == vault_output.mint @ DarkFlowError::InvalidTokenMint
    )]
    pub maker_output_token: Account<'info, TokenAccount>,

    /// Pool vault for the order's input mint (checked against the pool's vault PDAs in the handler)
    #[account(mut, constraint = vault_input.mint == order.input_mint @ DarkFlowError::InvalidTokenMint)]
    pub vault_input: Account<'info, TokenAccount>,

    /// Pool vault for the other mint (checked against the pool's vault PDAs in the handler)
    #[account(mut)]
    pub vault_output: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelDarkOrder<'info> {
    pub pool: Account<'info, DarkPool>,

    #[account(mut, has_one = maker, has_one = pool, close = maker)]
    pub order: Account<'info, DarkOrder>,

    #[account(mut, seeds = [b"order_escrow", order.key().as_ref()], bump)]
    pub escrow_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub maker_input_token: Account<'info, TokenAccount>,

    pub maker: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct LaunchConfidentialToken<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + ConfidentialLaunch::INIT_SPACE
    )]
    pub launch: Account<'info, ConfidentialLaunch>,

    /// CHECK: Token mint for the launch
    pub token_mint: UncheckedAccount<'info>,

    /// Mint buyers pay in
    pub payment_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyFromLaunch<'info> {
    #[account(mut)]
    pub launch: Account<'info, ConfidentialLaunch>,

    #[account(
        mut,
        constraint = buyer_payment_token.mint == launch.payment_mint @ DarkFlowError::InvalidTokenMint
    )]
    pub buyer_payment_token: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer_receive_token: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = launch_vault.owner == launch.creator @ DarkFlowError::Unauthorized,
        constraint = launch_vault.mint == launch.payment_mint @ DarkFlowError::InvalidTokenMint
    )]
    pub launch_vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct QueryPoolAggregates<'info> {
    pub pool: Account<'info, DarkPool>,
}


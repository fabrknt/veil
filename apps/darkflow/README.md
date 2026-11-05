# DarkFlow

> "Trade without a trace. Lend without a ledger."

Confidential AMM with Dark Liquidity for Solana: encrypted LP positions, with ZK-verified swaps and private token launches planned.

> **Status:** the Noir prover in veil-core (`@fabrknt/veil-core/solana/noir`) generates **mock proofs**, and the Light compression and Privacy Cash calls are placeholders. DarkFlow today encrypts LP and swap data with NaCl box; it does **not** yet prove balances, swap validity or slippage, and nothing is ZK-verified on-chain. Treat the ZK sections below as the design.

## Overview

DarkFlow is a privacy-preserving DeFi protocol that brings institutional-grade dark pool mechanics to Solana. Built on Veil's encryption infrastructure, it enables:

1. **Hidden LP Positions** - Nobody knows how much you deposited
2. **Dark Swaps** - MEV-impossible trades with ZK proof verification
3. **Confidential Token Launches** - Private bonding curves where buyers can't front-run each other

## Why DarkFlow?

### The Problem

```
Traditional AMM (Uniswap, Raydium):
├── LP deposits 100,000 USDC → Everyone sees → Whale watchers target
├── Swap 50,000 SOL → Everyone sees → MEV bots sandwich attack
└── Result: Value extracted from users by bots and front-runners
```

### The Solution

```
DarkFlow:
├── LP deposits [encrypted] → Nobody knows size → No targeting
├── Swap [encrypted] → ZK proof verifies validity → MEV impossible
└── Result: Users keep their value, privacy preserved
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DARKFLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │  Dark AMM Pool │  │ Confidential   │  │  ZK Swap       │    │
│  │  (Hidden LP)   │  │ Token Launch   │  │  Verifier      │    │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘    │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              │                                  │
│              ┌───────────────▼───────────────┐                  │
│              │      Arcium Encrypted         │                  │
│              │      Shared State             │                  │
│              └───────────────┬───────────────┘                  │
│                              │                                  │
│              ┌───────────────▼───────────────┐                  │
│              │        @fabrknt/veil-crypto           │                  │
│              │   NaCl • Noir • ZK Compress   │                  │
│              └───────────────────────────────┘                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Encrypted LP Positions

When you add liquidity, the amount is encrypted using NaCl box encryption. Only you (and the pool via MPC) know your actual position size.

```typescript
// Your deposit is hidden from other users
const result = await darkflow.addLiquidityEncrypted({
  pool: poolAddress,
  amountA: BigInt(10_000_000_000), // 10 SOL (maximum)
  amountB: BigInt(1_000_000_000),  // 1000 USDC (maximum)
  minLiquidity: BigInt(1),         // fail if fewer liquidity units are minted
});

// On-chain: the position stores the encrypted amount and a commitment hash
```

The program still moves the deposit with plain SPL transfers, so the token amounts are visible in the transaction. Each position records its **liquidity units**; withdrawals pay `vault balance × burned units / total_liquidity` from both vaults (see [Liquidity accounting](#liquidity-accounting)).

### 2. Dark Swaps with ZK Proofs

Planned: swaps verified with Noir ZK proofs (the current prover returns mock proofs). The proof would confirm:
- You have sufficient balance
- The swap parameters are valid
- Slippage constraints are met

Without revealing the actual amounts.

Today `dark_swap` takes `input_amount` and `min_output` as plain arguments signed by the user, moves `input_amount` from the user into the pool vault, and pays the constant-product output (after the pool fee) from the other vault. It fails if the output is below `min_output`. The pool's solver must co-sign, and each `nullifier` can be used once per pool.

```typescript
// Execute a dark swap - amount never revealed
const result = await darkflow.darkSwap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  inputAmount: BigInt(5_000_000_000),    // 5 SOL (encrypted)
  minOutputAmount: BigInt(500_000_000),  // Min 500 USDC (encrypted)
  deadline: Math.floor(Date.now() / 1000) + 300, // 5 min
});
```

### 3. Confidential Token Launches

Launch tokens with private bonding curves. Early buyers can't see how much others have purchased, preventing whale front-running.

```typescript
// Create a launch with hidden curve parameters
const launch = await darkflow.launchConfidentialToken({
  tokenMint: newTokenMint,
  initialPrice: BigInt(1_000_000),      // 0.001 SOL per token
  maxSupply: BigInt(1_000_000_000_000), // 1M tokens
  curveType: 'linear',
});

// Buyers purchase without seeing total sold
await darkflow.buyFromLaunch(launchAddress, paymentAmount);
```

## Project Structure

```
darkflow/
├── programs/
│   └── darkflow/
│       └── src/
│           ├── lib.rs           # Main program entry
│           ├── state/           # Account structures
│           │   ├── config.rs    # Program config (pool-creation admin)
│           │   ├── pool.rs      # Dark pool state
│           │   ├── position.rs  # Encrypted LP positions
│           │   ├── order.rs     # Dark order state
│           │   └── launch.rs    # Confidential launch state
│           ├── instructions/    # Program instructions
│           │   ├── pool.rs      # Pool management
│           │   ├── liquidity.rs # LP operations
│           │   ├── swap.rs      # Dark swap execution
│           │   ├── launch.rs    # Token launch
│           │   └── query.rs     # Public aggregates
│           ├── zk_verify.rs     # Proof checks (hash-based placeholders)
│           └── errors.rs        # Error definitions
├── sdk/
│   └── src/
│       ├── darkflow.ts    # Main client
│       ├── pool.ts        # Pool operations
│       ├── liquidity.ts   # LP operations
│       ├── swap.ts        # Swap operations
│       ├── launch.ts      # Launch operations
│       └── types.ts       # TypeScript types
├── solver/                # Order execution service
├── app/                   # Next.js frontend
└── tests/                 # Integration tests
```

## Getting Started

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor 0.30+
- Node.js 18+
- Yarn

### Installation

```bash
# From the veil monorepo root
cd apps/darkflow

# Install dependencies
yarn install

# Build the Anchor program
anchor build --no-idl

# Build the IDL (Anchor 0.30's anchor-syn needs Span::source_file, gone from
# current Rust; Cargo.lock pins proc-macro2 1.0.94 and this nightly has it)
(cd programs/darkflow && RUSTUP_TOOLCHAIN=nightly-2025-04-15 anchor idl build -o ../../target/idl/darkflow.json)

# Run tests
yarn test
```

### Using the SDK

```typescript
import { createDarkFlowClient } from '@fabrknt/veil-darkflow-sdk';
import { Connection, Keypair } from '@solana/web3.js';

// Create client
const connection = new Connection('https://api.devnet.solana.com');
const wallet = { publicKey: keypair.publicKey, signTransaction, signAllTransactions };
const darkflow = createDarkFlowClient(connection, wallet);

// Add liquidity (encrypted)
await darkflow.addLiquidityEncrypted({
  pool: poolAddress,
  amountA: BigInt(10_000_000_000),
  amountB: BigInt(1_000_000_000),
  minLiquidity: BigInt(1),
});

// Execute dark swap
await darkflow.darkSwap({
  inputMint: SOL_MINT,
  outputMint: USDC_MINT,
  inputAmount: BigInt(1_000_000_000),
  minOutputAmount: BigInt(100_000_000),
  deadline: Date.now() / 1000 + 300,
});
```

The `DarkFlowClient` methods build the encrypted payloads and commitments but return mock results; they do not send transactions yet. `DarkPoolOperations.findConfigAddress()` and `LiquidityOperations.findPositionAddress(pool, owner, positionId)` derive the on-chain addresses.

## Roles and setup

| Role | Who | Can do |
|------|-----|--------|
| Upgrade authority | the program's upgrade authority | `initialize_config(admin)`, once after deploy |
| Config admin | `DarkFlowConfig.admin` | `initialize_pool`; hand the role over with `set_config_admin` |
| Pool authority | the admin that created the pool (`DarkPool.authority`) | `initialize_pool_vaults`, `update_pool_config` (fee, encryption key, solver) |
| Solver | `DarkPool.solver`, set at `initialize_pool` | must sign `execute_dark_order` and `dark_swap` |
| LP / maker / user | anyone | add/remove liquidity, submit/cancel orders, swap |

Deploy order:

1. Deploy the program.
2. The upgrade authority runs `initialize_config(admin)` (config PDA seed `"config"`). Until this runs, no pool can be created.
3. The admin runs `initialize_pool(token_a_mint, token_b_mint, pool_encryption_pubkey, fee_rate_bps, solver)` (PDA `["dark_pool", mint_a, mint_b]`), then `initialize_pool_vaults` (PDAs `["pool_vault_a", pool]`, `["pool_vault_b", pool]`, owned by the pool PDA).

The proof checks in `zk_verify.rs` recompute a hash of public inputs and are not zero-knowledge verification, so the solver's signature is what authorizes order execution and dark swaps. Treat the solver as a trusted party.

## Instructions

| Instruction | Signer | Arguments | What it does |
|-------------|--------|-----------|--------------|
| `initialize_config` | upgrade authority | `admin` | Creates `DarkFlowConfig` |
| `set_config_admin` | config admin | `new_admin` | Replaces the admin |
| `initialize_pool` | config admin | `token_a_mint, token_b_mint, pool_encryption_pubkey, fee_rate_bps, solver` | Creates the pool account |
| `initialize_pool_vaults` | pool authority | — | Creates the two vaults for the pool's mints |
| `update_pool_config` | pool authority | `new_fee_rate_bps?, new_encryption_pubkey?, new_solver?` | Updates pool settings |
| `add_liquidity_encrypted` | LP | `encrypted_amount, commitment, amount_a, amount_b, min_liquidity` | Deposits into the vaults and creates a position |
| `remove_liquidity_private` | position owner | `position_commitment, zk_proof, withdraw_percentage_bps` | Burns part of the position's liquidity and pays the pro-rata share; closes the position at zero |
| `dark_swap` | user + solver | `encrypted_order, zk_proof, nullifier, input_amount, min_output` | Swaps against the pool vaults |
| `submit_dark_order` | maker | `encrypted_params, commitment, input_amount, min_output, deadline` | Escrows `input_amount` and records the order |
| `execute_dark_order` | solver | `execution_proof, encrypted_output` | Fills the order from the pool vaults |
| `cancel_dark_order` | maker | — | Returns the escrow and closes the order |
| `launch_confidential_token` | creator | `token_mint, encrypted_curve_params, initial_price, max_supply` | Creates a launch; takes a `payment_mint` account |
| `buy_from_launch` | buyer | `encrypted_amount, commitment, payment_amount` | Pays the creator's vault in the launch's payment mint |
| `query_pool_aggregates` | — | — | Returns public pool totals |

### Liquidity accounting

- The first deposit mints `sqrt(amount_a × amount_b)` liquidity units and locks `MINIMUM_LIQUIDITY` (1,000) of them in the pool permanently; it needs both amounts.
- Later deposits treat `amount_a` / `amount_b` as maximums: the program mints `min(amount_a × total / reserve_a, amount_b × total / reserve_b)` units and takes only the amounts that match the pool ratio (rounded up). The deposit fails if fewer than `min_liquidity` units would be minted.
- `remove_liquidity_private` burns `withdraw_percentage_bps` of the position's units and pays `vault × burned / total_liquidity` from each vault. The position account is closed (rent to the owner) when its units reach zero.
- Position PDAs are `["position", pool, owner, next_position_id (u64 LE)]`. `next_position_id` only increases; `position_count` is the number of open positions.

### Order lifecycle

1. `submit_dark_order` creates the order (PDA `["dark_order", pool, maker, order_count]`) and a per-order escrow token account (PDA `["order_escrow", order]`, owned by the pool PDA), and moves `input_amount` into it. `min_output` and `deadline` are stored in the order.
2. `execute_dark_order` (solver) prices the fill against the vault reserves, requires the output to be at least the order's `min_output`, moves the whole escrow balance into the input vault, pays the output to the maker's token account, and closes the escrow (rent to the maker). The order is marked filled.
3. `cancel_dark_order` (maker, while pending) returns the whole escrow balance, closes the escrow, and closes the order (rent to the maker).

## Upgrading an existing deployment

Account layouts changed: `DarkPool` gained `solver`, `total_liquidity` and `next_position_id` (+48 bytes), `EncryptedPosition` gained `liquidity` (+8), `DarkOrder` gained `min_output` (+8) and `ConfidentialLaunch` gained `payment_mint` (+32). There is no migration instruction. After upgrading, run `initialize_config`, then recreate pools, positions, orders and launches; accounts created by an earlier build cannot be read by this one. Withdraw liquidity and cancel orders on the old build before upgrading.

## Privacy Model

### What's Private

| Data | Visibility |
|------|------------|
| Individual LP amounts | Encrypted (only owner sees) |
| Swap order details | Encrypted (only solver sees) |
| Launch purchases | Encrypted (only buyer sees) |

### What's Public

| Data | Visibility |
|------|------------|
| Pool existence | Public |
| Total LP count | Public (aggregate) |
| Total volume | Public (aggregate) |
| Swap / order input amount and min output | Public (instruction data and order account; tokens move by SPL transfer and the slippage check runs on-chain) |
| Your wallet address | Public (use fresh wallets) |

### ZK Proofs

DarkFlow uses Noir circuits for zero-knowledge proofs:

- **Swap Validity**: Proves balance sufficiency without revealing amount
- **Position Ownership**: Proves you own a position without revealing size
- **Range Proofs**: Proves amounts are within valid ranges

## Hackathon Bounties

DarkFlow targets these Solana PrivacyHack 2026 bounties:

| Bounty | Prize | How DarkFlow Qualifies |
|--------|-------|------------------------|
| **Arcium** | $10k | Encrypted shared state for dark pools |
| **Anoncoin** | $10k | Dark liquidity pools, confidential launches |
| **Aztec/Noir** | $10k | ZK proofs for swap validity |
| **Open Track** | $18k | Novel privacy DeFi infrastructure |

**Total Potential: $48k+**

## Tech Stack

- **Blockchain**: Solana
- **Smart Contracts**: Anchor 0.30
- **Encryption**: NaCl (via @fabrknt/veil-crypto)
- **ZK Proofs**: Noir
- **Encrypted State**: Arcium
- **Compression**: Light Protocol

## Security Considerations

- **Encryption Keys**: Never share your encryption keypair
- **Commitments**: Always verify commitments before transactions
- **Proofs**: not yet — proofs are mocked and not verified on-chain (see Status at the top); the pool's solver signature is the gate for swaps and order fills
- **Admin keys**: the config admin decides who can create pools, and each pool's authority can change its fee and solver
- **Nullifiers**: Prevent replay attacks and double-spending

## Roadmap

- [x] Core protocol design
- [x] Anchor program scaffold
- [x] TypeScript SDK
- [ ] Arcium integration (encrypted state)
- [ ] Noir circuit implementation
- [ ] Solver service
- [ ] Frontend application
- [ ] Devnet deployment
- [ ] Security audit

## Contributing

Contributions welcome! See the main Veil repository for contribution guidelines.

## License

ISC

---

**Built for Solana PrivacyHack 2026**

*DarkFlow: Where your trades stay in the shadows.*

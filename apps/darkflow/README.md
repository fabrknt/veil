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
  amountA: BigInt(10_000_000_000), // 10 SOL
  amountB: BigInt(1_000_000_000),  // 1000 USDC
});

// On-chain: others only see a commitment hash
// Your actual amounts are encrypted
```

### 2. Dark Swaps with ZK Proofs

Planned: swaps verified with Noir ZK proofs (the current prover returns mock proofs). The proof would confirm:
- You have sufficient balance
- The swap parameters are valid
- Slippage constraints are met

Without revealing the actual amounts.

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
│           │   ├── pool.rs      # Dark pool state
│           │   ├── position.rs  # Encrypted LP positions
│           │   ├── order.rs     # Dark order state
│           │   └── launch.rs    # Confidential launch state
│           ├── instructions/    # Program instructions
│           │   ├── pool.rs      # Pool management
│           │   ├── liquidity.rs # LP operations
│           │   ├── swap.rs      # Dark swap execution
│           │   └── launch.rs    # Token launch
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

## Pool creation

Pools are created by the config admin only. The program upgrade authority runs `initialize_config(admin)` once (config PDA seed `"config"`); after that `initialize_pool` must be signed by that admin, who can hand the role over with `set_config_admin`.

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
- **Proofs**: not yet — proofs are mocked and not verified on-chain (see Status at the top)
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

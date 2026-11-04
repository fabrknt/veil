# Multi-Hackathon Submission

## Project: Veil

**Hackathons:**
- Solana PrivacyHack 2026 (Swap Router, RWA Secrets, DarkFlow)
- FairScale Hackathon 2026 (Umbra)
- Pump.fun Build In Public Hackathon 2026 (ShadowLaunch)

**Repository:** https://github.com/fabrknt/veil

> **Status (veil-core 2.0):** NaCl box encryption is real. The ZK compression (`compressData`) and shielded-transfer (Privacy Cash) calls in veil-core are **placeholders**: `compressData` returns the input unchanged with a zero-filled proof and root (and still sends a fee-paying Light transaction), and shielded deposits/withdrawals return a placeholder signature without moving funds. This document is the hackathon submission as written; where it describes compression or shielded transfers as working, read it as the plan.

---

## Philosophy

> **"MEV bots can't frontrun what they can't read."**

> **"Privacy is a privilege you earn through good behavior."**

> **"Not about hiding from regulators. It's about not exposing everything to everyone."**

Public blockchains created a paradox: systems designed for financial freedom became the most surveilled financial infrastructure in history. Every transaction is permanent. Every intention is broadcast. Every strategy is exposed.

**Veil addresses five consequences of this transparency:**

1. **MEV Extraction** — The Confidential Swap Router encrypts orders so MEV bots see only ciphertext.
2. **Business Confidentiality** — RWA Secrets Service implements selective disclosure for tokenized assets.
3. **Unfair Privacy Access** — Umbra gates privacy features by on-chain reputation.
4. **LP/Swap Visibility** — DarkFlow uses ZK proofs for hidden liquidity and dark swaps.
5. **Tracked Purchases** — ShadowLaunch breaks the link between wallets and Pump.fun buys.

Read our full philosophy: [PHILOSOPHY.md](./PHILOSOPHY.md)

---

## Overview

Veil is a collection of five privacy-preserving applications for Solana:

1. **Confidential Swap Router** - MEV-protected token swaps with encrypted order payloads
2. **RWA Secrets Service** - Encrypted metadata management for tokenized real-world assets
3. **Umbra** - Reputation-gated privacy DEX with SOVEREIGN identity integration
4. **DarkFlow** - Confidential AMM with dark liquidity pools and ZK swaps
5. **ShadowLaunch** - Privacy-first token purchases on Pump.fun

All applications share a common cryptographic library (`@fabrknt/veil-core`) that provides:
- NaCl box encryption (Curve25519-XSalsa20-Poly1305)
- Shamir's Secret Sharing for threshold decryption
- ZK compression via Light Protocol
- Shielded transfers via Privacy Cash SDK
- RPC provider configuration (Helius, Quicknode)

---

## Deployed Programs (Devnet)

| Program | Program ID | Explorer |
|---------|-----------|----------|
| Confidential Swap Router | `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM` | [View](https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet) |
| RWA Secrets Service | `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam` | [View](https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet) |
| Umbra Swap | `41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr` | [View](https://explorer.solana.com/address/41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr?cluster=devnet) |

---

## Bounty Eligibility

### Light Protocol (ZK Compression)
- **Integration:** ZK compression for encrypted order payloads and asset metadata
- **Files:** `packages/core/src/zk-compression.ts`
- **Apps:** All five applications
- **Benefits (planned):** on-chain storage reduction; `compressData` is a placeholder today

### Privacy Cash SDK (Shielded Transfers) - $15,000
- **Integration:** Shielded settlement for swap outputs
- **Files:** `packages/core/src/shielded.ts`
- **Apps:** Confidential Swap Router, DarkFlow, ShadowLaunch
- **Benefits:** Private token transfers with ZK proofs

### Helius RPC - $5,000
- **Integration:** RPC provider with ZK compression support
- **Files:** `packages/core/src/rpc-providers.ts`
- **Apps:** All five applications
- **Configuration:** `NEXT_PUBLIC_HELIUS_API_KEY` / `HELIUS_API_KEY`

### Quicknode RPC - $3,000
- **Integration:** RPC provider support
- **Files:** `packages/core/src/rpc-providers.ts`
- **Apps:** ShadowLaunch (primary), all others
- **Configuration:** `NEXT_PUBLIC_QUICKNODE_ENDPOINT` / `QUICKNODE_ENDPOINT`

### Arcium (Encrypted State) - $10,000
- **Integration:** Encrypted shared state for dark pools
- **Apps:** DarkFlow
- **Benefits:** Hidden LP positions and swap amounts

### Aztec/Noir (ZK Proofs) - $10,000
- **Integration:** Noir ZK circuits for swap validity
- **Apps:** DarkFlow
- **Benefits:** Privacy-preserving trade verification

### FairScale (Reputation)
- **Integration:** Reputation-gated trading fees and features
- **Apps:** Umbra
- **Benefits:** Tiered access based on on-chain behavior

---

## Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                         Veil                                              │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │ Confidential     │  │ RWA Secrets      │  │ Umbra            │  │ DarkFlow         │ │
│  │ Swap Router      │  │ Service          │  │ (Reputation DEX) │  │ (Dark AMM)       │ │
│  │                  │  │                  │  │                  │  │                  │ │
│  │ • MEV Protection │  │ • Encrypted Meta │  │ • SOVEREIGN ID   │  │ • Hidden LP      │ │
│  │ • Jupiter        │  │ • Access Control │  │ • Tiered Fees    │  │ • ZK Swaps       │ │
│  │ • Shielded       │  │ • Audit Logging  │  │ • Dark Pool      │  │ • Noir Proofs    │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                             ShadowLaunch                                          │   │
│  │               Privacy-first Pump.fun • Ephemeral Wallets • Shielded Transfers     │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                                  @fabrknt/veil-core                                     │   │
│  │  NaCl Box  •  Shamir's  •  ZK Compression  •  Shielded Transfers  •  SOVEREIGN    │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐   │
│  │                              RPC Providers                                        │   │
│  │            Helius (ZK support)  •  Quicknode  •  Custom  •  Light Protocol        │   │
│  └──────────────────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Confidential Swap Router

### Problem
Traditional DEX swaps expose order details in the mempool, enabling MEV extraction through frontrunning and sandwich attacks.

### Solution
Users encrypt order parameters using the solver's public key. Only the authorized solver can decrypt and execute orders via Jupiter aggregator.

### Key Features
- **MEV Protection:** Order details encrypted until execution
- **Jupiter Integration:** Real-time quotes and optimal routing
- **Non-custodial:** Users retain control; can cancel pending orders
- **ZK Compression (planned):** Light Protocol storage reduction; placeholder today
- **Shielded Settlement:** Private output delivery (Privacy Cash)

### Flow
```
1. User fetches solver's encryption pubkey via API
2. User encrypts swap order (amount, slippage, deadline)
3. Order submitted on-chain with input tokens locked
4. Solver decrypts and executes via Jupiter
5. User claims output tokens (optionally shielded)
```

---

## RWA Secrets Service

### Problem
Tokenized real-world assets require confidential metadata that should only be accessible to authorized parties.

### Solution
Asset metadata is encrypted on-chain with selective disclosure through encrypted key shares. Supports role-based access control.

### Key Features
- **End-to-End Encryption:** NaCl box encryption
- **Granular Access Control:** Four access levels
- **Access Delegation:** Optional delegation rights
- **Expiration Support:** Time-limited access grants
- **ZK Access Proofs:** Privacy-preserving verification
- **Compressed Storage (planned):** placeholder today

### Access Levels
| Level | Description |
|-------|-------------|
| ViewBasic | Basic asset information |
| ViewFull | Complete encrypted metadata |
| Auditor | Audit and compliance verification |
| Admin | Full access including transfers |

---

## Umbra - Reputation-Gated Privacy DEX

### Problem
Current privacy solutions treat all users equally, enabling sybil attacks and providing no incentive for legitimate on-chain behavior. Traders lose $500M+ annually to MEV.

### Solution
Umbra uses on-chain reputation (via SOVEREIGN protocol) to unlock execution quality tiers. Higher reputation = lower fees, better MEV protection, and dark pool access.

### Key Features
- **SOVEREIGN Integration:** Universal on-chain identity with multi-dimensional scores
- **Tiered Fees:** 0.05% - 0.50% based on reputation tier
- **MEV Protection Levels:** None to VIP routing based on tier
- **Dark Pool Access:** Platinum/Diamond tiers get confidential liquidity

### Tier Benefits
| Tier | Fee Discount | MEV Protection | Dark Pool |
|------|--------------|----------------|-----------|
| Bronze (1) | 0% | None | No |
| Silver (2) | 5% | Basic | No |
| Gold (3) | 15% | Full | No |
| Platinum (4) | 30% | Priority | Yes |
| Diamond (5) | 50% | VIP | Yes |

---

## DarkFlow - Confidential AMM

### Problem
Traditional AMMs expose LP positions and swap amounts, enabling whale watchers to target users and MEV bots to sandwich attack every trade.

### Solution
DarkFlow brings institutional-grade dark pool mechanics to DeFi with encrypted LP positions and ZK-verified swaps using Arcium and Noir.

### Key Features
- **Hidden LP Positions:** Encrypted using NaCl box
- **Dark Swaps:** ZK proofs verify validity without revealing amounts
- **Confidential Token Launches:** Private bonding curves prevent front-running
- **Noir Circuits:** Zero-knowledge proof generation at `apps/darkflow/circuits/` (swap, execution, and position proofs)
- **Arcium MPC:** Encrypted shared state via `@fabrknt/veil-core` arcium module

### Privacy Model
| Data | Visibility |
|------|------------|
| Pool existence | Public |
| Your LP amounts | Encrypted (only you) |
| Swap amounts | ZK verified, never revealed |
| Total volume | Public (aggregate) |

---

## ShadowLaunch - Privacy-First Pump.fun

### Problem
Pump.fun purchases are fully transparent. Whale watchers track your accumulation, MEV bots front-run your trades, and your wallet becomes a target.

### Solution
ShadowLaunch breaks the on-chain link between your wallet and your purchases using ephemeral wallets and shielded transfers.

### Key Features
- **Shadow Mode:** Toggle between standard and private purchases
- **Ephemeral Wallets:** Fresh keys for each purchase, no history
- **Shielded Transfers:** Funds route through privacy pool
- **Token Browser:** Real-time Pump.fun bonding curve data

### Flow
```
Main Wallet → Privacy Pool → Ephemeral Wallet → Pump.fun Purchase
                  ↓
          Link broken here
```

---

## EVM Swap Router (Proof-of-Concept)

The `@fabrknt/veil-evm-swap-router` package demonstrates chain-agnostic encryption by reusing the same `@fabrknt/veil-orders` library on Ethereum. This proves Veil's order encryption and serialization works across both Solana and EVM chains, opening a path toward multi-chain confidential trading.

---

## MCP Server for AI Agent Integration

The `@fabrknt/veil-mcp-server` package exposes Veil's privacy tools through the Model Context Protocol, enabling AI agents to submit encrypted orders, manage shielded transfers, and interact with DarkFlow pools programmatically.

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (10.31.0+)
- Solana CLI 1.18+

### Installation
```bash
git clone https://github.com/fabrknt/veil.git
cd veil
pnpm install
```

### Configuration
```bash
# Copy environment files
cp apps/confidential-swap-router/app/.env.example apps/confidential-swap-router/app/.env.local
cp apps/confidential-swap-router/solver/.env.example apps/confidential-swap-router/solver/.env
cp apps/rwa-secrets-service/app/.env.example apps/rwa-secrets-service/app/.env.local

# Add your Helius API key (recommended) or Quicknode endpoint
```

### Run Confidential Swap Router
```bash
# Terminal 1: Start solver
cd apps/confidential-swap-router/solver
pnpm dev

# Terminal 2: Start frontend
cd apps/confidential-swap-router/app
pnpm dev
```
Open http://localhost:3000

### Run RWA Secrets Service
```bash
cd apps/rwa-secrets-service/app
pnpm dev
```
Open http://localhost:3001

### Verify Deployment
```bash
npx ts-node --esm scripts/verify-deployment.ts
```

---

## Code Examples

### Encrypt Swap Order
```typescript
import { createEncryptedOrder, generateEncryptionKeypair } from '@fabrknt/veil-confidential-swap-sdk';

const userKeypair = generateEncryptionKeypair();
const encrypted = createEncryptedOrder(
  { minOutputAmount: 1000000n, slippageBps: 50, deadline: Date.now() + 3600000 },
  solverPublicKey,
  userKeypair
);
```

### Encrypt RWA Metadata
```typescript
import { encryptAssetMetadata, generateEncryptionKeypair } from '@fabrknt/veil-rwa-secrets-sdk';

const keypair = generateEncryptionKeypair();
const encrypted = encryptAssetMetadata({
  valuationUsdCents: 100000000n,
  jurisdictionCode: 'US',
  additionalInfo: JSON.stringify({ name: 'Office Building' })
}, keypair);
```

### ZK Compression
> veil-core 2.0: Solana parts moved off the root entry. `compressData` is currently a
> placeholder: it returns the input unchanged with a zero-filled proof and root, but it still
> sends a signed Light `compress` transaction from `payer`, so it costs a fee. See the root README.
```typescript
import { createHeliusRpc } from '@fabrknt/veil-core/solana/rpc-providers';
import { compressData } from '@fabrknt/veil-core/solana/zk-compression';

const { zkRpc } = createHeliusRpc('YOUR_HELIUS_API_KEY', 'devnet');
const compressed = await compressData(zkRpc, data, payer); // placeholder in 2.0
```

### Shielded Transfer
```typescript
import { PrivacyCashClient } from '@fabrknt/veil-core/solana/shielded'; // 2.0 path; shielded is a stub

const client = new PrivacyCashClient({ rpcUrl: 'https://api.devnet.solana.com', network: 'devnet' });
await client.initialize(wallet);
await client.deposit(1000000n);  // Shield tokens
await client.withdraw(500000n, recipient);  // Unshield
```

---

## Project Structure

```
veil/
├── packages/
│   ├── core/                       # Shared encryption library (@fabrknt/veil-core)
│   │   └── src/
│   │       ├── nacl-box.ts        # NaCl box encryption
│   │       ├── threshold.ts       # Shamir's Secret Sharing
│   │       ├── zk-compression.ts  # Light Protocol integration
│   │       ├── shielded.ts        # Privacy Cash integration
│   │       ├── rpc-providers.ts   # Helius/Quicknode config
│   │       └── arcium/            # Arcium MPC integration
│   ├── orders/                    # Order encryption/serialization (@fabrknt/veil-orders)
│   ├── browser/                   # Browser-friendly VeilClient wrapper (@fabrknt/veil-browser)
│   ├── mcp-server/                # MCP server for AI agent integration (@fabrknt/veil-mcp-server)
│   ├── qn-addon/                  # QuickNode marketplace add-on (@fabrknt/veil-qn-addon)
│   └── evm-swap-router/           # EVM proof-of-concept swap router (@fabrknt/veil-evm-swap-router)
├── apps/
│   ├── confidential-swap-router/   # MEV-protected swaps
│   │   ├── programs/              # Anchor program
│   │   ├── sdk/                   # TypeScript SDK
│   │   ├── solver/                # Jupiter solver + API
│   │   └── app/                   # Next.js frontend
│   ├── rwa-secrets-service/        # Encrypted RWA metadata
│   │   ├── programs/              # Anchor program
│   │   ├── sdk/                   # TypeScript SDK
│   │   └── app/                   # Next.js frontend
│   ├── umbra/                      # Reputation-gated DEX
│   │   ├── programs/umbra-swap/   # Anchor program + SOVEREIGN
│   │   ├── sdk/                   # TypeScript SDK
│   │   ├── solver/                # Order execution
│   │   └── app/                   # Next.js frontend
│   ├── darkflow/                   # Confidential AMM
│   │   ├── programs/darkflow/     # Anchor program
│   │   ├── circuits/              # Noir ZK circuits (swap, execution, position proofs)
│   │   ├── sdk/                   # TypeScript SDK
│   │   └── app/                   # Next.js frontend
│   └── shadowlaunch/               # Private Pump.fun purchases
│       └── src/
│           ├── app/               # Next.js App Router
│           ├── components/        # UI components
│           └── lib/               # Shadow purchase logic
├── scripts/                       # Test scripts
└── SUBMISSION.md                  # This file
```

---

## Testing

All tests pass on devnet:

```
✓ Network Connectivity
✓ Wallet Configuration
✓ Confidential Swap Router Program (deployed & executable)
✓ RWA Secrets Service Program (deployed & executable)
✓ Umbra Swap Program (deployed & executable)
✓ Swap Router PDA Derivation
✓ RWA Secrets PDA Derivation
✓ Umbra PDA Derivation
✓ Encryption Functions
✓ Threshold Secret Sharing
✓ SOVEREIGN Integration
```

Run tests:
```bash
npx ts-node --esm scripts/verify-deployment.ts
```

---

## Security Considerations

- **Key Management:** Dedicated encryption keypairs recommended for production
- **Solver Trust:** Users must trust solver operators to execute orders fairly
- **Access Expiration:** Always set reasonable expiration times for access grants
- **HSM Support:** Consider hardware security modules for key storage

---

## Tech Stack

- **Blockchain:** Solana (primary), Ethereum (EVM proof-of-concept)
- **Smart Contracts:** Anchor 0.30
- **Frontend:** Next.js 14, React 18, TailwindCSS
- **Encryption:** TweetNaCl (NaCl box)
- **ZK Compression:** Light Protocol
- **ZK Proofs:** Noir circuits (`apps/darkflow/circuits/`)
- **Shielded Transfers:** Privacy Cash SDK
- **DEX Aggregation:** Jupiter API
- **RPC Providers:** Helius, Quicknode
- **Reputation:** SOVEREIGN Protocol
- **Dark Pools:** Arcium MPC (encrypted state via `@fabrknt/veil-core` arcium module)
- **Monorepo:** pnpm + Turbo
- **AI Integration:** MCP server (`@fabrknt/veil-mcp-server`)
- **Cross-Chain:** EVM swap router (`@fabrknt/veil-evm-swap-router`) using shared `@fabrknt/veil-orders`

---

## Philosophy

We believe financial privacy is a fundamental human right—as essential as freedom of speech and assembly.

> "Privacy is not about having something to hide. Privacy is about having something to protect."

Read our full philosophical background: [PHILOSOPHY.md](./PHILOSOPHY.md)

**Key principles:**
- Privacy by default
- User sovereignty over data
- Selective disclosure for compliance
- Open source for trust through verification

---

## Team

**psyto** - Solo developer

---

## Links

- **GitHub:** https://github.com/fabrknt/veil
- **Swap Router Program:** https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet
- **RWA Secrets Program:** https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet
- **Umbra Swap Program:** https://explorer.solana.com/address/41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr?cluster=devnet

---

## Acknowledgments

- [Light Protocol](https://lightprotocol.com/) - ZK compression
- [Privacy Cash](https://privacycash.io/) - Shielded transfers
- [Jupiter](https://jup.ag/) - DEX aggregation
- [Helius](https://helius.dev/) - RPC infrastructure
- [Quicknode](https://www.quicknode.com/) - RPC infrastructure
- [Anchor](https://www.anchor-lang.com/) - Solana framework
- [SOVEREIGN Protocol](https://github.com/fabrknt/sovereign) - On-chain identity
- [Arcium](https://arcium.com/) - Encrypted state
- [Noir](https://noir-lang.org/) - ZK proofs
- [Pump.fun](https://pump.fun) - Token launches

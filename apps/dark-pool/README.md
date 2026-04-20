# Veil Dark Pool — Shielded Perp Execution on Solana

> **Built for the [Solana Frontier Hackathon](https://www.colosseum.org/frontier) (Apr 6 – May 11, 2026)**

First dark pool for Solana perpetual futures. Encrypt your order. Submit a commitment hash on-chain. The solver matches privately and settles on Drift or Jupiter Perps. No one sees your side, price, or size until after execution.

**Program ID:** [`FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA`](https://explorer.solana.com/address/FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA?cluster=devnet)
**Live on:** Solana Devnet
**GitHub:** [github.com/fabrknt/veil/apps/dark-pool](https://github.com/fabrknt/veil/tree/main/apps/dark-pool)

---

## How It Works

```
Trader encrypts perp order (NaCl box)
  → Submits commitment hash + USDC collateral on-chain
    → Solver decrypts privately, feeds into matching engine
      → Match found: reveal_match creates DarkTradeRecord on-chain
        → settle_trade executes on Drift/Jupiter Perps, returns collateral
          → No match? Order expires, collateral returned automatically
```

### What's Hidden vs Visible

| Data | On-chain | Solver |
|------|----------|--------|
| Order side (long/short) | Hidden | Visible |
| Price | Hidden | Visible |
| Quantity | Hidden | Visible |
| Trader identity | Visible | Visible |
| Collateral amount | Visible | Visible |
| Match existence | Visible (DarkTradeRecord) | Visible |

**Trust assumption (v0):** Solver won't front-run or leak orders. Mitigated by: commitment hash prevents modification, on-chain audit trail, solver has no capital at risk. Future: TEE (v1), ZK proofs (v2).

## Architecture

```
+---------------------------+     +------------------------+
| Anchor Program            |     | Off-chain Solver        |
| (veil-dark-pool)          |<--->| (TypeScript keeper)     |
|                           |     |                        |
| - DarkPoolConfig          |     | - Decrypt (veil-core)  |
| - PerpOrderCommitment     |     | - PerpMatcher          |
| - DarkTradeRecord         |     | - DriftSettlement      |
+---------------------------+     | - JupiterPerpsSettlement|
                                  +------------------------+
```

### On-chain Program (6 instructions)

| Instruction | Signer | What it does |
|---|---|---|
| `initialize` | Admin | Create config, set solver pubkey, fees |
| `submit_perp_order` | Trader | Deposit USDC collateral + commitment hash |
| `cancel_order` | Trader | Return collateral (only if Pending) |
| `reveal_match` | Solver | Verify commitment hashes, create DarkTradeRecord |
| `settle_trade` | Solver | Record venue tx sig, return collateral with fees |
| `expire_order` | Anyone | Return collateral after TTL (permissionless) |

### Off-chain Solver

- **PerpMatcher**: Price-time priority crossing engine with per-market order books
- **DriftSettlement**: `DriftClient.placePerpOrder()` with LIMIT + MUST_POST_ONLY
- **JupiterPerpsSettlement**: `program.methods.createIncreasePositionMarketRequest()`
- **PhoenixSettlement**: `Phoenix.Client` swap orders on spot CLOB (for DN spot leg)
- **API**: `/solver-pubkey`, `/orders/:id/status`, `/markets`, `/health`

### Encryption (from @fabrknt/veil-orders)

- **PERP_ORDER_SCHEMA** (26 bytes): side + orderType + price + quantity + slippage + marketId + padding
- NaCl box (Curve25519-XSalsa20-Poly1305)
- SHA-256 commitment hash verified on-chain in `reveal_match`

## Running the Demo

### Local Validator

```bash
# 1. Build the program
cargo build-sbf

# 2. Start local validator with program
solana-test-validator \
  --bpf-program FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA \
  target/deploy/veil_dark_pool.so \
  --reset

# 3. Run end-to-end demo
npx ts-node scripts/demo.ts
```

### Devnet

```bash
# Run against devnet (uses your ~/.config/solana/id.json to fund test accounts)
RPC_URL=https://api.devnet.solana.com npx ts-node scripts/demo.ts
```

### Demo Output

```
[1/6] Initializing dark pool...
[2/6] Encrypting perp orders...
       Trader A: LONG SOL-PERP @ $150, qty=10
       Trader B: SHORT SOL-PERP @ $149, qty=10
[3/6] Submitting commitments on-chain...
[4/6] Solver decrypting orders...
       MATCH FOUND! Exec price: 150000000, Fill qty: 10000000
[5/6] Calling reveal_match on-chain...
       DarkTradeRecord created
[6/6] Calling settle_trade on-chain...
       Collateral returned, venue tx sig recorded
```

## Project Structure

```
apps/dark-pool/
  programs/
    veil-dark-pool/
      src/
        lib.rs                    # 6 Anchor instructions
        state/                    # DarkPoolConfig, PerpOrderCommitment, DarkTradeRecord
        instructions/             # initialize, submit, cancel, reveal, settle, expire
        error.rs                  # DarkPoolError enum

  solver/
    src/
      index.ts                   # Solver main loop (poll → decrypt → match → settle)
      matcher.ts                 # Price-time priority matching engine
      api.ts                     # REST API
      settlement/
        drift.ts                 # Drift SDK settlement
        jupiter-perps.ts         # Jupiter Perps settlement
        phoenix.ts               # Phoenix spot CLOB settlement

  sdk/src/index.ts               # Re-exports from @fabrknt/veil-orders
  scripts/demo.ts                # End-to-end demo script
  tests/
    matcher.test.ts              # 8 matching engine tests
    encryption.test.ts           # 10 encryption round-trip tests
  docs/
    HACKATHON-SUBMISSION.md      # Colosseum submission form
    HACKATHON-UPDATES.md         # Weekly updates + demo/pitch video scripts
    SUBMISSION-DESCRIPTIONS.md   # Alternate description variants
```

## Built On

This isn't built from scratch. Veil Dark Pool composes existing production infrastructure:

| Component | Source | Status |
|---|---|---|
| NaCl encryption | `@fabrknt/veil-core` | npm published |
| Perp order schema | `@fabrknt/veil-orders` | npm published |
| Commitment verification | `confidential-swap-router` | Deployed on devnet |
| Drift execution patterns | Yogi vault | Live on Drift mainnet |
| Jupiter Perps patterns | Nanuk vault | Production-tested |
| Phoenix execution | Syntx vault | Production-tested |

## Markets Supported

| ID | Market | Venues |
|----|--------|--------|
| 0 | SOL-PERP | Drift, Jupiter Perps, Phoenix (spot leg) |
| 1 | BTC-PERP | Drift, Jupiter Perps |
| 2 | ETH-PERP | Drift, Jupiter Perps |

## Roadmap

- **v0 (now)**: Commit-reveal with trusted solver. Deployed on devnet.
- **v1**: TEE (AWS Nitro Enclaves) — solver code runs in attestable enclave, no one reads decrypted orders
- **v2**: ZK proofs — trustless matching, commitment verification without revealing order details
- **v3**: Multi-venue fallback routing — unmatched orders forwarded to public books

## Why This Matters

In TradFi, dark pools handle 30-50% of institutional equity volume. On-chain perps ($7T/month) have zero equivalent. Every trade is visible, front-runnable, and copyable.

Silhouette raised $3M to solve this on Hyperliquid. Nothing exists on Solana — the largest composable smart contract platform. Veil Dark Pool is the first.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Program | Anchor 0.30.1, Rust |
| Encryption | NaCl box (Curve25519-XSalsa20-Poly1305) |
| Commitment | SHA-256 |
| Matching | Price-time priority (TypeScript) |
| Settlement | Drift SDK, Jupiter Perps (Anchor IDL), Phoenix SDK |
| Solver API | Express.js |

---

Built by [@psyto](https://x.com/psyto) · [Fabrknt](https://fabrknt.com)

# Veil Dark Pool — Solana Frontier Hackathon Updates

## Weekly Progress Videos

### Week 1: Venue Adapter Pattern (as Syntx)
- VenueAdapter interface (6 methods any DEX implements)
- PercolatorAdapter (slab parsing, oracle, crank, trade)
- Venue-agnostic keeper loop
- Factory pattern: VENUE=percolator|phoenix

### Week 2: Phoenix + Jupiter + Router + Frontend + Security (as Syntx)
- PhoenixAdapter (Phoenix V1 spot SDK, CLOB architecture)
- JupiterPerpsAdapter (oracle-based AMM, SOL/BTC/ETH markets)
- VenueRouter (multi-venue scoring and routing)
- 3 venue architectures covered: slab-based, CLOB, oracle-based AMM
- Frontend reframed: "Composable Exchange-Agnostic Vaults"
- Vault UX: named vaults, Max button, dollar withdraw, toasts
- 2 live vaults on devnet
- SDK completed (buildDepositTx, buildWithdrawTx)
- 48h timelock on manager transfer (propose → wait → execute)
- Immutable circuit breaker floor (min_drawdown_bps)
- 29 tests passing
- SDK + keeper abi synced with all 15 on-chain instructions
- Mobile-responsive verified (iPhone, iPad, desktop)
- README rewrite + business plan
- CPI examples + venue adapter skeleton
- Full end-to-end working: faucet → create vault → deposit → withdraw

### Week 3: Pivot to Veil Dark Pool

**Why we pivoted:** After mentor feedback and user conversations, the core insight was clear — "another perp DEX" competes with Drift, Jupiter, and Phoenix head-on. Mentors pointed out that the VenueAdapter infrastructure was the real value, but wrapping it as a standalone exchange created a double-risk problem (vault risk + DEX risk) with no clear edge over established venues.

Users told us the same thing differently: "Why would I use this instead of Drift?" There was no good answer.

The pivot: take the privacy primitives we already had (Veil — recognized by QuickNode, 6 published apps, chain-agnostic encryption on npm) and build the product the ecosystem actually needs — **a dark pool for Solana perps**. No one has built this. Silhouette does it on Hyperliquid. Nothing exists on Solana.

Syntx's VenueAdapter infrastructure lives on as the settlement layer inside Veil Dark Pool. Nothing was wasted.

**What we built this week:**
- PERP_ORDER_SCHEMA added to @fabrknt/veil-core (28-byte encrypted layout)
- Perp order encrypt/decrypt/hash functions added to @fabrknt/veil-orders
- New Anchor program (veil-dark-pool): 6 instructions, 3 state accounts
  - `submit_perp_order`: deposit USDC collateral + SHA-256 commitment hash
  - `reveal_match`: verify both commitment hashes, create DarkTradeRecord
  - `settle_trade`: record venue tx signature, return collateral with fees
  - `cancel_order`, `expire_order`: collateral recovery paths
- Off-chain solver: poll → decrypt → match → settle loop (adapted from Veil's confidential-swap-router)
- PerpMatcher: price-time priority matching engine with per-market order books
- Settlement adapters for Drift and Jupiter Perps (from Yogi and Nanuk patterns)
- 18 unit tests (8 matching engine + 10 encryption round-trip)
- Program compiles cleanly (`cargo check` passes)

---

## Demo Video Script (2-3 min, for final submission)

### Section 1: The Problem (20s)

"Every perp trade on Solana is visible the moment it hits the chain. Bots see your order, front-run it, sandwich it, copy your strategy. Institutional traders won't touch DeFi perps because of this. In TradFi, dark pools handle 30-50% of institutional equity flow for exactly this reason."

### Section 2: What Veil Dark Pool Does (30s)

"Encrypt your perp order. Submit a commitment hash on-chain. The solver decrypts privately, matches you against other dark pool orders at the best price, and settles on Drift or Jupiter Perps. No one sees your side, price, or size until after execution."

"If no match is found, your order falls back to the public book. You get dark pool privacy when available, full Solana liquidity as backup. Collateral is returned automatically either way."

### Section 3: Live Demo (60s)

*(Screen recording of end-to-end flow)*

1. Generate encryption keypair (veil-core)
2. Encrypt a long SOL-PERP order — show the encrypted payload (unreadable)
3. Submit commitment on-chain — show USDC collateral locked, commitment hash stored
4. Second trader encrypts a short SOL-PERP order, submits commitment
5. Solver decrypts both, matching engine finds a cross
6. `reveal_match` on-chain — DarkTradeRecord created, both commitments marked Matched
7. Settlement on Drift devnet
8. `settle_trade` — collateral returned, venue tx signature recorded on-chain
9. Query DarkTradeRecord — proof of private execution visible on Explorer

### Section 4: Why This Matters (30s)

"This is built on Veil's production privacy infrastructure — NaCl box encryption, commitment verification, threshold decryption. The same primitives are published on npm and used across 6 existing Veil apps."

"We're not starting from zero. We're shipping the flagship product on top of infrastructure that's already proven."

### Section 5: Close (20s)

"No dark pool exists for Solana perps. Silhouette built one for Hyperliquid and raised $3M. We built the Solana equivalent in one week — because we already had the privacy infrastructure."

"Veil Dark Pool — shielded perp execution on Solana. First of its kind."

---

## Pitch Video Script (3 min, for final submission)

### The Problem (30s)

"Every large perp trade on Solana loses money before it even fills. Your order is visible on-chain. MEV bots front-run it. Market makers fade your quote. Competitors copy your strategy by watching your wallet."

"In traditional finance, dark pools exist precisely for this reason — they handle 30 to 50 percent of all institutional equity volume. On-chain perps have no equivalent. Until now."

### What Veil Dark Pool Does (30s)

"Encrypt your order with NaCl box cryptography. Submit a commitment hash on-chain with USDC collateral. Our solver decrypts privately, matches you against other dark pool orders at the best crossing price, and settles on Drift or Jupiter Perps."

"No one — not bots, not other traders, not even the block producer — sees your side, price, or size before execution. After settlement, the match is recorded on-chain as an auditable DarkTradeRecord."

### Why We Can Build This (30s)

"This isn't our first privacy product. Veil is a privacy infrastructure suite published on npm, with 6 existing Solana apps — confidential swaps, dark AMM, reputation-gated DEX, private token launches."

"We also run production vaults — Yogi on Drift mainnet, Kodiak on Hyperliquid mainnet. We know perps infrastructure. The dark pool combines both: privacy primitives plus perps execution."

### The Pivot Story (20s)

"We started this hackathon building Syntx — a cross-venue perp DEX. Mentor feedback was direct: you're competing with Drift and Jupiter, and you have no edge. But they loved the privacy angle."

"So we pivoted. Took our proven Veil encryption stack, added a perp order schema and matching engine, and built the first dark pool for Solana perps. In one week."

### Market Opportunity (20s)

"Silhouette raised three million dollars to build a dark pool on Hyperliquid. Nothing equivalent exists on Solana — the largest composable smart contract platform. Dark pools are a proven business model in TradFi. We're bringing it on-chain."

### What We Built (15s)

"Anchor program with 6 instructions. Price-time priority matching engine. Settlement adapters for Drift and Jupiter Perps. NaCl encryption with on-chain commitment verification. 18 tests. Program compiles. Built on production infrastructure."

### The Ask (15s)

"We need an audit to unlock mainnet — and TEE integration for Phase 2 to remove the trusted relayer assumption. Colosseum backs novel DeFi primitives. This is the first dark pool for Solana perps."

### Close (10s)

"Dark pools handle half of institutional equity volume for a reason. Solana perps deserve the same infrastructure. Veil Dark Pool — shielded execution, first of its kind."

# Hackathon Submission Descriptions

Updated for Solana Frontier Hackathon (Apr 6 – May 11, 2026).

---

## Brief description (500 chars)

Veil Dark Pool — First Shielded Perp Execution on Solana

Encrypt your perp order. Submit a commitment hash on-chain. The solver decrypts privately, matches you against other dark pool orders, and settles on Drift or Jupiter Perps. No one sees your side, price, or size until after execution. Unmatched orders fall back to public books. Built on Veil's production privacy infrastructure (6 apps, npm packages). Dark pools handle 30-50% of TradFi equity flow. Solana perps had none.

(498 chars)

---

## What are you building, and who is it for? (1000 chars)

Veil Dark Pool is a shielded execution layer for Solana perp DEXs — the first dark pool for on-chain perpetual futures.

Traders encrypt orders with NaCl box cryptography. A SHA-256 commitment hash goes on-chain with USDC collateral. The solver matches orders privately using a price-time priority engine and settles on Drift or Jupiter Perps. Unmatched orders fall back to public books after TTL — dark pool privacy when available, full Solana liquidity as backup.

In TradFi, dark pools handle 30-50% of institutional equity flow. On-chain perps have zero equivalent. Silhouette raised $3M for this on Hyperliquid. Nothing exists on Solana.

Built on Veil's production privacy infrastructure — NaCl encryption, commitment verification, threshold decryption — published on npm, powering 6 existing apps. Settlement uses battle-tested patterns from our live perp vaults (Yogi on Drift, Kodiak on Hyperliquid).

Built for: perp traders losing to MEV, vault operators hiding rebalance intent, and institutions needing execution privacy before entering DeFi.

(998 chars)

---

## Why did you decide to build this, and why build it now? (1000 chars)

We started this hackathon building a cross-venue perp DEX. Mentor feedback was direct: competing with Drift and Jupiter head-on provides no edge. Users asked "why would I use this instead of Drift?" — no good answer.

But we had something no one else on Solana had: production privacy infrastructure. Veil — NaCl encryption, commitment verification, confidential swap router — published on npm, recognized by QuickNode, 6 working apps. And we run live perp vaults (Yogi on Drift mainnet, Kodiak on Hyperliquid mainnet).

The pivot was obvious: the ecosystem needs execution privacy, not another DEX. Silhouette proved dark pools work on Hyperliquid ($3M raised). Nothing equivalent exists on Solana — the largest composable smart contract platform.

Why now: Solana has multiple mature perp venues. The liquidity is there. The privacy layer is missing. We already built the primitives — it took one week to compose them into a dark pool. The timing is right: institutional DeFi adoption is blocked by execution quality. Dark pools unlock it.

(993 chars)

---

## What technologies are you using?

Anchor (0.30.1), NaCl box (Curve25519-XSalsa20-Poly1305), SHA-256 commitment verification, @fabrknt/veil-core, @fabrknt/veil-orders, Drift SDK, Jupiter Perps (Anchor IDL), Solana Web3.js, SPL Token, Express.js, TypeScript, Claude Code (Opus 4.6), Cargo-build-sbf

---

## Access instructions

1. Clone the repo: `git clone https://github.com/fabrknt/veil.git`
2. Navigate to dark pool: `cd veil/apps/dark-pool`
3. Build the Anchor program: `anchor build`
4. Run tests: `cargo check --lib` (program compilation)
5. Run TypeScript tests: `pnpm test:solver` (matching engine + encryption tests)
6. Start the solver: `cd solver && npx ts-node src/index.ts`
7. API endpoints: `GET /solver-pubkey`, `GET /health`, `GET /markets`

---

## Important GitHub repo context (500 chars)

Veil is a privacy infrastructure monorepo. The dark pool is at apps/dark-pool/. Key components: Anchor program (6 instructions, 3 state accounts), off-chain solver (matcher + settlement adapters), and SDK wrapping @fabrknt/veil-orders for perp order encryption.

The encryption primitives (@fabrknt/veil-core, @fabrknt/veil-orders) are production packages — published on npm, shared across 6 other Veil apps (confidential swaps, dark AMM, etc).

(489 chars)

---

## Anything else judges should know? (500 chars)

We pivoted mid-hackathon from Syntx (cross-venue perp DEX) to Veil Dark Pool based on mentor feedback. The VenueAdapter infrastructure became the settlement layer — nothing was wasted. The pivot was validated: dark pools are proven in TradFi with no Solana equivalent.

This isn't our first product. Yogi runs on Drift mainnet. Kodiak runs on Hyperliquid mainnet. We combined production perps + production privacy into one novel product.

(487 chars)

---

## How do you know people need this? (1000 chars)

Three signals:

First, dark pools are a proven $7T+ market in TradFi. They handle 30-50% of institutional equity volume because large orders need execution privacy. The on-chain perp market ($7T/month) has zero equivalent infrastructure.

Second, Silhouette validated the model on Hyperliquid — raising $3M pre-seed for a "shield exchange" that hides order flow. Their approach works but is limited to one chain. Solana's composability makes the dark pool strictly more powerful — settle on any DEX via CPI.

Third, we needed it ourselves. Running Yogi on Drift and Kodiak on Hyperliquid, every large rebalance gets worse execution from visible order flow. Vault operators are the first customers — they need to hide rebalance intent from MEV bots and strategy copiers.

Market timing: institutional DeFi adoption is blocked by execution quality. Dark pools are table stakes for institutional flow in TradFi. The first credible dark pool on Solana unlocks a category of capital that currently won't participate.

(993 chars)

---

## How far along are you? (1000 chars)

Week 3 of hackathon. Pivoted from Syntx to Veil Dark Pool based on mentor feedback.

On-chain program (Anchor):
- 6 instructions: initialize, submit_perp_order, cancel_order, reveal_match, settle_trade, expire_order
- 3 state accounts: DarkPoolConfig, PerpOrderCommitment, DarkTradeRecord
- SHA-256 commitment verification (PERP_ORDER_SCHEMA, 28 bytes)
- Program compiles cleanly

Off-chain solver:
- Poll → decrypt → match → settle loop
- PerpMatcher: price-time priority crossing with per-market books
- Settlement adapters for Drift and Jupiter Perps
- REST API: /solver-pubkey, /orders, /markets, /health

Packages extended:
- @fabrknt/veil-core: PERP_ORDER_SCHEMA
- @fabrknt/veil-orders: perp encrypt/decrypt/hash

Tests: 18 unit tests (matching engine + encryption)

Foundation: Veil privacy infrastructure (npm published, 6 apps). Yogi + Kodiak live on mainnet. Confidential-swap-router deployed on devnet. 6 privacy apps in the monorepo.

Next: devnet deployment, end-to-end demo, demo video.

(978 chars)

---

## Who else is building in this space? (1000 chars)

Silhouette (Hyperliquid, $3M raised): Dark pool using TEEs. Good approach, but locked to Hyperliquid — single venue, no smart contract composability, can't settle across multiple DEXs or integrate with Solana DeFi.

Jito (Solana MEV): Protects at the validator level (bundles, tips). Doesn't hide order intent — reorders transactions but traders still leak strategy through visible order flow.

Umbra (Solana): Privacy for transfers and wallets — stealth addresses, shielded deposits. Hides who you are, not what you're trading. Complementary, not competitive.

Flashbots Protect (Ethereum): Private transaction submission to skip public mempool. Spot-focused, no perps, no matching engine, no dark pool crossing.

What they all get wrong: protecting at the wrong layer (validator not application), the wrong asset class (spot not perps), or the wrong chain (Ethereum/Hyperliquid not Solana). Veil Dark Pool is application-layer privacy for perps on Solana — the intersection no one occupies.

(985 chars)

---

## How do you make money? (500 chars)

Dark pool matching fees: basis points on every matched trade. Volume-based revenue — more orders mean better matching, which attracts more orders.

Unmatched order routing fees: when orders fall back to public books, charge for routing.

Premium tiers: threshold-encrypted orders (M-of-N solver cooperation) for institutional users needing distributed trust.

Long-term: TEE attestation fees and API access for vault operators. Value accrues to the privacy layer above exchanges.

(471 chars)

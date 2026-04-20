# Veil Dark Pool — Colosseum Hackathon Submission Form

> Last updated: 2026-04-18
> Character limits noted per field. Keep within limits when editing.

---

## Project name (public)

Veil Dark Pool

## Brief description (500 char, public)

Veil Dark Pool — First Shielded Perp Execution on Solana

Encrypt your perp order. Submit a commitment hash on-chain. The solver decrypts privately, matches you against other dark pool orders, and settles on Drift or Jupiter Perps. No one sees your side, price, or size until after execution. Unmatched orders fall back to public books — dark pool privacy when available, full Solana liquidity as backup. Built on Veil's production privacy infrastructure (6 apps, npm packages).

(498 chars)

## Project website (public)

https://fabrknt.com/veil

## What are you building, and who is it for? (1000 char)

Veil Dark Pool is a shielded execution layer for Solana perp DEXs — the first dark pool for on-chain perpetual futures. Traders encrypt orders with NaCl box cryptography (Curve25519-XSalsa20-Poly1305), submit a SHA-256 commitment hash on-chain with USDC collateral, and the solver matches orders privately off-chain using a price-time priority engine. Matched trades settle on Drift or Jupiter Perps. Unmatched orders fall back to public order books after TTL.

In TradFi, dark pools handle 30-50% of institutional equity flow. On-chain perps have no equivalent — every trade is visible, front-runnable, and copyable. Silhouette raised $3M to solve this on Hyperliquid. Nothing exists on Solana.

Built on Veil's production privacy infrastructure: NaCl encryption, commitment verification, and threshold decryption — published on npm, powering 6 existing Solana privacy apps.

Built for: perp traders losing to MEV, vault operators hiding rebalance intent, and institutional players who need execution privacy before entering DeFi.

(996 chars)

## Why did you decide to build this, and why build it now? (1000 char)

We started this hackathon building Syntx — a cross-venue perp DEX. Mentor feedback was direct: competing with Drift, Jupiter, and Phoenix head-on provides no clear edge. Users asked "why would I use this instead of Drift?" and we had no good answer.

But we had something no one else on Solana had: production privacy infrastructure. Veil — NaCl encryption, commitment verification, confidential swap router — published on npm, recognized by QuickNode, 6 working apps. And we run live perp vaults (Yogi on Drift, Kodiak on Hyperliquid), so we understand the execution stack.

The pivot was obvious: build the product the ecosystem actually needs. Silhouette proved dark pools work on Hyperliquid ($3M raised). Nothing equivalent exists on Solana — the largest composable smart contract platform. Every perp trade on Solana gets worse execution from MEV frontrunning and strategy copying.

Why now: Solana has multiple mature perp venues (Drift, Jupiter Perps, Phoenix). The liquidity is there. The privacy infrastructure is missing. We already built it.

(995 chars)

## What technologies are you using or integrating with?

Anchor (0.30.1), NaCl box (Curve25519-XSalsa20-Poly1305), SHA-256 commitment verification, @fabrknt/veil-core, @fabrknt/veil-orders, Drift SDK, Jupiter Perps (Anchor IDL), Solana Web3.js, SPL Token, Express.js, TypeScript, Claude Code (Opus 4.6), Cargo-build-sbf

## Category (public)

DeFi

## GitHub link (public)

https://github.com/fabrknt/veil/tree/main/apps/dark-pool

## Important context about your repo (500 char)

Veil is a privacy infrastructure monorepo. The dark pool is at apps/dark-pool/. Key components: Anchor program (6 instructions, 3 state accounts), off-chain solver (matcher + settlement adapters), and SDK wrapping @fabrknt/veil-orders for perp order encryption.

The encryption primitives (@fabrknt/veil-core, @fabrknt/veil-orders) are production packages — published on npm, shared across 6 other Veil apps (confidential swaps, dark AMM, etc).

(489 chars)

## Demo video

https://youtu.be/bL20xECSI2U

## Live product link

https://fabrknt.com/veil

## Pitch video (public)

https://youtu.be/bL20xECSI2U

## Team location (public)

Japan

## Is there anything else judges should know? (500 char)

We pivoted mid-hackathon based on mentor feedback — from Syntx (cross-venue perp DEX) to Veil Dark Pool. The VenueAdapter infrastructure from Syntx became the settlement layer. The pivot was validated: dark pools are a proven TradFi model with no Solana equivalent.

This isn't our first product. Yogi runs live on Drift mainnet. Kodiak runs live on Hyperliquid mainnet. We combined production perps infra + production privacy infra into one product.

(499 chars)

## How do you know people need this? (1000 char)

Three signals:

First, dark pools are a proven $7T+ market in TradFi. They handle 30-50% of institutional equity volume because large orders need execution privacy. The on-chain perp market ($7T/month) has zero equivalent infrastructure.

Second, Silhouette validated the model on Hyperliquid — raising $3M pre-seed for a "shield exchange" that hides order flow. Their approach works but is limited to one chain. Solana's composability (settle on any DEX via CPI) makes the dark pool strictly more powerful.

Third, we needed it ourselves. Running Yogi on Drift and Kodiak on Hyperliquid, every large rebalance gets worse execution from visible order flow. Vault operators are the first customers — they need to hide rebalance intent from MEV bots and strategy copiers.

Market timing: institutional DeFi adoption is blocked by execution quality concerns. Dark pools are table stakes for institutional flow in traditional markets. The first credible dark pool on Solana unlocks a category of capital that currently won't participate.

(993 chars)

## How far along are you? (1000 char)

Week 3 of hackathon. Pivoted from Syntx to Veil Dark Pool based on mentor feedback.

On-chain program (Anchor):
- 6 instructions: initialize, submit_perp_order, cancel_order, reveal_match, settle_trade, expire_order
- 3 state accounts: DarkPoolConfig, PerpOrderCommitment, DarkTradeRecord
- Commitment verification: SHA-256 hash of PERP_ORDER_SCHEMA (28 bytes)
- Program compiles cleanly (cargo check passes)

Off-chain solver:
- Poll → decrypt → match → settle loop (adapted from Veil's confidential-swap-router)
- PerpMatcher: price-time priority crossing engine with per-market books
- Settlement adapters for Drift and Jupiter Perps
- REST API: /solver-pubkey, /orders, /markets, /health

Packages extended:
- @fabrknt/veil-core: PERP_ORDER_SCHEMA added
- @fabrknt/veil-orders: perp encrypt/decrypt/hash functions added

Tests: 18 unit tests (matching engine + encryption round-trip)

Foundation: Veil privacy infrastructure (npm published, 6 apps). Yogi + Kodiak live on mainnet (perps execution).

(991 chars)

## Who else is building, what are they getting wrong? (1000 char)

Silhouette (Hyperliquid, $3M raised): Dark pool using TEEs. Good approach, but locked to Hyperliquid — a single venue with no smart contract composability. Can't settle across multiple DEXs. Can't integrate with Solana DeFi.

Jito (Solana MEV): Protects at the validator level (bundles, tips). Doesn't hide order intent — just reorders transactions. Traders still leak strategy through visible order flow.

Umbra (Solana): Privacy for transfers and wallets — stealth addresses, shielded deposits. Different layer entirely. Hides who you are, not what you're trading. Complementary, not competitive.

Flashbots Protect (Ethereum): Private transaction submission to skip public mempool. Spot-focused, no perp support, no matching engine, no dark pool crossing.

Everyone either protects at the wrong layer (validator not application), the wrong asset class (spot not perps), or the wrong chain (Ethereum/Hyperliquid not Solana). Veil Dark Pool is application-layer privacy for perps on Solana — the intersection no one occupies.

(994 chars)

## How do you make money? (500 char)

Dark pool matching fees: basis points on every matched trade. Volume-based revenue with network effects — more orders mean better matching, which attracts more orders.

Unmatched order routing fees: when orders fall back to public books, charge for the routing service.

Premium tiers: threshold-encrypted orders (M-of-N solver cooperation) for institutional users who need distributed trust. Higher fees, higher privacy guarantees.

Long-term: TEE attestation fees and API access for vault operators.

(488 chars)

## How long have you been working on this? (500 char)

Solo founder, part-time since January 2026.
Veil privacy infrastructure: 3+ months (6 apps, npm packages).
Perps vault infrastructure: 4+ months (Yogi on Drift, Kodiak on Hyperliquid).
Dark pool specifically: 1 week (pivoted Week 3 of hackathon based on mentor feedback).
The 29 @fabrknt/* packages represent 4+ months of accumulated infrastructure.
Prior work directly enabled rapid dark pool development.

(422 chars)

## Team location and work arrangement (500 char)

Solo founder based in Tokyo, Japan.
Working remotely part-time.
Open to relocating or establishing presence in Singapore, Hong Kong, or Dubai for regulatory clarity if funded.
No change to development workflow required — all infrastructure is cloud-based.

## Legal entity

No

## Investment taken

No

## Currently fundraising

No

## Live token

No

## Accelerator application

No

## Did anyone not listed do meaningful work?

Claude Code (Opus 4.6) was used extensively as an AI pair programmer for code generation, architecture decisions, and debugging. All design decisions and strategic direction are by the human founder.

## X profile (public)

psyto

## Telegram

(not applicable — founder does not use Telegram)

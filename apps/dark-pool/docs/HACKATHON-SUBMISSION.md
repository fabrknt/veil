# Veil Dark Pool — Colosseum Hackathon Submission Form

> Last updated: 2026-04-20
> Character limits verified. All fields within limits.

---

## Project name (public)

Veil Dark Pool

## Brief description (500 char, public)

Every perp trade on Solana is visible — front-run, sandwiched, copied. In TradFi, dark pools handle 30-50% of institutional equity flow. On-chain perps have zero equivalent.

Veil Dark Pool fixes this. Encrypt your order. Submit a commitment hash on-chain. The solver matches privately and settles on Drift, Jupiter Perps, or Phoenix. No one sees your side, price, or size until after execution. Unmatched orders fall back to public books automatically.

First of its kind on Solana.

## Project website (public)

https://fabrknt.com/veil

## What are you building, and who is it for? (1000 char)

A dark pool for Solana perpetual futures — the first one.

You submit an encrypted perp order with USDC collateral. The solver decrypts it privately, matches you against opposing orders using a price-time priority engine, and settles the trade on Drift, Jupiter Perps, or Phoenix. If no match, your order falls back to the public book. Collateral returned either way.

This is not anonymity — it's execution privacy. Wallets are public, orders hidden only until execution, every match recorded on-chain as a DarkTradeRecord. Same model NYSE operates under SEC regulation.

Silhouette raised $3M for this on Hyperliquid. Nothing exists on Solana. We built it in one week — we already had the privacy infra (Veil, 6 apps, npm) and live perp vaults on Drift and Hyperliquid mainnet.

Built for vault operators losing to MEV, traders leaking strategy, and institutions waiting for execution privacy before entering DeFi.

## Why did you decide to build this, and why build it now? (1000 char)

We started this hackathon building a cross-venue perp DEX. Mentor feedback was direct: "You're competing with Drift and Jupiter. No edge." Users asked "why would I use this instead of Drift?" — no good answer.

But we had something no one else on Solana had: production privacy infrastructure. Veil — NaCl encryption, commitment verification, confidential swap router — published on npm, 6 working apps. Plus live perp vaults on Drift and Hyperliquid mainnet.

The pivot was obvious: stop competing with DEXs, start building infrastructure they all need. Silhouette proved dark pools work on Hyperliquid ($3M raised). Nothing exists on Solana. Every perp trade on Solana leaks intent and loses value to MEV.

Why now: Solana finally has multiple mature perp venues (Drift, Jupiter Perps, Phoenix). The liquidity is here. The privacy layer is missing. We already had the primitives — it took one week to compose them into a dark pool.

## What technologies are you using or integrating with?

Anchor (0.30.1), NaCl box (Curve25519-XSalsa20-Poly1305), SHA-256 commitment verification, @fabrknt/veil-core, @fabrknt/veil-orders, Drift SDK, Jupiter Perps (Anchor IDL), Phoenix SDK, QuickNode RPC, Solana Web3.js, SPL Token, Express.js, TypeScript, Claude Code (Opus 4.6)

## Category (public)

DeFi

## GitHub link (public)

https://github.com/fabrknt/veil/tree/main/apps/dark-pool

## Important context about your repo (500 char)

Veil is a privacy infrastructure monorepo. The dark pool is at apps/dark-pool/. Anchor program (6 instructions, 3 state accounts), off-chain solver (matcher + 3 settlement adapters), SDK wrapping @fabrknt/veil-orders.

80 tests passing. Program deployed on Solana devnet. End-to-end demo runs: encrypt → commit → match → reveal → settle. The encryption packages are production npm modules shared across 6 other Veil apps.

## Demo video

https://youtu.be/bL20xECSI2U

## Live product link

https://fabrknt.com/veil

## Pitch video (public)

https://youtu.be/bL20xECSI2U

## Team location (public)

Japan

## Is there anything else judges should know? (500 char)

This is not Tornado Cash. Tornado Cash hides who you are — permanently, no audit trail, OFAC sanctioned. Veil hides what you trade — temporarily, full audit trail (DarkTradeRecord on-chain), legal in TradFi. NYSE, NASDAQ, every major broker operates dark pools under Reg ATS.

We're not building a novel anonymity tool. We're bringing a proven, regulated financial infrastructure on-chain. The business model is validated: IEX ($300M revenue), Liquidnet (acquired for $700M). Same fee structure.

## How do you know people need this? (1000 char)

We needed it ourselves. Running funding rate vaults on Drift (Yogi, mainnet) and Hyperliquid (Kodiak, mainnet), every large rebalance leaks intent and loses money to MEV. We are our own first customer. Vault operators are the obvious initial market.

Dark pools are a proven $7T+ market in TradFi. They handle 30-50% of institutional equity volume because large orders need execution privacy. The on-chain perp market ($7T/month) has zero equivalent infrastructure.

Silhouette validated the crypto model — raising $3M pre-seed for a dark pool on Hyperliquid. Their approach works but is locked to one chain with no composability. On Solana, we settle across Drift, Jupiter Perps, and Phoenix in atomic transactions.

Institutional DeFi adoption is blocked by execution quality. Dark pools are table stakes for institutional flow in traditional markets. The first credible dark pool on Solana unlocks a category of capital that currently won't participate.

## How far along are you? (1000 char)

Pivoted from Syntx (cross-venue perp DEX) to Veil Dark Pool in Week 3 based on mentor feedback.

On-chain (Anchor, deployed on devnet): 6 instructions, 3 state accounts, SHA-256 commitment verification. Program ID: FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA

Solver: poll → decrypt → match → settle loop. Price-time priority engine. 3 settlement adapters (Drift, Jupiter Perps, Phoenix). REST API. QuickNode RPC.

Web: landing page, "How Exposed Are You?" analyzer (reads real mainnet data), encrypted order demo.

80 tests. E2E passing on localnet + devnet.

Pre-mainnet: audit, 24/7 solver, live venue settlement, multisig. Gap is infra/ops, not technology.

Foundation: Veil privacy infra (npm, 6 apps). Yogi + Kodiak live on mainnet.

## Who else is building, what are they getting wrong? (1000 char)

Silhouette (Hyperliquid, $3M raised): Dark pool using TEEs. Good approach, but locked to one venue with no composability. Can't settle across multiple DEXs. Can't CPI into Solana DeFi.

Jito (Solana): Protects at the validator level — bundles and tips. Doesn't hide order intent, just reorders transactions. Traders still leak strategy through visible order flow.

Umbra (Solana): Privacy for transfers and wallets — stealth addresses, shielded deposits. Hides who you are, not what you're trading. Complementary, not competitive.

Flashbots Protect (Ethereum): Private tx submission to skip mempool. Spot only, no perps, no matching engine.

The pattern: everyone protects at the wrong layer (validator not application), wrong asset class (spot not perps), or wrong chain (Ethereum/Hyperliquid not Solana). Application-layer privacy for perps on Solana is an empty intersection. Veil Dark Pool occupies it.

## How do you make money? (500 char)

Matching fees: 2-5 bps on every dark pool trade. Volume-based — scales with network effects, not capital.

Routing fees: 1 bps when unmatched orders fall back to public books.

Premium tiers: threshold-encrypted orders (M-of-N) for institutional users needing distributed trust.

Same fee model as IEX ($300M annual revenue) and Liquidnet (acquired for $700M). Proven in TradFi, new to on-chain.

## How long have you been working on this? (500 char)

Solo founder, part-time since January 2026.
Veil privacy infrastructure: 3+ months (6 apps, npm packages).
Perps vault infrastructure: 4+ months (Yogi on Drift, Kodiak on Hyperliquid).
Dark pool specifically: 1 week (pivoted Week 3 based on mentor feedback).
29 @fabrknt/* packages represent 4+ months of accumulated infrastructure.
The dark pool was fast because the primitives already existed.

## Team location and work arrangement (500 char)

Solo founder based in Tokyo, Japan.
Working remotely part-time.
Open to relocating or establishing presence in Singapore, Hong Kong, or Dubai for regulatory clarity if funded.
All infrastructure is cloud-based.

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

## Access instructions

1. Clone: `git clone https://github.com/fabrknt/veil.git`
2. Navigate: `cd veil/apps/dark-pool`
3. Build: `cargo build-sbf` (BPF program)
4. Tests: `npx ts-mocha -p tsconfig.json -t 60000 tests/matcher.test.ts tests/encryption.test.ts`
5. Demo: `npx ts-node scripts/demo.ts` (full lifecycle on localnet)
6. Solver: `cd solver && npx ts-node src/index.ts`

## X profile (public)

psyto

## Telegram

(not applicable — founder does not use Telegram)

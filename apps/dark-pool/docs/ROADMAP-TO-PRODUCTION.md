# Veil Dark Pool — Roadmap to Production

## Current State: Devnet Demo

Program deployed on Solana devnet. End-to-end lifecycle passing (encrypt → commit → match → reveal → settle). 80 tests. 3 settlement venues wired. Web UI and "How Exposed Are You?" analyzer built. Solver runs locally.

---

## Phase 1: Mainnet Ready (1-2 months)

### Must Have

| Item | Status | What's needed |
|---|---|---|
| Security audit | Not started | Professional audit of Anchor program (~$50-100K) |
| Solver deployment | Local only | Deploy to cloud (EC2/Railway), 24/7 uptime, health monitoring |
| Real USDC integration | Mock USDC | Wire to real USDC mint, proper token account management |
| Encryption key management | Ephemeral | Persistent keypair in secure storage (AWS KMS or HSM) |
| Drift live settlement | Simulated | Test against real Drift devnet sub-accounts, then mainnet |
| Jupiter Perps live settlement | IDL not loaded | Load Anchor IDL, test real position requests |
| Rate limiting | None | Solver API auth + DOS protection |
| Multisig admin | Single keypair | Squads multisig for program upgrade authority |

### Estimated cost: $50-100K (audit) + $500/month (infra)

---

## Phase 2: Production Users (2-4 months)

### Should Have

| Item | Status | What's needed |
|---|---|---|
| Fallback routing | Not built | Route unmatched orders to public books after TTL expiry |
| WebSocket status updates | REST only | Real-time order status (pending → matched → settled) |
| Production web UI | Demo only | Connect to real solver API + on-chain tx submission |
| Solver monitoring | None | Health checks, auto-restart, alerting (PagerDuty/Slack) |
| Transaction retry logic | None | Handle RPC failures, tx expiry, blockhash refresh |
| Fee collection pipeline | On-chain logic exists | Wire fee recipient, accounting, reporting |

### First customers: Our own vaults (Yogi on Drift, Kodiak on Hyperliquid)

---

## Phase 3: Scale (4-8 months)

### TEE + Performance

| Item | Status | What it unlocks |
|---|---|---|
| TEE (AWS Nitro Enclaves) | Not started | Remove trusted solver assumption — attestation on-chain |
| QuickNode Streams | Planned | Real-time commitment detection (~200ms vs 2s polling) |
| Persistent order storage | In-memory only | Survive solver restarts, order history |
| Multi-venue fallback | Not built | Auto-route to best public book on no match |
| Analytics dashboard | Not built | Volume, match rate, latency, fee revenue |

### Target: Institutional users, third-party vault operators

---

## Phase 4: Trustless (8-12 months)

### ZK + Distribution

| Item | Status | What it unlocks |
|---|---|---|
| ZK proof matching | Not started | Fully trustless — no TEE or solver trust needed |
| Threshold encryption (M-of-N) | veil-orders supports it | Multi-solver cooperation for institutional tier |
| CPI integration | Not built | Any Solana program can call dark pool in one tx |
| QuickNode Marketplace add-on | Applied | Distribution through QuickNode's user base |

---

## What We Have vs What We Need

```
HAVE (hackathon)                    NEED (production)
├── Anchor program (devnet)         ├── Security audit
├── 6 instructions                  ├── Solver deployment (24/7)
├── 80 tests                        ├── Real USDC + token accounts
├── 3 settlement adapters           ├── Live Drift/Jupiter settlement
├── Matching engine                 ├── Multisig admin
├── Encryption (npm published)      ├── Rate limiting
├── E2E demo passing                ├── Fallback routing
├── Web UI + Exposed analyzer       ├── Transaction retry
└── QuickNode RPC                   └── TEE (v1) → ZK (v2)
```

The gap is **infrastructure and ops**, not **technology**. The core primitives work. What's needed is hardening, deployment, and trust minimization — standard path from hackathon to mainnet.

# Veil Dark Pool — Positioning & Differentiation

## Dark Pool vs Intent Solver

They're related but solve different problems.

### Intent Solver (confidential-swap-router)

**What it does:** User encrypts a **spot swap** order → solver decrypts → finds the best route on Jupiter → executes the swap → delivers output tokens.

```
User → encrypt(swap USDC→SOL) → solver → Jupiter route → fill → user gets SOL
```

**Key:** The solver is a **single-sided executor**. There's one user, one order. The solver finds liquidity on existing DEXs and fills it. No matching between users.

### Veil Dark Pool

**What it does:** Multiple users encrypt **perp orders** → solver decrypts → **matches opposing orders against each other** → settles on Drift/Jupiter Perps.

```
Trader A → encrypt(LONG SOL $150)  ┐
                                    ├→ solver → matching engine → cross! → settle on Drift
Trader B → encrypt(SHORT SOL $149) ┘
```

**Key:** The solver is a **matching engine**. Two users, opposing orders, private crossing. The value is that buyer and seller find each other without revealing intent publicly.

### Comparison

| | Intent Solver | Dark Pool |
|---|---|---|
| Asset type | Spot swaps | Perp futures |
| Users per trade | 1 (user vs DEX liquidity) | 2 (user vs user) |
| Solver role | Route finder | Matching engine |
| Value add | MEV protection on execution | Price discovery + MEV protection |
| Counterparty | Jupiter LP pool | Another dark pool trader |
| On-chain record | Order execution proof | DarkTradeRecord (both sides) |

### How They Connect

The dark pool **reuses** the intent solver's infrastructure:
- Same NaCl encryption (`veil-orders`)
- Same commitment hash scheme (SHA-256 verification)
- Same solver loop pattern (poll → decrypt → execute)
- Same program structure (submit → execute/reveal → claim/settle)

The intent solver is **private execution** (hide your order from MEV). The dark pool is **private discovery** (find a counterparty without anyone knowing you're looking). The dark pool is the harder, more valuable problem — it creates a private market, not just private execution of a public market order.

---

## Dark Pool vs Tornado Cash

They share a privacy premise but are fundamentally different in purpose and mechanism.

### Tornado Cash

**What it does:** Breaks the link between **sender and receiver** of tokens. Deposit ETH into a pool → withdraw later from a different wallet → no on-chain connection between the two wallets.

**Mechanism:** Merkle tree of commitments + ZK proof. You prove "I deposited into this pool" without revealing which deposit is yours.

**Purpose:** **Identity privacy** — hide who you are.

```
Wallet A → deposit 1 ETH → [pool of identical deposits] → withdraw 1 ETH → Wallet B
                            (no link between A and B)
```

### Veil Dark Pool

**What it does:** Hides the **intent and details** of a trade. Encrypt your order → match privately → settle on-chain. Everyone can see a trade happened, but no one could front-run it because the details were hidden until execution.

**Mechanism:** Encryption + off-chain matching + on-chain settlement proof.

**Purpose:** **Trade privacy** — hide what you're doing.

```
Trader A (known wallet) → encrypt(LONG SOL $150) → [private match] → settle on Drift
                          (wallet is public, order details were hidden)
```

### Comparison

| | Tornado Cash | Dark Pool |
|---|---|---|
| What's hidden | **Who** (wallet identity) | **What** (order intent) |
| Wallet visible? | No — that's the point | Yes — trader identity is public |
| Use case | Transfer tokens privately | Trade without leaking strategy |
| When privacy matters | Before and after tx | Only before execution |
| After settlement | No trace of connection | Full audit trail (DarkTradeRecord) |
| Regulatory stance | Sanctioned by OFAC | Legal in TradFi (SEC-regulated) |
| Counterparty | Same user (self-transfer) | Another trader |

### The Critical Legal Distinction

**Tornado Cash** was sanctioned because it enables untraceable transfers — money laundering, sanctions evasion. The privacy is permanent and covers identity.

**Dark pools** are **legal and regulated in TradFi**. NYSE, NASDAQ, and every major broker operates dark pools. The SEC regulates them under Reg ATS. Why? Because:

1. **Identity is known** — both traders are KYC'd (or at least wallet-public)
2. **Privacy is temporary** — order details are hidden only until execution
3. **Full audit trail** — every trade is recorded and reportable
4. **Purpose is fair execution** — prevent front-running, not hide identity

Veil Dark Pool follows the TradFi model:
- Trader wallets are visible on-chain
- Orders are hidden only during matching
- DarkTradeRecord is permanent proof of execution
- After settlement, everything is auditable

### Could They Be Combined?

Yes — a trader could deposit through **Umbra** (stealth address, hide who they are) and then trade through **Veil Dark Pool** (hide what they're trading). Full privacy stack — hidden identity + hidden intent. But for the hackathon, the dark pool alone is the right scope. Adding identity privacy invites regulatory questions that distract from the product.

### TL;DR

- Tornado Cash = **anonymity** (who) — permanent, identity-focused, sanctioned
- Dark Pool = **confidentiality** (what) — temporary, trade-focused, legal in TradFi

---

## Positioning Summary

Veil Dark Pool sits in a rare sweet spot:

- **Novel on Solana** — no one has built it
- **Proven in TradFi** — dark pools handle trillions in volume
- **Legally sound** — temporary confidentiality with full audit trail, not anonymity
- **Validated in crypto** — Silhouette raised $3M for the same thesis on Hyperliquid
- **Built on existing infra** — not starting from zero
- **Dual value** — privacy AND lower fees from internal netting (4-18 bps saved per trade)

The pitch: "Dark pool for Solana perps — private execution AND lower fees. Internal matches bypass venue fees entirely. Not Tornado Cash — the on-chain equivalent of what NYSE already operates."

Privacy alone = niche (only large traders care). Privacy + cost savings = universal (every trader cares about fees). The internal netting is what makes the dark pool economically compelling, not just technically interesting.

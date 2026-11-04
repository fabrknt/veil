# Veil - Presentation Deck

## PrivacyHack 2026 & Multi-Hackathon Submission

---

## Slide 1: Title

**Veil**

*Privacy infrastructure for the next era of DeFi*

**Five Applications. One Principle: "MEV bots can't frontrun what they can't read."**

- Confidential Swap Router (PrivacyHack - Open Track)
- RWA Secrets Service (PrivacyHack - Privacy Tooling Track)
- Umbra (FairScale Hackathon - Reputation-Gated DEX)
- DarkFlow (PrivacyHack - Arcium/Noir Bounties)
- ShadowLaunch (Pump.fun Hackathon - Privacy Purchases)

GitHub: github.com/fabrknt/veil

---

## Slide 2: The Core Problem

**Public blockchains created a paradox:**

Systems designed for financial freedom became the most surveilled financial infrastructure in history.

- Every transaction is permanent
- Every intention is broadcast
- Every strategy is exposed

**This has consequences.**

---

## Slide 3: MEV - The $Billion Problem

```
You: "I want to swap 1 SOL for USDC"
          ↓
Mempool: [Your order is visible to everyone]
          ↓
MEV Bot: Buys before you, sells to you higher
          ↓
Result: You pay more. Bot profits.
```

**MEV extraction costs users billions annually.**

Frontrunning. Sandwich attacks. All enabled by transparent mempools.

---

## Slide 4: RWA - The Confidentiality Problem

**Tokenized assets need sensitive data on-chain:**

- Property valuations
- Legal documents
- Ownership structures
- Financial statements

**On a public blockchain, this is visible to:**

Competitors. Adversaries. The entire world.

Total transparency destroys business confidentiality.

---

## Slide 5: Our Philosophy

> **"MEV bots can't frontrun what they can't read."**

> **"Not about hiding from regulators. It's about not exposing everything to everyone."**

**The answer:** Privacy by architecture, not as an afterthought.

---

## Slide 6: Solution 1 - Confidential Swap Router

**Encrypt first. Execute later.**

```
User: Encrypts order with solver's public key
          ↓
On-chain: Encrypted blob (ciphertext only)
          ↓
Solver: Decrypts, executes via Jupiter
          ↓
Result: Fair execution. No frontrunning.
```

**MEV bots see bytes, not intentions.**

---

## Slide 7: Confidential Swap Router - Features

| Feature | Benefit |
|---------|---------|
| NaCl Box Encryption | Order details hidden until execution |
| Jupiter Integration | Best price routing |
| Non-custodial | Users can cancel anytime |
| ZK Compression | storage reduction (planned; placeholder in code) |
| Shielded Settlement | Private output delivery |

**Program ID:** `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM`

---

## Slide 8: Solution 2 - RWA Secrets Service

**Encrypted by default. Disclosed by choice.**

```
Asset registered → Metadata encrypted
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
  Investor granted              Regulator granted
  ViewFull access               Auditor access
        ↓                               ↓
  Sees valuation                Sees compliance data
```

**Different parties see different information.**

---

## Slide 9: RWA Secrets Service - Access Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| ViewBasic | Basic asset info | Public investors |
| ViewFull | Complete metadata | Qualified investors |
| Auditor | Compliance data | Regulators |
| Admin | Full control | Asset issuer |

**Features:** Time-limited access, delegation rights, on-chain audit trail, revocable

**Program ID:** `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam`

---

## Slide 10: Solution 3 - Umbra (Reputation-Gated Privacy)

**"Privacy is a privilege you earn through good behavior."**

```
SOVEREIGN Identity                    Umbra Benefits
──────────────────                    ──────────────
Tier 1 (Bronze)     ───────────────►  0.50% fee, No MEV protection
Tier 2 (Silver)     ───────────────►  0.30% fee + 5% discount, Basic MEV
Tier 3 (Gold)       ───────────────►  0.15% fee + 15% discount, Full MEV
Tier 4 (Platinum)   ───────────────►  0.08% fee + 30% discount, Dark pool
Tier 5 (Diamond)    ───────────────►  0.05% fee + 50% discount, VIP routing
```

**Program ID:** `41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr`

---

## Slide 11: Solution 4 - DarkFlow (Confidential AMM)

**"Trade without a trace. Lend without a ledger."**

| Feature | Traditional AMM | DarkFlow |
|---------|-----------------|----------|
| LP deposits | Everyone sees | Encrypted (only owner) |
| Swap amounts | Everyone sees | ZK verified, hidden |
| Result | MEV extraction | Value preserved |

**Technologies:** Arcium encrypted state, Noir ZK proofs, NaCl encryption

---

## Slide 12: Solution 5 - ShadowLaunch (Private Pump.fun)

**"Break the link between your wallet and your trades."**

```
Main Wallet → Privacy Pool → Ephemeral Wallet → Pump.fun Purchase
                  ↓
          Link broken here
```

- **Shadow Mode**: Toggle privacy on/off
- **Ephemeral Wallets**: Fresh keys for each purchase
- **No History**: Tokens arrive with no trace to you

---

## Slide 13: Technical Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                   Veil                                    │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Swap Router  │  │ RWA Secrets  │  │ Umbra        │  │ DarkFlow     │ │
│  │ (MEV)        │  │ (Metadata)   │  │ (Reputation) │  │ (Dark AMM)   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     ShadowLaunch (Pump.fun)                         │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                            @fabrknt/veil-core                               │ │
│  │  NaCl Box • Shamir's • ZK Compression • Shielded • Arcium MPC      │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Slide 14: Bounty Integrations

| Partner | Integration | Apps | Prize |
|---------|-------------|------|-------|
| **Light Protocol** | ZK Compression | All | Open Track |
| **Privacy Cash** | Shielded Transfers | Swap, DarkFlow | $15,000 |
| **Helius** | RPC Provider | All | $5,000 |
| **Quicknode** | RPC Provider | ShadowLaunch | $3,000 |
| **Arcium** | Encrypted State | DarkFlow | $10,000 |
| **Noir/Aztec** | ZK Proofs | DarkFlow | $10,000 |
| **FairScale** | Reputation | Umbra | Track Prize |

---

## Slide 15: Code Example - Encrypted Swap

```typescript
import { createEncryptedOrder } from '@fabrknt/veil-confidential-swap-sdk';

// User encrypts order - only solver can read
const encrypted = createEncryptedOrder(
  {
    minOutputAmount: 1000000n,
    slippageBps: 50,
    deadline: Date.now() + 3600000
  },
  solverPublicKey,  // Solver's encryption key
  userKeypair
);

// Submit to chain - MEV bots see only ciphertext
await program.submitEncryptedOrder(encrypted);
```

---

## Slide 16: Code Example - Selective Disclosure

```typescript
import { encryptAssetMetadata, grantAccess } from '@fabrknt/veil-rwa-secrets-sdk';

// Encrypt sensitive metadata
const encrypted = encryptAssetMetadata({
  valuationUsdCents: 150000000n,  // $1.5M
  jurisdictionCode: 'US',
  additionalInfo: '{"address": "123 Main St"}'
}, keypair);

// Grant selective access to investor
await grantAccess({
  asset: assetPda,
  grantee: investorPublicKey,
  level: AccessLevel.ViewFull,
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000  // 30 days
});
```

---

## Slide 17: Why This Matters

| For | Benefit |
|-----|---------|
| **Traders** | No more MEV tax on every swap |
| **Businesses** | Confidential operations on public chains |
| **High-Rep Users** | Better rates through reputation |
| **Pump.fun Buyers** | Accumulate without being tracked |
| **Markets** | Fair price discovery |

**Privacy isn't a feature. It's infrastructure.**

---

## Slide 18: The Third Era of Crypto

| Era | Focus | Privacy |
|-----|-------|---------|
| Era 1 | Decentralized money | Pseudonymous but traceable |
| Era 2 | Decentralized compute | Transparent by default |
| **Era 3** | **Decentralized privacy** | **Confidential by design** |

**Veil is infrastructure for Era 3.**

---

## Slide 19: Deployed & Tested

**Devnet Deployments:**

| Program | ID |
|---------|-----|
| Confidential Swap Router | `v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM` |
| RWA Secrets Service | `DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam` |
| Umbra Swap | `41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr` |

**All Tests Passing**

---

## Slide 20: Summary

**Veil**

Five applications. One principle.

| Application | Problem | Solution |
|-------------|---------|----------|
| Swap Router | MEV extraction | Encrypted orders |
| RWA Secrets | Data exposure | Selective disclosure |
| Umbra | Unfair privacy | Reputation-gated access |
| DarkFlow | LP/Swap visibility | ZK proofs + dark pools |
| ShadowLaunch | Tracked purchases | Ephemeral wallets |

> "MEV bots can't frontrun what they can't read."

---

## Slide 21: Links & Contact

**Repository:** github.com/fabrknt/veil

**Explorer Links:**
- [Swap Router](https://explorer.solana.com/address/v7th9XoyXeonxKLPsKdcgaNsSMLR44HDY7hadD7CCRM?cluster=devnet)
- [RWA Secrets](https://explorer.solana.com/address/DWgiBrRNa3JM3XWkPXGXwo7jJ59PvXVr3bVeyKbGySam?cluster=devnet)
- [Umbra Swap](https://explorer.solana.com/address/41Ps5GR2E6QbXRDaXjAcQCcKmPR942VYLRQQDqdkQXLr?cluster=devnet)

**Built with:**
Light Protocol • Privacy Cash • Jupiter • Helius • Quicknode • Arcium • Noir • SOVEREIGN

**Developer:** psyto

---

## Speaker Notes

### Key Messages to Emphasize:

1. **Lead with philosophy** - "MEV bots can't frontrun what they can't read"
2. **Five apps, one principle** - Unified privacy infrastructure
3. **Problem → Solution flow** - Show the pain point before the fix
4. **Not anti-compliance** - "Not about hiding from regulators"
5. **Production-ready** - 3 programs deployed on devnet, all tests passing
6. **Multi-hackathon** - PrivacyHack + FairScale + Pump.fun

### Timing Suggestion:
- Slides 1-5: Problem & Philosophy (1 min)
- Slides 6-12: All 5 Solutions (2.5 min)
- Slides 13-16: Technical + Code (1 min)
- Slides 17-21: Impact & Close (30 sec)

**Total: ~5 minutes** (adjust based on submission requirements)

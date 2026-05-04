# YouTube & X Post — Business Pitch Video

---

## YouTube Title

```
Veil Dark Pool — First Shielded Perp Execution on Solana | Frontier Hackathon 2026
```

## YouTube Description

```
Veil Dark Pool brings dark pool execution to Solana perpetual futures — the first of its kind.

Encrypt your perp order. Submit a commitment hash on-chain. The solver matches privately and settles on Drift, Jupiter Perps, or Phoenix. No one sees your side, price, or size until after execution.

In TradFi, dark pools handle 30-50% of institutional equity flow. On-chain perps ($7T/month) have zero equivalent. Veil Dark Pool changes that.

Built on production infrastructure:
• NaCl box encryption (@fabrknt/veil-core, npm published)
• 3 settlement venues: Drift, Jupiter Perps, Phoenix
• 101 tests passing, deployed on Solana devnet
• Live mainnet vaults: Yogi (Drift), Kodiak (Hyperliquid)

This is not Tornado Cash. Dark pools hide what you trade (temporarily), not who you are (permanently). Full audit trail on-chain via DarkTradeRecord. Legal in TradFi — SEC-regulated under Reg ATS.

Program ID: FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA
GitHub: https://github.com/fabrknt/veil/tree/main/apps/dark-pool
Built by @psyto · Fabrknt · Tokyo, Japan

Built for the Solana Frontier Hackathon (Colosseum, Apr 6 – May 11, 2026)

#Solana #DeFi #DarkPool #Hackathon #SolanaFrontier #Colosseum #Perps #Privacy #Veil #QuickNode
```

---

## Week 4 Update — YouTube Title

```
Veil Dark Pool W4 — Hackathon Code → Production Solver | Solana
```

Title alternatives:
- `Veil Dark Pool W4 — Always-On Solver, 50× Less RPC | Solana Perps`
- `Veil Dark Pool W4 — From Demo to 24/7 Production on Solana`

## Week 4 Update — YouTube Description

```
Veil Dark Pool — Week 4 update.

This week we took the Week 3 matching engine and made it production-ready.

What shipped:
• Solver now runs 24/7 on EC2 (Docker + systemd, persistent volumes)
• Replaced 2-second polling with WebSocket programSubscribe → ~50× less RPC cost
• Order detection latency dropped from ~2s to under 200ms
• Encryption keypair is now persistent — in-flight orders survive deploys
• Program locked down: zero admin-gated instructions (no upgrade authority, no pause, no kill switch)

The dark pool is now trustless at the protocol layer and always-on at the operational layer.

Path to mainnet (TEE → audit → deployment) is documented in the published roadmap.

Program ID: FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA
GitHub: https://github.com/fabrknt/veil/tree/main/apps/dark-pool
Web: https://fabrknt.github.io/veil

Built for the Solana Frontier Hackathon (Colosseum, Apr 6 – May 11, 2026)
By @psyto · Fabrknt · Tokyo, Japan

#Solana #DeFi #DarkPool #Hackathon #SolanaFrontier #Colosseum #Perps #Privacy #Veil #QuickNode
```

## Week 4 Update — X Post (single, attach video)

```
Veil Dark Pool — Week 4. Hackathon prototype → 24/7 production solver.

→ Always-on EC2 (Docker + systemd)
→ WebSocket subscribe: 50× less RPC, <200ms detection
→ Persistent encryption (orders survive deploys)
→ Zero admin-gated instructions

[video]
```

242 characters. Attach `week4-update.mp4` natively. Reply to your own post with the YouTube link once published.

---

## X Post (Thread)

### Post 1 (main post — attach the video)

```
We pivoted mid-hackathon and built the first dark pool for Solana perps.

Veil Dark Pool: encrypt your order, submit a commitment hash on-chain, solver matches privately, settles on Drift / Jupiter / Phoenix.

No one sees your side, price, or size until after execution.

Here's the full pitch 👇
```

### Post 2

```
Why this matters:

• TradFi dark pools handle 30-50% of institutional equity flow
• On-chain perps = $7T/month with zero dark pools
• Silhouette raised $3M for this on Hyperliquid
• Nothing exists on Solana

Nothing exists on Solana.
```

### Post 3

```
The pivot story:

Weeks 1-2: Built a cross-venue perp DEX (Syntx)
Mentor feedback: "You're competing with Drift. No edge."

Week 3: Took our Veil encryption stack + perps execution experience → first dark pool for Solana perps

101 tests. Deployed on devnet. 3 settlement venues. E2E passing.
```

### Post 4

```
This is NOT Tornado Cash.

Tornado Cash = anonymity (who you are). Sanctioned.
Veil Dark Pool = confidentiality (what you trade). Legal.

Wallet identity: public
Order details: hidden until execution
Audit trail: DarkTradeRecord on-chain

Same model NYSE operates under Reg ATS.
```

### Post 5

```
Built on production infrastructure, not from scratch:

• @fabrknt/veil-core → NaCl encryption (npm)
• Yogi → Drift mainnet vault (live)
• Kodiak → Hyperliquid vault (live)
• Nanuk → Jupiter Perps patterns
• Syntx → Phoenix adapter

Solver runs on @QuickNode RPC. Streams integration planned for v1.

I build dark pools because I lose money to MEV on every rebalance.
```

### Post 6

```
Submitting to @colaboratory Frontier Hackathon + @SuperteamJapan side track.

Program: FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA
GitHub: github.com/fabrknt/veil/apps/dark-pool

Dark pools handle half of institutional equity volume for a reason.
Solana perps deserve the same infrastructure.

@solana @JupiterExchange @DriftProtocol @QuickNode
```

---

## Posting Tips

1. **Post 1 with the video** — this is the hook. Keep it short, attach the pitch video directly (not a YouTube link — native video gets 10x more reach on X).

2. **Thread the rest** — reply to your own post immediately with posts 2-6.

3. **Tag strategically** — @SuperteamJapan in the last post, @solana ecosystem accounts. Don't over-tag in post 1 (looks spammy).

4. **Pin the thread** — pin post 1 to your profile so judges see it when they check @psyto.

5. **Post timing** — weekday morning US time (evening Japan time) for maximum Solana ecosystem visibility.

6. **YouTube link** — add as a reply to the thread after posting: "Full pitch on YouTube: [link]". Native video in the main post, YouTube link in replies.

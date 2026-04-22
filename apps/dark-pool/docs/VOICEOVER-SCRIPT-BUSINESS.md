# Veil Dark Pool — Business Pitch Voiceover Script

> 13 slides, ~3 minutes. This is the pitch video for judges.
> Record yourself on Loom (face + screen) scrolling through business.html.
> Speak as a founder pitching to a VC, not as an engineer explaining code.

---

## [Slide 1] Title — 10 seconds

"Veil Dark Pool. Private execution and lower fees for Solana perps."

---

## [Slide 2] Why Now — 15 seconds

"Seven trillion dollars a month trades through perp markets. In TradFi, thirty to fifty percent of equity volume goes through dark pools. On Solana — zero. Every large trade gets front-run, sandwiched, or copied. And every trader pays full venue fees plus slippage plus MEV extraction."

---

## [Slide 3] Competitive Landscape — 12 seconds

"No one occupies this position. Flashbots and CoW protect spot. Jito protects at the validator level. Silhouette built a dark pool, but only for Hyperliquid. Application-layer privacy for perps on Solana — nobody is here."

---

## [Slide 4] Confidentiality vs Anonymity — 15 seconds

"This is not Tornado Cash. Tornado Cash hides who you are — permanently, no audit trail. That's why it was sanctioned. Veil hides what you trade — temporarily, with a full audit trail on-chain. We follow the TradFi dark pool model — temporary confidentiality with full auditability. Regulatory framework for on-chain deployment is TBD, not claimed as resolved."

---

## [Slide 5] Why Solana — 12 seconds

"Why not build on Hyperliquid like Silhouette? Because they're locked to one venue. On Solana, Veil settles across Drift, Jupiter Perps, and Phoenix in atomic transactions. Composability that Hyperliquid structurally cannot match."

---

## [Slide 6] Go-to-Market — 15 seconds

"We start with ourselves. I run Yogi on Drift mainnet and Kodiak on Hyperliquid. Every rebalance leaks intent and loses money to MEV. We're our own first customer."

"Phase two: other vault operators — Liminal, Harmonix, Reflect. Phase three: institutional desks. Phase four: protocol CPI."

---

## [Slide 7] Fee Savings + Revenue — 15 seconds

"Here's what makes this more than a privacy tool. Orders that match internally in the dark pool bypass venue fees entirely. Drift charges seven to twenty bps including slippage and MEV. The dark pool charges three. That's four to eighteen basis points saved on every internal match."

"Same fee model as IEX — three hundred million in annual revenue. Proven in TradFi, new to on-chain."

---

## [Slide 8] Traction — 12 seconds

"Eighty tests passing. Program deployed on devnet. Three settlement venues. End-to-end lifecycle working. Web UI live at fabrknt.github.io/veil. Built on four months of production infrastructure — npm packages, live vaults on mainnet."

---

## [Slide 9] Team — 12 seconds

"Solo founder, Tokyo. I run live perp vaults on Drift and Hyperliquid. I built Veil's privacy infrastructure — six apps, published on npm. I'm building a dark pool because I lose money to MEV on every rebalance. I need this product myself."

---

## [Slide 10] The Pivot — 12 seconds

"Started this hackathon building a cross-venue perp DEX. Mentors said: you're competing with Drift, no edge. So I pivoted. Took the Veil encryption stack, added a matching engine, built the first dark pool for Solana perps. In one week."

---

## [Slide 11] The Ask — 15 seconds

"I'll be direct about what's needed. The v0 solver is trusted — it can see order details. TEE is the number one priority post-hackathon. No mainnet without removing the trust assumption. We also need a security audit, and a regulatory framework for on-chain dark pool operations."

"What we bring: production privacy infra, live mainnet vaults, working dark pool on devnet, and our own vaults as the first customer."

---

## [Slide 12] Close — 10 seconds

*(Slow. Let it land.)*

"Dark pools handle half of institutional equity volume for a reason. Solana perps deserve the same infrastructure — with lower fees."

*(Pause.)*

"Veil Dark Pool. First of its kind."

---

## Recording Tips

1. **Use Loom** — face + screen. Judges back founders they can picture.

2. **Total: ~3 minutes** — 10-15 seconds per slide.

3. **Energy curve:**
   - Slides 1-3: Confident, setting the stage
   - Slide 4 (Tornado Cash): Honest — "regulatory TBD, not claimed as resolved"
   - Slide 7 (Fees): This is the new hook — lean into the numbers
   - Slide 9 (Team): Personal — "I need this myself"
   - Slide 11 (Ask): Direct, honest about risks — "TEE is number one priority"
   - Slide 12 (Close): Slow, deliberate

4. **Key phrases to nail:**
   - "Private execution AND lower fees"
   - "Four to eighteen basis points saved"
   - "The v0 solver is trusted — TEE is number one priority"
   - "Regulatory framework is TBD, not claimed as resolved"
   - "First of its kind"

5. **What makes this script different from the original:** Honesty about risks. Judges respect founders who say "here's what doesn't work yet and here's the plan." Hiding the solver trust issue would be a red flag if they find it in the code.

6. **If you only have 2 minutes:** Keep: problem → fees → traction → team → ask (with solver trust) → close.

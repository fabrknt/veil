# Veil Dark Pool — Demo Video V2 Voiceover Script

> Total duration: ~92 seconds. Timestamps aligned to V2 video sections.
> V2 replaces Explorer navigation with styled verification slides.

---

## [0:00–0:05] Title Slide

*(Let the matrix rain settle for 2 seconds before speaking.)*

"Veil Dark Pool. The first shielded perp execution layer on Solana."

---

## [0:05–0:10] Problem Slide

"Every perp trade on Solana is visible the moment it hits the chain. Bots front-run you, competitors copy your strategy. In traditional finance, dark pools handle thirty to fifty percent of institutional equity volume. Solana perps have zero equivalent."

---

## [0:10–0:15] Solution Flow

"Here's how Veil solves it. Encrypt your order. Submit a commitment hash on-chain. The solver matches privately. Settlement happens on Drift, Jupiter Perps, or Phoenix. No one sees your side, price, or size until it's done."

---

## [0:15–0:22] Terminal: Setup

*(Terminal appears with matrix rain behind it. Lines flow in.)*

"Let's watch the full lifecycle. We initialize the dark pool, fund test accounts, and mint mock USDC. The program is live on Solana devnet."

---

## [0:22–0:32] Terminal: Encrypt Orders

*(Encrypted payloads appear in magenta with flicker animation.)*

"Two traders submit opposing orders. Trader A goes long SOL at one-fifty. Trader B goes short at one-forty-nine. Both are encrypted with NaCl box. What you see here in pink — that's the encrypted payload. Unreadable. Below it, the commitment hash — a SHA-256 fingerprint. That's all that goes on-chain."

---

## [0:32–0:40] Terminal: Submit Commitments

"Each trader deposits a hundred USDC as collateral alongside their hash. The program stores the commitment but never sees the actual order. Two accounts created, two vaults funded. Everything on-chain."

---

## [0:40–0:50] Terminal: Decrypt + Match

*(MATCH FOUND flashes with golden glitch effect. This is the climax — lift your energy.)*

"The solver decrypts both orders privately. Bid at one-fifty. Ask at one-forty-nine. The bid is higher — they cross."

*(Pause for the glitch effect.)*

"Match found. Execution price: one hundred fifty dollars. Ten units filled."

---

## [0:50–0:57] Terminal: Reveal + Settle + Demo Complete

"Reveal match goes on-chain — both commitment hashes are verified. The program re-serializes the decrypted parameters, hashes them, and confirms they match. A DarkTradeRecord is created. Then settle trade — collateral returned, fees deducted, done."

---

## [0:57–1:03] Verification Slide 1: Commitment Hashes

*(Two hash boxes with green checkmarks appear.)*

"Here's the proof. Trader A's hash — verified. Trader B's hash — verified. The solver proved honest decryption by reproducing the exact SHA-256 hash that was committed on-chain. If it doesn't match, the transaction reverts. The solver cannot modify your order."

---

## [1:03–1:09] Verification Slide 2: DarkTradeRecord

*(Styled card showing buyer, seller, price, quantity, venue, status.)*

"The DarkTradeRecord. Permanent, auditable proof on Solana. Execution price: one-fifty. Quantity: ten. Venue: Drift. Status: settled. Both traders got matched without anyone seeing their orders beforehand."

---

## [1:09–1:14] Verification Slide 3: Transaction Summary

*(Four steps with checkmarks.)*

"Four on-chain transactions. Initialize, submit two commitments, reveal the match, settle the trade. Every step verifiable on Solana Explorer right now."

---

## [1:14–1:19] Built On Slide

"Built on production infrastructure that already existed. NaCl encryption and order schemas published on npm. Drift execution from Yogi, our funding rate vault on mainnet. Jupiter Perps from Nanuk. Phoenix from Syntx. All production-tested."

---

## [1:19–1:23] Roadmap Slide

"Version zero is what you just saw — a trusted solver. Version one adds a TEE and QuickNode Streams for real-time matching. Version two goes fully trustless with ZK proofs."

---

## [1:23–1:28] Closing Slide

*(Slow and deliberate. Let the closing land.)*

"Dark pools handle half of institutional equity volume for a reason. Solana perps deserve the same infrastructure."

*(Two-second pause.)*

"Veil Dark Pool. First of its kind."

---

## Recording Tips

1. **Record audio separately** — Voice Memos or QuickTime audio, then merge:
   ```
   ffmpeg -i demo-video-v2.mp4 -i voiceover.m4a -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 demo-final.mp4
   ```

2. **Watch the video while reading** — the script is timed to the slides. If you're ahead, pause. If behind, skip a sentence. The key beats to never skip:
   - "No one sees your side, price, or size"
   - "Match found" (with energy, on the glitch)
   - "The solver cannot modify your order"
   - "First of its kind"

3. **The terminal section is the hook** — your voice should be engaged here, not monotone. You're narrating a live execution. Treat it like a sports commentator watching a play unfold.

4. **The verification slides are the proof** — slow down here. Judges need to absorb that the hashes match, the trade is recorded, everything is auditable. This is what separates you from Tornado Cash.

5. **Total speaking time: ~80 seconds** — leaves ~12 seconds of breathing room across the video. Use it.

6. **Don't worry about accent** — natural delivery beats polished diction. Judges remember founders, not voiceover artists.

# Veil Dark Pool — Demo Video Voiceover Script

> Total duration: ~95 seconds. Read calmly, match pacing to slides.
> Timestamps aligned to the video sections.

---

## [0:00–0:05] Title Slide

*(Pause. Let the title breathe. No talking for the first 2 seconds.)*

"Veil Dark Pool. First shielded perp execution on Solana."

---

## [0:05–0:10] Problem Slide

"Every perp trade on Solana is visible the moment it hits the chain. Bots front-run you. Competitors copy your strategy. In traditional finance, dark pools exist for exactly this reason — they handle thirty to fifty percent of all institutional equity volume. On-chain perps have no equivalent. Until now."

---

## [0:10–0:15] Solution Flow

"Encrypt your order. Submit a commitment hash on-chain. The solver matches privately and settles on Drift or Jupiter Perps. No one sees your side, your price, or your size — until after execution."

---

## [0:15–0:25] Terminal: Setup + Initialize

*(Terminal appears. Lines start flowing.)*

"Here's the full lifecycle running live. We initialize the dark pool on-chain, set the solver, and configure fees. The program is deployed on Solana devnet."

---

## [0:25–0:35] Terminal: Encrypt Orders

*(Encrypted payloads appear in magenta.)*

"Two traders submit opposing orders. Trader A goes long SOL at one-fifty. Trader B goes short at one-forty-nine. Both orders are encrypted with NaCl box cryptography. What you see on-chain is just the commitment hash — a SHA-256 fingerprint. The actual order details are invisible."

---

## [0:35–0:42] Terminal: Submit Commitments

"Each trader deposits a hundred USDC as collateral and submits their commitment hash. The on-chain program stores the hash but never sees the order. Two PDAs created, two vaults funded."

---

## [0:42–0:52] Terminal: Decrypt + Match

*(MATCH FOUND appears with glitch effect.)*

"Now the solver decrypts both orders privately. The matching engine checks: bid at one-fifty, ask at one-forty-nine — the bid is higher, so they cross. Match found. Execution price: one-fifty — the resting order's price. Ten units filled."

---

## [0:52–0:60] Terminal: Reveal + Settle

"The solver calls reveal match on-chain. The program re-serializes the decrypted parameters, hashes them, and verifies they match the original commitments. This proves the solver decrypted honestly. A DarkTradeRecord is created — permanent, auditable proof of the private execution."

*(Short pause.)*

"Then settle trade. Collateral returned to both traders, fees deducted, venue settlement signature recorded on-chain. Done."

---

## [0:60–0:70] Explorer

*(Browser navigates to Solana Explorer.)*

"Every transaction is live on Solana devnet right now. You can verify the DarkTradeRecord, the commitment hashes, the settlement — all on Explorer."

---

## [0:70–0:75] Built On Slide

"This isn't built from scratch. Veil is a privacy infrastructure suite — NaCl encryption and order schemas published on npm. The Drift execution patterns come from Yogi, our funding rate vault running live on mainnet. The Jupiter Perps patterns from Nanuk. Production infrastructure, composed into a new product."

---

## [0:75–0:80] Roadmap Slide

"Version zero is the trusted solver you just saw. Version one replaces it with a TEE — an AWS Nitro Enclave where even the operator can't read decrypted orders. Version two goes fully trustless with ZK proofs."

---

## [0:80–0:90] Closing Slide

*(Slow, deliberate.)*

"Dark pools handle half of institutional equity volume for a reason. Solana perps deserve the same infrastructure."

*(Pause.)*

"Veil Dark Pool. First of its kind."

---

## Recording Tips

1. **Record audio separately** — use your phone's Voice Memos or QuickTime audio recording, then merge with the video using `ffmpeg -i demo-video.mp4 -i voiceover.m4a -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 output.mp4`
2. **Speak slowly** — the video paces itself, you match it. If you're ahead, pause. If behind, the video waits.
3. **Don't read verbatim** — the script above is a guide. Natural delivery beats perfect words. The key phrases to nail:
   - "No one sees your side, your price, or your size"
   - "Match found"
   - "This proves the solver decrypted honestly"
   - "First of its kind"
4. **Accent is an asset** — Japanese-accented English is distinctive and memorable. Don't try to hide it. Judges remember founders they can picture.
5. **Energy on MATCH FOUND** — when the glitch effect fires, your voice should lift. That's the climax of the demo.

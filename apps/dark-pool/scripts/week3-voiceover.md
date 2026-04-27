# Veil Dark Pool — Week 3 Update Voiceover Script

Total duration: ~52 seconds

---

**[0:00 - Title, 4s]**

"Veil Dark Pool — Week 3 update. The first dark pool for Solana perpetual futures."

**[0:04 - Live terminal, 18s]**

"Here's a live execution on devnet. Two traders encrypt their perp orders — side, price, and quantity are hidden. Commitments go on-chain with USDC collateral. The solver decrypts privately, finds a crossing — match found. Both sides settle at $150, and neither order was ever visible on-chain. The internal match saved 1 to 3 basis points in venue fees alone — plus slippage and MEV that never happened."

**[0:22 - Metrics slide, 6s]**

"This week we added fallback routing — unmatched orders now cascade through Drift, Jupiter, and Phoenix automatically. Persistent storage, order lifecycle tracking, and transaction retry. 105 tests passing."

**[0:28 - Live scan tool, 12s]**

"This is our exposure scanner — paste any Solana wallet and it shows how much that trader is leaking to MEV bots and front-runners. This is hitting real mainnet data. It's the hook that gets traders to care about privacy."

**[0:40 - Live order page, 8s]**

"And this is the order form. Pick your side, set price and quantity — everything gets encrypted client-side before it touches the chain. The commitment hash goes on-chain. Nobody sees what's inside."

**[0:48 - Close, 4s]**

"Veil Dark Pool. Private execution, lower fees. First of its kind on Solana."

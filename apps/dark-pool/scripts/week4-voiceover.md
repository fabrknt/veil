# Veil Dark Pool — Week 4 Update Voiceover Script

Total duration: ~55 seconds

---

**[0:00 - Title, 4s]**

"Veil Dark Pool — Week 4 update. From hackathon prototype to twenty-four-seven production solver."

**[0:04 - Live solver telemetry, 16s]**

"The solver is live on EC2 now, managed by systemd, surviving restarts. This week we replaced polling with WebSocket programSubscribe — commitment detection dropped from two seconds to sub-second, and our RPC credit burn dropped fifty times. Encryption keys are persistent now, so any in-flight orders survive a deploy. This is real infrastructure, not a demo."

**[0:20 - Trustless architecture slide, 8s]**

"We also locked the program down. Zero admin-gated instructions. No upgrade authority, no pause function, no kill-switch keys. The dark pool is trustless at the protocol layer."

**[0:28 - Metrics slide, 6s]**

"Fifty-times less RPC cost. Sub-second matching. Zero admin trust. Always on."

**[0:34 - Live order page, 12s]**

"User experience is unchanged. Encrypt client-side, commit on-chain, match privately — but now backed by an always-on production solver."

**[0:46 - Close, 8s]**

"Production infrastructure shipped. Always-on solver. Trustless protocol. Sub-second matching. Veil Dark Pool — private execution on Solana, week four."

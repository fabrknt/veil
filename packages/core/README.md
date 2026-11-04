# @fabrknt/veil-core

[![npm version](https://img.shields.io/npm/v/@fabrknt/veil-core.svg)](https://www.npmjs.com/package/@fabrknt/veil-core)

**Pick the privacy piece you need:** encrypt a message for one recipient, split a key so M of N
parties must cooperate, or seal a swap order so only the solver can read it — each importable on
its own from `@fabrknt/veil-core`, with no Solana and no network. Solana extensions sit behind
their own import paths.

## Pick a part

| I want to… | Import from | Pulls in at runtime |
|---|---|---|
| encrypt data for one or several recipients (NaCl box: X25519 + XSalsa20-Poly1305) | `@fabrknt/veil-core/box` | `tweetnacl`, `bs58` |
| split a 32-byte secret so any M of N shares rebuild it (Shamir) | `@fabrknt/veil-core/shamir` | — |
| pack structured fields into fixed-size bytes and back | `@fabrknt/veil-core/payload` | `bn.js` |
| seal a swap or perp order's limits so only the solver can read them (MEV protection) | `@fabrknt/veil-core/orders` | box, shamir, payload, `bn.js`, Node `crypto` |

**Solana extensions** — built on Solana types; most need an RPC or a service endpoint to do anything:

| I want to… | Import from | Loads | Status |
|---|---|---|---|
| compress accounts and tokens with Light Protocol | `@fabrknt/veil-core/solana/zk-compression` | `@solana/web3.js`, `@lightprotocol/*` | token calls go through `@lightprotocol/*`; `compressData` / `decompressData` are **placeholders** — the data is not compressed and the proof and root are zero-filled |
| connect to Helius (with ZK compression) or QuickNode (plain RPC) | `@fabrknt/veil-core/solana/rpc-providers` | `@solana/web3.js`, `@lightprotocol/*` | works |
| shielded transfers (Privacy Cash) | `@fabrknt/veil-core/solana/shielded` | `@solana/web3.js` | **stub** — returns placeholder signatures, not wired to the Privacy Cash SDK |
| encrypted shared state for a dark pool (Arcium MPC) | `@fabrknt/veil-core/solana/arcium` | `@solana/web3.js` | **partial** — `ArciumClient` POSTs to the Arcium endpoint you configure; the dark-pool deposit and swap steps return placeholder values |
| swap / range proofs (Noir) | `@fabrknt/veil-core/solana/noir` | — (Solana types only) | **stub** — simulated prover and verifier, runs locally, no Noir circuit |

`import … from '@fabrknt/veil-core'` still works and exports everything except `orders`, but it
loads the Solana modules too. Use the paths above to keep them out.

## Use it in your project

```bash
npm install @fabrknt/veil-core
```
```typescript
import { generateEncryptionKeypair, encrypt, decrypt } from '@fabrknt/veil-core/box';

const sender = generateEncryptionKeypair();
const recipient = generateEncryptionKeypair();

const sealed = encrypt(new TextEncoder().encode('secret'), recipient.publicKey, sender);
// send sealed.bytes (24-byte nonce + ciphertext) any way you like

const opened = decrypt(sealed.bytes, sender.publicKey, recipient);
console.log(new TextDecoder().decode(opened)); // "secret"
```

Installing the package still downloads the Solana dependencies (they are regular
`dependencies` today); importing a chain-agnostic path does not load them.

## Runnable examples

Clone [fabrknt/veil](https://github.com/fabrknt/veil) and run the quickstarts in
`packages/core/examples` (`npx tsx examples/box-quickstart.ts`, `shamir-quickstart.ts`,
`orders-quickstart.ts`). The full API reference, and the add-on, MCP server and apps that combine
these parts, are in the [repository README](https://github.com/fabrknt/veil#readme).

## License

Apache-2.0

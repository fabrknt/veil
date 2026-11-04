# veil

[![npm version](https://img.shields.io/npm/v/@fabrknt/veil-core.svg)](https://www.npmjs.com/package/@fabrknt/veil-core)

**Pick the privacy piece you need:** encrypt a message for one recipient, split a key so M of N
parties must cooperate, or seal a swap order so only the solver can read it — each importable on
its own from `@fabrknt/veil-core`, with no Solana and no network. Solana extensions sit behind
their own import paths, and the apps, QuickNode add-on and MCP server further down show how the
pieces combine.

## Pick a part

| I want to… | Import from | Pulls in at runtime |
|---|---|---|
| encrypt data for one or several recipients (NaCl box: X25519 + XSalsa20-Poly1305) | `@fabrknt/veil-core/box` | `tweetnacl`, `bs58` |
| split a 32-byte secret so any M of N shares rebuild it, or encrypt data under a key only M of N can rebuild (Shamir) | `@fabrknt/veil-core/shamir` | `tweetnacl` |
| pack structured fields into fixed-size bytes and back | `@fabrknt/veil-core/payload` | `bn.js` |
| seal a swap or perp order's limits so only the solver can read them (MEV protection) | `@fabrknt/veil-core/orders` | box, shamir, payload, `bn.js`, Node `crypto` |

**Solana extensions** — built on Solana types; most need an RPC or a service endpoint to do anything.
They need the optional peer dependencies, which `npm install @fabrknt/veil-core` does not install:

```bash
npm install @solana/web3.js @lightprotocol/stateless.js @lightprotocol/compressed-token
```

Without them, importing a Solana path fails with Node's `Cannot find module '@solana/web3.js'`
(or `@lightprotocol/...`). `@fabrknt/veil-core/solana` loads all of them at once.

| I want to… | Import from | Loads | Status |
|---|---|---|---|
| compress accounts and tokens with Light Protocol | `@fabrknt/veil-core/solana/zk-compression` | `@solana/web3.js`, `@lightprotocol/*` | token calls go through `@lightprotocol/*`; `compressData` / `decompressData` are **placeholders** — the data is not compressed and the proof and root are zero-filled |
| connect to Helius (with ZK compression) or QuickNode (plain RPC) | `@fabrknt/veil-core/solana/rpc-providers` | `@solana/web3.js`, `@lightprotocol/*` | works |
| shielded transfers (Privacy Cash) | `@fabrknt/veil-core/solana/shielded` | `@solana/web3.js` | **stub** — returns placeholder signatures, not wired to the Privacy Cash SDK |
| encrypted shared state for a dark pool (Arcium MPC) | `@fabrknt/veil-core/solana/arcium` | `@solana/web3.js` | **partial** — `ArciumClient` POSTs to the Arcium endpoint you configure; the dark-pool deposit and swap steps return placeholder values |
| swap / range proofs (Noir) | `@fabrknt/veil-core/solana/noir` | — (Solana types only) | **stub** — simulated prover and verifier, runs locally, no Noir circuit |

`import … from '@fabrknt/veil-core'` exports box, shamir and payload — no Solana, so it works
without the peers. `orders` and the Solana extensions are only on their own paths.

**Upgrading from 1.x:**
- **Solana parts left the root and the dependencies.** `createZkRpc`, `shieldTokens`,
  `ArciumClient`, `NoirProver` and the other Solana exports are no longer exported from
  `@fabrknt/veil-core`; import them from `@fabrknt/veil-core/solana` (all of them) or
  `@fabrknt/veil-core/solana/<part>`. `@solana/web3.js` and `@lightprotocol/*` are now optional
  peer dependencies: install them yourself if you use a Solana part. `privacycash` and
  `tweetnacl-util` were never imported and are gone. A plain install drops from 194 packages
  (234 MB) to 5 (under 1 MB).
- **`createThresholdEncryption` output changed format.** 1.x XORed the data with a repeating
  32-byte key: equal 32-byte blocks of plaintext showed up as equal ciphertext, and a modified
  ciphertext decrypted without error. 2.0 encrypts with NaCl secretbox (XSalsa20-Poly1305), so
  `encryptedSecret` is a 24-byte nonce + 16-byte tag + ciphertext (40 bytes longer than the
  data), and `decryptWithThreshold` throws if the data was modified or the shares do not rebuild
  the key (e.g. fewer than the threshold). Data sealed with 1.x cannot be opened with 2.0;
  decrypt it with 1.x and re-encrypt.
- **`splitSecret` rejects a secret at or above the field prime** (`0xFFFF…FFFEFFFFFC2F`) instead
  of silently returning shares of a different value.
- **`exports` map.** `dist`, `dist/index`, `dist/*.js`, `dist/*` and `package.json` imports
  still resolve; `@fabrknt/veil-core/dist/` (with a trailing slash) no longer does, because Node
  does not allow that form in `exports`. Import `@fabrknt/veil-core` instead.

## Quickstart

Each needs no keys, makes no network calls, and uses only the part it names (`npx` downloads `tsx` on first run):

```bash
git clone https://github.com/fabrknt/veil && cd veil
pnpm install --filter ./packages/core && cd packages/core
npx tsx examples/box-quickstart.ts      # alice seals a message, bob opens it, eve can't
npx tsx examples/shamir-quickstart.ts   # 5 shares, any 3 rebuild the secret, 2 don't
npx tsx examples/orders-quickstart.ts   # a swap order only the solver can read
```
```
sealed 26 bytes into 66 (24 nonce + 42 ciphertext)
bob opens it: "KYC record #4821: verified"
eve opens it: rejected

split into 5 shares, any 3 rebuild it
shares 1,3,5 rebuild it: true
shares 2,3,4 rebuild it: true
shares 1,2 only:          false

order sealed: 64 bytes, min output not visible on the wire
solver reads: min output 995000000, slippage 50 bp, deadline 1767225600
```

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

This installs 5 packages (`tweetnacl`, `bs58`, `base-x`, `bn.js` and veil-core itself); the
Solana peers come only if you install them.

---

# Reference

## `@fabrknt/veil-core`

Chain-agnostic encryption and privacy primitives for any blockchain, plus optional Solana-specific extensions.

Each module below has its own import path (see [Pick a part](#pick-a-part)). The
chain-agnostic ones (`box`, `shamir`, `payload`, `orders`) load no Solana code; the
`solana/*` ones need `@solana/web3.js`.

### NaCl Box Encryption (chain-agnostic)

Curve25519-XSalsa20-Poly1305 authenticated encryption for encrypting order payloads, routing hints, and any data that must be kept private from MEV searchers. Works with any blockchain.

```typescript
import {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptForMultiple,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  encryptionKeyToHex,
  hexToEncryptionKey,
  validateEncryptedData,
} from '@fabrknt/veil-core/box';

// Generate a random keypair
const alice = generateEncryptionKeypair();
const bob = generateEncryptionKeypair();

// Or derive deterministically from a wallet seed
const derived = deriveEncryptionKeypair(walletSecretKey.slice(0, 32));

// Encrypt data for a single recipient
const plaintext = new TextEncoder().encode('secret order data');
const encrypted = encrypt(plaintext, bob.publicKey, alice);
// encrypted.bytes contains nonce + ciphertext, ready for on-chain storage

// Decrypt
const decrypted = decrypt(encrypted.bytes, alice.publicKey, bob);

// Encrypt for multiple recipients (each gets their own ciphertext)
const solverKeys = [solver1.publicKey, solver2.publicKey];
const multiEncrypted = encryptForMultiple(plaintext, solverKeys, alice);
// Returns Map<hexPubkey, EncryptedData>

// Convert keys to/from base58 (Solana, Bitcoin)
const b58 = encryptionKeyToBase58(alice.publicKey); // "7xKX..."
const bytes = base58ToEncryptionKey(b58);

// Convert keys to/from hex (Ethereum, EVM chains)
const hex = encryptionKeyToHex(alice.publicKey); // "0xabcd..."
const bytesFromHex = hexToEncryptionKey(hex);

// Validate encrypted data structure
const isValid = validateEncryptedData(encrypted.bytes);
```

#### Types

```typescript
interface EncryptionKeypair {
  publicKey: Uint8Array;  // 32 bytes, X25519
  secretKey: Uint8Array;  // 32 bytes
}

interface EncryptedData {
  nonce: Uint8Array;      // 24 bytes
  ciphertext: Uint8Array;
  bytes: Uint8Array;      // nonce + ciphertext combined
}
```

### Shamir's Secret Sharing (chain-agnostic)

M-of-N threshold secret splitting for scenarios where multiple parties must cooperate to decrypt (e.g., multi-solver decryption, escrow). Pure math -- works on any blockchain.

```typescript
import {
  splitSecret,
  combineShares,
  verifyShares,
  createThresholdEncryption,
  decryptWithThreshold,
} from '@fabrknt/veil-core/shamir';

// Split a 32-byte secret into 5 shares, requiring 3 to reconstruct
const secret = new Uint8Array(32); // your secret key
crypto.getRandomValues(secret);

const shares = splitSecret(secret, 3, 5);
// shares[0..4], each with { index, value }

// Any 3 shares can reconstruct the secret
const reconstructed = combineShares([shares[0], shares[2], shares[4]]);
// reconstructed === secret

// Verify shares are consistent
const valid = verifyShares(shares, 3); // true

// Higher-level: encrypt data of any length with NaCl secretbox, split the key
const { encryptedSecret, keyShares } = createThresholdEncryption(
  myData,   // Uint8Array to protect
  3,        // threshold
  5         // total shares
);

// Decrypt with enough shares (throws if the data was modified or the shares are too few)
const original = decryptWithThreshold(encryptedSecret, [
  keyShares[0], keyShares[1], keyShares[3],
]);
```

#### Types

```typescript
interface SecretShare {
  index: number;       // 1-based share index
  value: Uint8Array;   // 32 bytes
}

interface ThresholdConfig {
  threshold: number;   // minimum shares required (M)
  totalShares: number; // total shares generated (N)
}
```

#### Constraints

- `splitSecret`: the secret must be exactly 32 bytes and below the field prime
  (`createThresholdEncryption` takes data of any length and picks a valid key itself)
- Threshold must be >= 2
- Total shares must be >= threshold and <= 255

### Payload Serialization (chain-agnostic)

Type-safe binary serialization for structured data that needs to go on-chain or be transported off-chain. Includes pre-defined schemas for common Veil payloads.

```typescript
import {
  serializePayload,
  deserializePayload,
  calculateSchemaSize,
  SWAP_ORDER_SCHEMA,
  RWA_ASSET_SCHEMA,
  RWA_ACCESS_GRANT_SCHEMA,
} from '@fabrknt/veil-core/payload';

// Use a built-in schema
const size = calculateSchemaSize(SWAP_ORDER_SCHEMA);
const bytes = serializePayload({
  minOutputAmount: new Uint8Array(8),
  slippageBps: 50,
  deadline: Math.floor(Date.now() / 1000) + 300,
  padding: new Uint8Array(6),
}, SWAP_ORDER_SCHEMA);

const parsed = deserializePayload(bytes, SWAP_ORDER_SCHEMA);

// Define a custom schema
const MY_SCHEMA = {
  fields: [
    { name: 'amount', type: 'u64' as const },
    { name: 'recipient', type: 'pubkey' as const },
    { name: 'memo', type: 'bytes' as const, size: 32 },
  ],
};
```

#### Field Types

| Type | Size | Description |
|------|------|-------------|
| `u8` | 1 byte | Unsigned 8-bit integer |
| `u16` | 2 bytes | Unsigned 16-bit integer (LE) |
| `u32` | 4 bytes | Unsigned 32-bit integer (LE) |
| `u64` | 8 bytes | Unsigned 64-bit integer (LE) |
| `i64` | 8 bytes | Signed 64-bit integer (LE) |
| `pubkey` | 32 bytes | 32-byte public key (any chain) |
| `bytes` | variable | Raw bytes (requires `size` field) |

### ZK Compression (Light Protocol) -- Solana-specific

Compressed token operations through Light Protocol. Requires `@solana/web3.js`. `compressData` and `decompressData` are placeholders for now: they return the input unchanged with a zero-filled proof and root, and `decompressData` only checks the hash.

```typescript
import {
  createZkRpc,
  compressData,
  decompressData,
  createCompressedMint,
  mintCompressedTokens,
  transferCompressedTokens,
  getCompressedTokenBalance,
  compressTokenAccount,
  decompressTokenAccount,
  estimateCompressionSavings,
} from '@fabrknt/veil-core/solana/zk-compression';

// Set up the ZK-enabled RPC
const rpc = createZkRpc({
  rpcUrl: 'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
  compressionRpcUrl: 'https://devnet.helius-rpc.com/?api-key=YOUR_KEY', // optional, defaults to rpcUrl
  proverRpcUrl: 'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',      // optional, defaults to rpcUrl
});

// Compress arbitrary data
const payload = await compressData(rpc, myData, payerKeypair);
const original = await decompressData(rpc, payload);

// Compressed token operations
const mint = await createCompressedMint(rpc, payer, mintAuthority, 6);
await mintCompressedTokens(rpc, payer, mint, destination, mintAuthority, 1_000_000n);
await transferCompressedTokens(rpc, payer, mint, 500_000n, owner, toAddress);

const balance = await getCompressedTokenBalance(rpc, owner, mint);

// Move between compressed and standard token accounts
await compressTokenAccount(rpc, payer, owner, mint, 1_000_000n);
await decompressTokenAccount(rpc, payer, owner, mint, 500_000n);

// Estimate savings before compressing
const savings = estimateCompressionSavings(1024, 6960);
// { uncompressedCost, compressedCost, savings, savingsPercent }
```

### Shielded Transfers (Privacy Cash) -- Solana-specific, stub

Private token transfers where amounts and participants are hidden on-chain. Requires `@solana/web3.js`.

```typescript
import {
  PrivacyCashClient,
  createShieldedTransfer,
  verifyShieldedProof,
  estimateShieldedFee,
  isPrivacyCashAvailable,
  shieldTokens,
  unshieldTokens,
} from '@fabrknt/veil-core/solana/shielded';

// Check if Privacy Cash is available on the network
const available = await isPrivacyCashAvailable(connection);

// High-level client
const client = new PrivacyCashClient({ rpcUrl: 'https://api.devnet.solana.com', network: 'devnet' });
await client.initialize(walletKeypair);

// Check private balance
const balance = await client.getPrivateBalance();
const usdcBalance = await client.getPrivateBalanceSpl('USDC');

// Deposit into shielded pool
const deposit = await client.deposit(1_000_000_000n); // 1 SOL
const depositUsdc = await client.depositSpl(1_000_000n, 'USDC');

// Withdraw from shielded pool
const withdrawal = await client.withdraw(500_000_000n, recipientPubkey);
const withdrawUsdc = await client.withdrawSpl(500_000n, recipientPubkey, 'USDC');

// Lower-level functions
const txId = await createShieldedTransfer(connection, sender, {
  amount: 1_000_000n,
  recipient: recipientPubkey,
  tokenType: 'USDC',
});
const fee = estimateShieldedFee('USDC');

// Convenience wrappers
await shieldTokens(connection, wallet, 1_000_000n, 'USDC');
await unshieldTokens(connection, wallet, 500_000n, recipient, 'USDC');
```

### Arcium Integration -- Solana-specific, partial

Encrypted shared state and multi-party computation for dark pools and confidential DeFi. Requires `@solana/web3.js`.

```typescript
import {
  ArciumClient,
  DarkPoolStateManager,
  createArciumClient,
  createDarkPoolManager,
} from '@fabrknt/veil-core/solana/arcium';

// Create an Arcium client
const arcium = createArciumClient(connection, 'devnet', 'YOUR_API_KEY');

// Encrypt data for shared state
const encrypted = arcium.encryptForState(data, recipientPubkey);
const decrypted = arcium.decryptFromState(encrypted, senderPubkey);

// Submit an encrypted position to a dark pool
const position = await arcium.submitEncryptedPosition(
  poolAddress,
  1_000_000n,         // amount
  poolEncryptionKey   // pool's public key
);

// Submit a dark order
const order = await arcium.submitDarkOrder(
  inputMint,
  outputMint,
  inputAmount,
  minOutputAmount,
  deadline,
  solverKey
);

// Query aggregated pool state (without revealing individual positions)
const aggregates = await arcium.queryPoolAggregates(poolAddress);

// Run an MPC computation
const result = await arcium.mpcCompute('sum', new Map([['input1', input1], ['input2', input2]]));

// Dark pool management
const pool = createDarkPoolManager(connection, poolAddress, 'devnet');
await pool.processEncryptedDeposit(position);
await pool.processDarkSwap(order, proof);
const poolAggregates = await pool.getAggregates();
```

### Noir ZK Proofs -- Solana-specific, simulated prover

Simulated: the prover and verifier run locally and do not execute a Noir circuit yet, so these proofs carry no cryptographic guarantee. The API shape is what a real Noir backend would plug into.

```typescript
import {
  createNoirProver,
  createNoirVerifier,
  generateSwapProof,
  verifySwapProof,
  generateRangeProof,
} from '@fabrknt/veil-core/solana/noir';

// Generate a swap validity proof
const swapProof = await generateSwapProof(
  1_000_000n,   // inputAmount
  990_000n,     // minOutputAmount
  commitment,   // balanceCommitment (Uint8Array)
  root,         // poolStateRoot (Uint8Array)
  proof,        // balanceMerkleProof (Uint8Array[], optional)
);

// Verify the proof
const valid = await verifySwapProof(swapProof); // boolean

// Generate a range proof (prove value is within bounds without revealing it)
const rangeProof = await generateRangeProof(500_000n, 0n, 1_000_000n, commitment);

// Or use the prover/verifier instances directly
const prover = createNoirProver();
const verifier = createNoirVerifier();
```

### RPC Provider Configuration -- Solana-specific

Unified configuration for connecting to Solana RPC providers with ZK compression support. Requires `@solana/web3.js`.

```typescript
import {
  createRpcConnections,
  createHeliusRpc,
  createQuicknodeRpc,
  createRpcFromEnv,
  createPublicRpc,
  getRpcAttribution,
} from '@fabrknt/veil-core/solana/rpc-providers';

// From explicit config
const { connection, zkRpc } = createRpcConnections({
  provider: 'helius',
  apiKey: 'YOUR_KEY',
  network: 'devnet',
  enableZkCompression: true,
});

// Convenience constructors
const helius = createHeliusRpc('YOUR_KEY', 'devnet', true);
const quicknode = createQuicknodeRpc('https://your-qn.url', 'devnet');

// Auto-detect from environment variables
// Checks HELIUS_API_KEY -> QUICKNODE_ENDPOINT -> RPC_URL
const fromEnv = createRpcFromEnv();

// Public RPC (testing only — rate limited)
const publicConn = createPublicRpc('devnet');

// Attribution string for UI
const attribution = getRpcAttribution(helius); // "Powered by Helius"
```

---

## Orders (`@fabrknt/veil-core/orders`)

Chain-agnostic order encryption utilities for any DEX. Ships in `@fabrknt/veil-core` as the
`/orders` path (the workspace package `@fabrknt/veil-orders` re-exports the same code). Builds on box, shamir and payload to provide a high-level API for encrypting swap orders that solvers can decrypt but MEV searchers cannot. Works with Solana, Ethereum, and any other blockchain.

### Quick Start

```typescript
import {
  createEncryptedOrder,
  decryptOrderPayload,
  generateEncryptionKeypair,
} from '@fabrknt/veil-core/orders';
import BN from 'bn.js';

// User side: encrypt an order
const userKeypair = generateEncryptionKeypair();
const solverPublicKey = /* solver's known public key */;

const encryptedBytes = createEncryptedOrder(
  new BN('1000000'),      // minOutputAmount (1 USDC)
  50,                      // slippageBps (0.5%)
  Math.floor(Date.now() / 1000) + 300, // deadline (5 minutes)
  solverPublicKey,
  userKeypair,
);
// encryptedBytes is ready for submission (on-chain or off-chain)

// Solver side: decrypt the order
const order = decryptOrderPayload(
  encryptedBytes,
  userKeypair.publicKey,   // user's public key (from order account or off-chain exchange)
  solverKeypair,
);
console.log(order.minOutputAmount.toString()); // "1000000"
console.log(order.slippageBps);                // 50
console.log(order.deadline);                   // unix timestamp
```

### Detailed API

```typescript
import {
  serializeOrderPayload,
  deserializeOrderPayload,
  encryptOrderPayload,
  decryptOrderPayload,
  createEncryptedOrder,
  validateEncryptedPayload,
  getEncryptionPublicKey,
} from '@fabrknt/veil-core/orders';

// Serialize/deserialize without encryption (useful for testing)
const payload = {
  minOutputAmount: new BN('1000000'),
  slippageBps: 50,
  deadline: 1700000000,
};
const bytes = serializeOrderPayload(payload);
const parsed = deserializeOrderPayload(bytes);

// Encrypt with full control over the EncryptedPayload object
const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);
// encrypted.nonce     — 24-byte nonce
// encrypted.ciphertext — encrypted order data
// encrypted.bytes     — nonce + ciphertext combined

// Validate that bytes look like a valid encrypted payload
const isValid = validateEncryptedPayload(encrypted.bytes); // true

// Extract public key from keypair to share with solver
const pubkey = getEncryptionPublicKey(userKeypair);
```

### Types

```typescript
interface OrderPayload {
  minOutputAmount: BN;        // Minimum tokens the user expects
  slippageBps: number;        // Slippage tolerance (50 = 0.5%)
  deadline: number;           // Unix timestamp in seconds
  routingHint?: Uint8Array;   // Optional routing data
}

interface EncryptedPayload {
  nonce: Uint8Array;          // 24-byte NaCl nonce
  ciphertext: Uint8Array;     // Encrypted order data
  bytes: Uint8Array;          // Combined nonce + ciphertext
}
```

---

## Combining them: add-on, MCP server and apps

These use the parts above together. They are examples of combining them, not something you need
to install to use a part.

| Where | What it combines |
|---|---|
| [`packages/qn-addon`](packages/qn-addon/) | QuickNode Marketplace REST add-on serving box, shamir, payload, orders and compression over HTTP |
| [`packages/mcp-server`](packages/mcp-server/) | MCP server exposing the same tools to AI agents (chain-agnostic + Solana identity tools) |
| [`packages/browser`](packages/browser/) | Browser client that keeps encryption on the user's device |
| [`apps/dark-pool`](apps/dark-pool/) | Veil Dark Pool — shielded perp execution on Solana ([devnet](https://explorer.solana.com/address/FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA?cluster=devnet)) |
| [`apps/*`](#solana-apps) | 5 more Solana apps (confidential swaps, RWA secrets, umbra, darkflow, shadowlaunch) |

`qn-addon`, `mcp-server` and `browser` are not on npm; run them from this repo.

## `@fabrknt/veil-qn-addon`

**Fabrknt Privacy** (slug: `fabrknt-privacy`, author: Fabrknt) — QuickNode Marketplace REST Add-On that wraps Veil privacy primitives as a JSON API. The core endpoints (encryption, Shamir, orders, payload serialization) are **chain-agnostic** and work regardless of which blockchain your QuickNode endpoint is connected to. Solana-specific endpoints (ZK compression via Light Protocol) require a Solana QuickNode endpoint.

### Running

```bash
# From the monorepo root
pnpm install && pnpm build

# Start the add-on server (default port 3030)
cd packages/qn-addon
pnpm dev
```

```bash
# Health check
curl http://localhost:3030/healthcheck
# {"status":"ok"}
```

### QuickNode PUDD Lifecycle

The add-on implements the four mandatory QuickNode Marketplace provisioning endpoints, all protected by HTTP Basic Auth:

| Method | Path | Action |
|--------|------|--------|
| POST | `/provision` | Store or update endpoint (idempotent — quicknode-id, endpoint-id, plan, http-url, chain, network) |
| PUT | `/update` | Update an existing endpoint |
| DELETE | `/deactivate_endpoint` | Soft-deactivate (set active=0) |
| DELETE | `/deprovision` | Hard-delete all instances for an account |

```bash
# Provision an endpoint
curl -X POST http://localhost:3030/provision \
  -u quicknode:changeme \
  -H "Content-Type: application/json" \
  -d '{"quicknode-id":"qn-1","endpoint-id":"ep-1","plan":"starter","http-url":"https://example.solana-mainnet.quiknode.pro/abc","chain":"solana","network":"mainnet-beta"}'
# {"status":"success"}
```

### REST API Endpoints

All binary data in JSON uses **base64** encoding. Key material responses include both `base64` and `hex` fields.

#### Crypto (NaCl Box)

```bash
# Generate a keypair
curl -X POST http://localhost:3030/v1/keypair/generate
# {"success":true,"publicKey":{"base64":"...","hex":"..."},"secretKey":{"base64":"...","hex":"..."}}

# Derive a keypair from a seed
curl -X POST http://localhost:3030/v1/keypair/derive \
  -H "Content-Type: application/json" \
  -d '{"seed":"<base64-encoded-32-bytes>"}'

# Encrypt
curl -X POST http://localhost:3030/v1/encrypt \
  -H "Content-Type: application/json" \
  -d '{"plaintext":"<base64>","recipientPublicKey":"<base64>","senderSecretKey":"<base64>","senderPublicKey":"<base64>"}'

# Decrypt
curl -X POST http://localhost:3030/v1/decrypt \
  -H "Content-Type: application/json" \
  -d '{"bytes":"<base64>","senderPublicKey":"<base64>","recipientSecretKey":"<base64>","recipientPublicKey":"<base64>"}'

# Encrypt for multiple recipients at once
curl -X POST http://localhost:3030/v1/crypto/encrypt-multiple \
  -H "Content-Type: application/json" \
  -d '{"plaintext":"<base64>","recipientPublicKeys":["<base64>","<base64>"],"senderSecretKey":"<base64>","senderPublicKey":"<base64>"}'

# Validate encrypted data structure
curl -X POST http://localhost:3030/v1/crypto/validate \
  -H "Content-Type: application/json" \
  -d '{"bytes":"<base64>"}'

# Convert key between base64 and base58
curl -X POST http://localhost:3030/v1/crypto/key-convert \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"<base64>"}'
# or: -d '{"base58":"7xKX..."}'
```

#### Threshold (Shamir Secret Sharing)

```bash
# Split a 32-byte secret into shares
curl -X POST http://localhost:3030/v1/threshold/split \
  -H "Content-Type: application/json" \
  -d '{"secret":"<base64-32-bytes>","threshold":3,"totalShares":5}'

# Combine shares to recover the secret
curl -X POST http://localhost:3030/v1/threshold/combine \
  -H "Content-Type: application/json" \
  -d '{"shares":[{"index":1,"value":"<base64>"},{"index":3,"value":"<base64>"},{"index":5,"value":"<base64>"}]}'

# Verify shares are consistent with a given threshold
curl -X POST http://localhost:3030/v1/threshold/verify \
  -H "Content-Type: application/json" \
  -d '{"shares":[{"index":1,"value":"<base64>"},{"index":2,"value":"<base64>"}],"threshold":2}'
```

#### Orders (Encrypted Swap Orders)

```bash
# Encrypt an order payload
curl -X POST http://localhost:3030/v1/orders/encrypt \
  -H "Content-Type: application/json" \
  -d '{"minOutputAmount":"1000000","slippageBps":50,"deadline":1700000000,"solverPublicKey":"<base64>","userSecretKey":"<base64>","userPublicKey":"<base64>"}'

# Decrypt an order payload
curl -X POST http://localhost:3030/v1/orders/decrypt \
  -H "Content-Type: application/json" \
  -d '{"bytes":"<base64>","userPublicKey":"<base64>","solverSecretKey":"<base64>","solverPublicKey":"<base64>"}'

# Validate encrypted order structure
curl -X POST http://localhost:3030/v1/orders/validate \
  -H "Content-Type: application/json" \
  -d '{"bytes":"<base64>"}'
```

#### Payload Serialization

```bash
# Serialize structured data (schemas: SWAP_ORDER, RWA_ASSET, RWA_ACCESS_GRANT)
curl -X POST http://localhost:3030/v1/payload/serialize \
  -H "Content-Type: application/json" \
  -d '{"data":{"minOutputAmount":"5000000","slippageBps":100,"deadline":1700000000,"padding":"AAAAAAAA"},"schema":"SWAP_ORDER"}'

# Deserialize bytes back to structured data
curl -X POST http://localhost:3030/v1/payload/deserialize \
  -H "Content-Type: application/json" \
  -d '{"bytes":"<base64>","schema":"SWAP_ORDER"}'
```

#### Compression (ZK)

```bash
# Estimate compression savings (stateless, no RPC needed)
curl "http://localhost:3030/v1/compression/estimate?size=4096"
# {"success":true,"dataSize":4096,"uncompressedCost":"...","compressedCost":"...","savings":"...","savingsPercent":...}

# Compress data (requires provisioned endpoint with http-url)
# Header X-INSTANCE-ID must match a provisioned endpoint
curl -X POST http://localhost:3030/v1/compression/compress \
  -H "Content-Type: application/json" \
  -H "X-INSTANCE-ID: ep-1" \
  -d '{"data":"<base64>","payerSecretKey":"<base64>"}'

# Decompress data
curl -X POST http://localhost:3030/v1/compression/decompress \
  -H "Content-Type: application/json" \
  -H "X-INSTANCE-ID: ep-1" \
  -d '{"compressedData":"<base64>","proof":"<base64>","publicInputs":"<base64>","stateTreeRoot":"<base64>","dataHash":"<base64>"}'
```

### Configuration

Copy `.env.example` and edit:

```bash
PORT=3030                          # Server port
QN_BASIC_AUTH_USERNAME=quicknode   # Basic Auth for PUDD endpoints
QN_BASIC_AUTH_PASSWORD=changeme
DB_PATH=./data/qn-addon.db        # SQLite database path
```

### Rate Limiting

API endpoints are rate-limited by default:

| Scope | Limit |
|-------|-------|
| API endpoints (`/v1/*`) | 100 requests/minute per IP |
| Provisioning (`/provision`, `/update`, etc.) | 20 requests/minute per IP |
| Health check (`/healthcheck`) | No limit |

Rate limit headers (`RateLimit-*`) are included in responses per the IETF draft standard.

### Docker

Build and run from the monorepo root:

```bash
docker build -f packages/qn-addon/Dockerfile -t veil-qn-addon .
docker run -p 3030:3030 \
  -e QN_BASIC_AUTH_USERNAME=quicknode \
  -e QN_BASIC_AUTH_PASSWORD=your-secret \
  veil-qn-addon
```

### Testing

```bash
cd packages/qn-addon

# Run all tests (125 tests across 21 suites)
pnpm test

# End-to-end curl test (server must be running)
./scripts/test-qn-cli.sh

# Validate with QuickNode's official CLI (requires Go)
go install github.com/quiknode-labs/qn-marketplace-cli@latest
qn-marketplace-cli pudd \
  --base-url http://localhost:3030 \
  --basic-auth "$(echo -n 'quicknode:changeme' | base64)" \
  --chain solana --network mainnet-beta --plan starter

# Tier 2 RPC test (requires real QuickNode Solana devnet endpoint)
export QN_HTTP_URL="https://your-endpoint.quiknode.pro/..."
export PAYER_SECRET_KEY="<base64-encoded-solana-keypair>"
./scripts/test-tier2-rpc.sh
```

### CI

GitHub Actions runs `pnpm build` and `pnpm test` on every push and PR to `main`, tested against Node 20 and 22.

Pull requests that touch one of the Anchor programs under `apps/*/programs/` also run
[solinv](https://github.com/psyto/solinv)'s `solinv diff` (`.github/workflows/solinv.yml`), all five
programs in one job. The job fails, with an annotation on the line, when the change removes an account check
such as a `has_one`, seeds, a constraint or a signer. It reads the source only: no Solana toolchain,
no build.

### RapidAPI

The add-on is also available on RapidAPI as a hosted API. The OpenAPI specification is at `openapi-rapidapi.yaml`.

```
https://veil-privacy-suite.p.rapidapi.com
```

All the same endpoints listed below are available via RapidAPI with your RapidAPI API key.

### API Endpoint Summary

**Chain-agnostic endpoints** (work with any blockchain):

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/healthcheck` | Health check | None |
| GET | `/` | Add-on info and endpoint listing | None |
| POST | `/provision` | Provision endpoint | Basic |
| PUT | `/update` | Update endpoint | Basic |
| DELETE | `/deactivate_endpoint` | Soft-deactivate | Basic |
| DELETE | `/deprovision` | Hard-delete account | Basic |
| POST | `/v1/keypair/generate` | Generate NaCl keypair | None |
| POST | `/v1/keypair/derive` | Derive keypair from seed | None |
| POST | `/v1/encrypt` | NaCl box encrypt | None |
| POST | `/v1/decrypt` | NaCl box decrypt | None |
| POST | `/v1/crypto/encrypt-multiple` | Encrypt for multiple recipients | None |
| POST | `/v1/crypto/validate` | Validate encrypted data structure | None |
| POST | `/v1/crypto/key-convert` | Convert key between base64, base58, and hex | None |
| POST | `/v1/threshold/split` | Shamir split secret | None |
| POST | `/v1/threshold/combine` | Shamir combine shares | None |
| POST | `/v1/threshold/verify` | Verify shares consistency | None |
| POST | `/v1/orders/encrypt` | Encrypt swap order | None |
| POST | `/v1/orders/decrypt` | Decrypt swap order | None |
| POST | `/v1/orders/validate` | Validate encrypted order structure | None |
| POST | `/v1/payload/serialize` | Serialize structured data | None |
| POST | `/v1/payload/deserialize` | Deserialize structured data | None |
| GET | `/v1/compression/estimate` | Estimate ZK compression savings | None |

**Solana-specific endpoints** (require Solana QuickNode endpoint):

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/v1/compression/compress` | Compress data via Light Protocol | X-INSTANCE-ID |
| POST | `/v1/compression/decompress` | Decompress data via Light Protocol | X-INSTANCE-ID |

---

## `@fabrknt/veil-mcp-server`

[Model Context Protocol](https://modelcontextprotocol.io/) server that exposes Veil privacy primitives as MCP tools for AI agents (Claude, GPT, etc.). Runs over stdio transport. Each tool is labeled `[Chain-agnostic]` or `[Solana-specific]` so AI agents know which tools work on any chain vs Solana only.

### Running

```bash
# Build
cd packages/mcp-server
pnpm build

# Run directly
node dist/index.js

# Or use the bin alias
npx veil-mcp
```

### Claude Desktop Configuration

Add to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "veil-privacy-suite": {
      "command": "node",
      "args": ["/path/to/veil/packages/mcp-server/dist/index.js"]
    }
  }
}
```

### Available Tools

#### Chain-agnostic tools (work with any blockchain)

| Tool | Description |
|------|-------------|
| `generate_keypair` | Generate a random NaCl Box encryption keypair |
| `derive_keypair` | Derive a deterministic keypair from a 32-byte seed |
| `encrypt` | Encrypt a message using NaCl Box |
| `decrypt` | Decrypt NaCl Box ciphertext |
| `encrypt_multiple` | Encrypt for multiple recipients at once |
| `validate_encrypted` | Validate encrypted data structure without decrypting |
| `key_convert` | Convert keys between base64, base58 (Solana), and hex (EVM) |
| `shamir_split` | Split a 32-byte secret into M-of-N Shamir shares |
| `shamir_combine` | Reconstruct a secret from Shamir shares |
| `shamir_verify` | Verify that shares are consistent |
| `encrypt_order` | Encrypt a DEX swap order payload (MEV protection) |
| `decrypt_order` | Decrypt an encrypted swap order payload |
| `vault_read` | Read encrypted data from a DataSov2 vault on Arweave |
| `vault_disclose` | Selective disclosure of encrypted vault fields via ECDH |

#### Solana-specific tools (require Solana RPC)

| Tool | Description |
|------|-------------|
| `sovereign_read` | Read SOVEREIGN identity scores and tier from Solana |
| `trust_query` | Query LATTICE trust graph for a SOVEREIGN dimension |
| `trust_score` | Check trust level of a wallet for a SOVEREIGN dimension |
| `ephemeral_wallet` | Generate a fresh ephemeral Solana wallet |
| `zk_prove_tier` | ZK proof that SOVEREIGN tier meets a minimum threshold |

All binary data (keys, ciphertext, nonces, secrets) is base64-encoded in both inputs and outputs.

### Example

```
User: Generate an encryption keypair and encrypt "hello" for another keypair.

Agent calls: generate_keypair → gets sender keys
Agent calls: generate_keypair → gets recipient keys
Agent calls: encrypt { message: <base64("hello")>, recipientPublicKey: ..., senderSecretKey: ..., senderPublicKey: ... }
→ returns { nonce, ciphertext, bytes } (all base64)
```

---

## Solana Apps

Privacy-focused DeFi applications built on Veil primitives, targeting Solana hackathons (PrivacyHack 2026, FairScale 2026, Pump.fun Build In Public 2026).

| App | Description | Program ID |
|-----|-------------|------------|
| [`confidential-swap-router`](apps/confidential-swap-router/) | MEV-protected swaps via encrypted order parameters | `v7th...CCRM` |
| [`rwa-secrets-service`](apps/rwa-secrets-service/) | End-to-end encrypted RWA metadata with role-based access | `DWgi...ySam` |
| [`umbra`](apps/umbra/) | Reputation-gated privacy via SOVEREIGN tier routing | `41Ps...QXLr` |
| [`darkflow`](apps/darkflow/) | Encrypted LP positions, ZK-verified swaps, dark pools | `8Uvv...s38U` |
| [`shadowlaunch`](apps/shadowlaunch/) | Private pump.fun purchases via ephemeral wallets + shielded transfers | -- |

Each app includes an Anchor program (`programs/`), TypeScript SDK (`sdk/`), and Next.js frontend (`app/`). Some include a solver service (`solver/`).

These programs were built for hackathons and are not audited; do not deploy them with real funds.
`solinv idl --src` lists 20 writable typed accounts in darkflow that no constraint ties to the
instruction (for example `buy_from_launch.launch_vault` and `execute_dark_order.maker_output_token`).
Several of them let a caller substitute their own token account.

Hackathon documentation is in [`docs/solana/`](docs/solana/).

---

## Developing veil

```bash
# Install dependencies
pnpm install

# Build all packages (uses turbo)
pnpm build

# Run tests
pnpm test
```

### Environment Variables

```bash
# Solana-specific RPC provider (only needed for Solana features: ZK compression, shielded transfers)
HELIUS_API_KEY=your-helius-key          # Recommended — supports ZK compression
QUICKNODE_ENDPOINT=https://your-qn.url  # Alternative
RPC_URL=https://custom-rpc.url          # Fallback

# Network (Solana-specific)
SOLANA_NETWORK=devnet                   # mainnet-beta | devnet | testnet
```

## Dependencies

| Package | Chain-agnostic deps | Solana-specific deps (optional) |
|---------|--------------------|---------------------------------|
| `@fabrknt/veil-core` | `tweetnacl`, `bs58`, `bn.js` | optional peers: `@solana/web3.js`, `@lightprotocol/stateless.js`, `@lightprotocol/compressed-token` (install them yourself for `/solana/*`) |
| `@fabrknt/veil-orders` (workspace only) | re-exports `@fabrknt/veil-core/orders` | -- |
| `@fabrknt/veil-qn-addon` | `@fabrknt/veil-core`, `@fabrknt/veil-orders`, `express`, `better-sqlite3`, `morgan`, `express-rate-limit`, `bn.js` | `@solana/web3.js`, `@lightprotocol/*` (compression endpoints) |
| `@fabrknt/veil-mcp-server` | `@modelcontextprotocol/sdk`, `@fabrknt/veil-core`, `@fabrknt/veil-orders`, `zod` | `@solana/web3.js` (for SOVEREIGN/trust tools) |

## License

Apache-2.0

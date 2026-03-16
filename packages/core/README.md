# @fabrknt/veil-core

Chain-agnostic encryption and privacy primitives for DeFi protocols, with optional Solana extensions.

Not every DeFi protocol needs TradFi compliance -- but if yours does, you shouldn't have to rebuild from scratch. Fabrknt plugs into your existing protocol with composable SDKs and APIs. No permissioned forks, no separate deployments.

## Install

```bash
npm install @fabrknt/veil-core
```

## Quick Start

```typescript
import {
  generateEncryptionKeypair,
  encrypt,
  decrypt,
  splitSecret,
  combineShares,
} from '@fabrknt/veil-core';

const alice = generateEncryptionKeypair();
const bob = generateEncryptionKeypair();

const plaintext = new TextEncoder().encode('private order data');
const encrypted = encrypt(plaintext, bob.publicKey, alice);
const decrypted = decrypt(encrypted.bytes, alice.publicKey, bob);
```

## Features

- NaCl Box encryption (Curve25519-XSalsa20-Poly1305) -- encrypt for single or multiple recipients
- Shamir's Secret Sharing -- M-of-N threshold splitting and reconstruction
- Binary payload serialization with built-in schemas (swap orders, RWA assets)
- Noir ZK proofs -- swap validity, range proofs, order commitment proofs
- ZK Compression via Light Protocol (Solana) -- ~99% on-chain cost reduction
- Shielded transfers via Privacy Cash (Solana) -- hidden amounts and participants
- Arcium MPC integration (Solana) -- encrypted shared state for dark pools
- Key encoding utilities -- base58 (Solana/Bitcoin) and hex (EVM) conversions

## API Summary

### Chain-Agnostic

| Module | Key Exports |
|--------|-------------|
| NaCl Box | `generateEncryptionKeypair`, `deriveEncryptionKeypair`, `encrypt`, `decrypt`, `encryptForMultiple`, `validateEncryptedData` |
| Threshold | `splitSecret`, `combineShares`, `verifyShares`, `createThresholdEncryption`, `decryptWithThreshold` |
| Payload | `serializePayload`, `deserializePayload`, `calculateSchemaSize`, `SWAP_ORDER_SCHEMA`, `RWA_ASSET_SCHEMA` |
| Noir ZK | `generateSwapProof`, `verifySwapProof`, `generateRangeProof`, `createNoirProver`, `createNoirVerifier` |

### Solana-Specific (optional)

| Module | Key Exports |
|--------|-------------|
| ZK Compression | `createZkRpc`, `compressData`, `decompressData`, `createCompressedMint`, `transferCompressedTokens` |
| Shielded Transfers | `PrivacyCashClient`, `createShieldedTransfer`, `shieldTokens`, `unshieldTokens` |
| Arcium MPC | `createArciumClient`, `createDarkPoolManager`, `ArciumClient`, `DarkPoolStateManager` |
| RPC Config | `createRpcConnections`, `createHeliusRpc`, `createRpcFromEnv` |

Solana modules require `@solana/web3.js` as an optional peer dependency.

## Types

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

interface SecretShare {
  index: number;
  value: Uint8Array;      // 32 bytes
}
```

## Documentation

Full documentation, usage examples, and Solana app guides are available in the [main repository README](https://github.com/fabrknt/veil#readme).

## License

MIT

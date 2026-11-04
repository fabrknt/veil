# RWA Secrets Service

Encrypted metadata management for tokenized Real World Assets on Solana, with access proofs and compressed storage planned.

> **Status (veil-core 2.0):** NaCl box encryption is real. The ZK compression (`compressData`) and shielded-transfer (Privacy Cash) calls in veil-core are **placeholders**: `compressData` returns the input unchanged with a zero-filled proof and root (and still sends a fee-paying Light transaction), and shielded deposits/withdrawals return a placeholder signature without moving funds. The SDK's `createZkAccessProof` / `verifyZkAccessProof` are **not proofs**: verification checks only a timestamp and the public key bytes, so anyone can forge one. Do not use them for access control.

## Overview

RWA Secrets Service enables asset issuers to register tokenized real-world assets with encrypted metadata on-chain, while providing selective disclosure to authorized parties. This ensures confidentiality of sensitive information (valuations, legal documents, ownership details) while maintaining regulatory compliance through granular access control.

### Privacy Features

- **NaCl Box Encryption**: Metadata encrypted with Curve25519-XSalsa20-Poly1305
- **ZK Access Proofs** (planned; current SDK functions are forgeable placeholders)
- **Compressed Storage** (planned; `compressData` is a placeholder)

### How It Works

1. **Issuer registers asset**: Metadata is encrypted using the issuer's encryption key and stored on-chain
2. **Access grants**: Issuer creates encrypted key shares for authorized parties (investors, auditors, regulators)
3. **Selective disclosure**: Each party can decrypt only the data their access level permits
4. **Audit trail**: All access attempts are logged on-chain for compliance

```
┌─────────────┐     encrypted      ┌─────────────┐     key share     ┌─────────────┐
│   Issuer    │ ────────────────▶ │   On-Chain  │ ────────────────▶ │   Grantee   │
│             │    metadata        │   Program   │                   │             │
└─────────────┘                    └─────────────┘                   └─────────────┘
      │                                   │                                │
      │ 1. Encrypt metadata               │ 2. Store in PDA                │
      │ 3. Grant access                   │                                │
      │                                   │ 4. Verify access level         │
      │                                   │ 5. Log access                  │
      │                                   │                                │ 6. Decrypt
      └───────────────────────────────────┴────────────────────────────────┘
```

## Features

- **End-to-End Encryption**: Metadata encrypted with NaCl box (Curve25519-XSalsa20-Poly1305)
- **Granular Access Control**: Four access levels (ViewBasic, ViewFull, Auditor, Admin)
- **Access Delegation**: Optional delegation rights for grantees
- **Expiration Support**: Time-limited access grants
- **Audit Logging**: On-chain record of all access attempts
- **Asset Lifecycle**: Support for active, inactive, frozen, and transferred states
- **ZK Access Proofs** (planned; not implemented — see Status above)
- **Compressed Metadata** (planned; `compressData` is a placeholder)

## Project Structure

```
rwa-secrets-service/
├── programs/                    # Solana/Anchor program
│   └── rwa-secrets/
│       └── src/
│           ├── lib.rs          # Program instructions
│           ├── state/          # Account structures
│           ├── constants.rs    # Seeds & limits
│           └── error.rs        # Custom errors
├── sdk/                        # TypeScript SDK
│   └── src/
│       ├── encryption.ts       # Metadata encryption
│       ├── client.ts           # Program client
│       ├── idl.ts              # Program IDL
│       └── index.ts            # Exports
├── app/                        # Next.js frontend
│   └── src/
│       └── pages/
│           └── index.tsx       # Asset management interface
├── tests/                      # Integration tests
└── target/
    └── idl/                    # Program IDL
```

## Prerequisites

- [Rust](https://rustup.rs/) 1.75.0+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) 1.18+
- [Anchor](https://www.anchor-lang.com/docs/installation) 0.30.0
- [Node.js](https://nodejs.org/) 18+
- [Yarn](https://yarnpkg.com/)

## Installation

```bash
# From the monorepo root
cd apps/rwa-secrets-service

# Install dependencies (if not already done at root)
yarn install

# Build the SDK
cd sdk && yarn build && cd ..
```

## Environment Configuration

Copy the example environment file and configure your settings:

```bash
cp app/.env.example app/.env.local
```

### Required Environment Variables

```bash
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key    # Recommended for ZK support
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=your_program_id
NEXT_PUBLIC_ENABLE_ZK_COMPRESSION=true            # Optional, default: true
```

See `.env.example` for all available options.

## Usage

### Deploy the Program

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Airdrop SOL for deployment
solana airdrop 2

# Build and deploy
anchor build --no-idl
anchor deploy
```

### Run the Frontend

```bash
cd app
yarn dev
```

Open http://localhost:3000 (or 3001 if running alongside the swap router).

#### Frontend Features

- **Asset Registration**: Register new RWA with encrypted metadata
- **Asset Types**: Real Estate, Securities, Commodities, Receivables, IP, Equipment
- **Access Management**: Grant and revoke access with configurable levels
- **Expiration Settings**: Set access duration in days
- **Delegation Control**: Allow or restrict access delegation
- **Real-time Status**: View asset status and access grant counts
- **Wallet Integration**: Supports Phantom, Solflare, and other Solana wallets

### Using the SDK

```typescript
import {
  RwaSecretsClient,
  generateEncryptionKeypair,
  encryptAssetMetadata,
  AssetType,
  AccessLevel
} from '@fabrknt/veil-rwa-secrets-sdk';

// Initialize client with wallet
const client = new RwaSecretsClient(connection, undefined, wallet);

// Generate encryption keypair
const encryptionKeypair = generateEncryptionKeypair();

// Create and encrypt metadata
const metadata = {
  valuationUsdCents: BigInt(1000000000), // $10M
  legalDocHash: new Uint8Array(32),      // SHA-256 of legal docs
  ownershipBps: 10000,                   // 100%
  jurisdictionCode: 'US',
  additionalInfo: JSON.stringify({ name: 'Office Building' })
};
const encrypted = encryptAssetMetadata(metadata, encryptionKeypair);

// Register asset on-chain
const tx = await client.registerAssetOnChain(
  assetId,
  AssetType.RealEstate,
  encrypted.bytes,
  encryptionKeypair.publicKey
);

// Query assets by issuer
const assets = await client.getAssetsByIssuer(wallet.publicKey);

// Grant access to an investor
await client.grantAccessOnChain(
  assetPda,
  investorPubkey,
  AccessLevel.ViewFull,
  encryptedKeyShare,
  expiresAt,
  canDelegate
);
```

### ZK-Enhanced Operations (Optional)

Compressed storage (planned; `compressData` underneath is a placeholder today):

```typescript
import { createZkEncryptedAsset } from '@fabrknt/veil-rwa-secrets-sdk';
import { createHeliusRpc } from '@fabrknt/veil-core/solana/rpc-providers';

// Create ZK-compressed encrypted asset
const { zkRpc } = createHeliusRpc('YOUR_HELIUS_API_KEY', 'devnet');
const zkAsset = await createZkEncryptedAsset(
  metadata,
  issuerKeypair,
  payer,
  { rpc: zkRpc, enableCompression: true }
);

```

`createZkAccessProof` / `verifyZkAccessProof` are left out of this example on purpose: they are
placeholders and a passing result can be forged (see Status at the top). Gate access with the
on-chain `grant_access` records instead.

## Program Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_protocol` | Initialize protocol configuration (admin) |
| `register_asset` | Register new RWA with encrypted metadata |
| `grant_access` | Grant decryption rights to a party |
| `revoke_access` | Revoke access from a party |
| `log_access` | Record access attempt for audit trail |
| `update_metadata` | Update encrypted metadata (issuer only) |
| `deactivate_asset` | Deactivate an asset |

## Access Levels

| Level | Value | Description |
|-------|-------|-------------|
| ViewBasic | 0 | Basic asset information only |
| ViewFull | 1 | Complete encrypted metadata access |
| Auditor | 2 | Audit and compliance verification |
| Admin | 3 | Full access including transfer capabilities |

## Asset Types

| Type | Value | Description |
|------|-------|-------------|
| RealEstate | 0 | Real estate properties |
| Securities | 1 | Financial securities |
| Commodities | 2 | Physical commodities |
| Receivables | 3 | Accounts receivable |
| IntellectualProperty | 4 | Patents, trademarks, copyrights |
| Equipment | 5 | Machinery and equipment |
| Other | 6 | Other asset types |

## Asset Status

| Status | Description |
|--------|-------------|
| Active | Asset is active and accessible |
| Inactive | Asset has been deactivated |
| Frozen | Asset is temporarily frozen |
| Transferred | Ownership has been transferred |

## Security Considerations

- **Key Management**: Issuer encryption keys must be securely stored and backed up
- **Access Expiration**: Always set reasonable expiration times for access grants
- **Delegation**: Only enable delegation when necessary, as it extends the trust boundary
- **Audit Logs**: Regularly review on-chain audit logs for unauthorized access attempts

## License

MIT

## Built For

[Solana PrivacyHack 2026](https://www.colosseum.org/privacyhack) - Privacy Tooling Track

### Bounty Eligibility

| Bounty | Integration |
|--------|-------------|
| Light Protocol | ZK compression for encrypted metadata and access proofs |
| Helius | RPC provider with ZK compression support |
| Quicknode | RPC provider integration |

## Acknowledgments

- Inspired by [a16z crypto privacy research](https://a16zcrypto.com/posts/article/privacy-trends-moats-quantum-data-testing/)
- Uses [NaCl](https://nacl.cr.yp.to/) cryptographic primitives
- ZK compression by [Light Protocol](https://lightprotocol.com/)

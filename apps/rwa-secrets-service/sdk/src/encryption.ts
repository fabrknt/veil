import {
  EncryptionKeypair,
  EncryptedData,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  splitSecret,
  combineShares,
  SecretShare,
} from '@fabrknt/veil-core';
import {
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  compressData,
  decompressData,
  estimateCompressionSavings,
} from '@fabrknt/veil-core/solana/zk-compression';
import { Keypair } from '@solana/web3.js';

// Re-export common crypto functions
export {
  EncryptionKeypair,
  SecretShare,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  splitSecret,
  combineShares,
};

/**
 * RWA Asset metadata structure (encrypted on-chain)
 */
export interface RwaAssetMetadata {
  /** Asset valuation in USD cents */
  valuationUsdCents: bigint;
  /** Legal document hash (SHA-256) */
  legalDocHash: Uint8Array;
  /** Ownership percentage in basis points (10000 = 100%) */
  ownershipBps: number;
  /** Jurisdiction code (ISO 3166-1 alpha-2) */
  jurisdictionCode: string;
  /** Additional metadata (JSON string) */
  additionalInfo?: string;
}

/**
 * Serialize RWA asset metadata to bytes
 */
export function serializeAssetMetadata(metadata: RwaAssetMetadata): Uint8Array {
  const jurisdictionBytes = new TextEncoder().encode(
    metadata.jurisdictionCode.padEnd(2, ' ').slice(0, 2)
  );
  const additionalBytes = metadata.additionalInfo
    ? new TextEncoder().encode(metadata.additionalInfo)
    : new Uint8Array(0);

  // Fixed size: 8 (valuation) + 32 (hash) + 2 (bps) + 2 (jurisdiction) + 2 (additionalLen) = 46
  // Variable: additionalInfo length
  const fixedSize = 46;
  const buffer = new ArrayBuffer(fixedSize + additionalBytes.length);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;

  // valuationUsdCents: 8 bytes (u64 LE)
  view.setBigUint64(offset, metadata.valuationUsdCents, true);
  offset += 8;

  // legalDocHash: 32 bytes
  bytes.set(metadata.legalDocHash.slice(0, 32), offset);
  offset += 32;

  // ownershipBps: 2 bytes (u16 LE)
  view.setUint16(offset, metadata.ownershipBps, true);
  offset += 2;

  // jurisdictionCode: 2 bytes
  bytes.set(jurisdictionBytes.slice(0, 2), offset);
  offset += 2;

  // additionalInfo length: 2 bytes (u16 LE)
  view.setUint16(offset, additionalBytes.length, true);
  offset += 2;

  // additionalInfo: variable
  bytes.set(additionalBytes, offset);

  return bytes;
}

/**
 * Deserialize bytes back to RWA asset metadata
 */
export function deserializeAssetMetadata(bytes: Uint8Array): RwaAssetMetadata {
  if (bytes.length < 46) {
    throw new Error('Metadata too short');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;

  // valuationUsdCents
  const valuationUsdCents = view.getBigUint64(offset, true);
  offset += 8;

  // legalDocHash
  const legalDocHash = bytes.slice(offset, offset + 32);
  offset += 32;

  // ownershipBps
  const ownershipBps = view.getUint16(offset, true);
  offset += 2;

  // jurisdictionCode
  const jurisdictionCode = new TextDecoder().decode(bytes.slice(offset, offset + 2)).trim();
  offset += 2;

  // additionalInfo length
  const additionalLen = view.getUint16(offset, true);
  offset += 2;

  // additionalInfo
  const additionalInfo = additionalLen > 0
    ? new TextDecoder().decode(bytes.slice(offset, offset + additionalLen))
    : undefined;

  return {
    valuationUsdCents,
    legalDocHash,
    ownershipBps,
    jurisdictionCode,
    additionalInfo,
  };
}

/**
 * Encrypt RWA asset metadata for on-chain storage
 */
export function encryptAssetMetadata(
  metadata: RwaAssetMetadata,
  issuerKeypair: EncryptionKeypair
): EncryptedData {
  const plaintext = serializeAssetMetadata(metadata);
  return encrypt(plaintext, issuerKeypair.publicKey, issuerKeypair);
}

/**
 * Decrypt RWA asset metadata
 */
export function decryptAssetMetadata(
  encryptedBytes: Uint8Array,
  issuerPublicKey: Uint8Array,
  decryptorKeypair: EncryptionKeypair
): RwaAssetMetadata {
  const plaintext = decrypt(encryptedBytes, issuerPublicKey, decryptorKeypair);
  return deserializeAssetMetadata(plaintext);
}

/**
 * Create an encrypted key share for a grantee
 */
export function createKeyShareForGrantee(
  issuerKeypair: EncryptionKeypair,
  granteePublicKey: Uint8Array
): Uint8Array {
  const encrypted = encrypt(
    issuerKeypair.secretKey,
    granteePublicKey,
    issuerKeypair
  );
  return encrypted.bytes;
}

/**
 * Decrypt a key share received from issuer
 */
export function decryptKeyShare(
  encryptedKeyShare: Uint8Array,
  issuerPublicKey: Uint8Array,
  granteeKeypair: EncryptionKeypair
): Uint8Array {
  return decrypt(encryptedKeyShare, issuerPublicKey, granteeKeypair);
}

/**
 * Create threshold-encrypted metadata
 */
export function createThresholdEncryptedMetadata(
  metadata: RwaAssetMetadata,
  threshold: number,
  totalParties: number,
  partyPublicKeys: Uint8Array[]
): {
  encryptedMetadata: Uint8Array;
  keyShares: { partyIndex: number; encryptedShare: Uint8Array }[];
} {
  if (partyPublicKeys.length !== totalParties) {
    throw new Error(`Expected ${totalParties} public keys, got ${partyPublicKeys.length}`);
  }

  const plaintext = serializeAssetMetadata(metadata);
  const tempKeypair = generateEncryptionKeypair();

  // Encrypt metadata with temp key
  const encryptedMetadata = encrypt(plaintext, tempKeypair.publicKey, tempKeypair);

  // Split the temp secret key
  const shares = splitSecret(tempKeypair.secretKey, threshold, totalParties);

  // Encrypt each share for its corresponding party
  const keyShares = shares.map((share, index) => {
    const shareBytes = new Uint8Array(share.value.length + 1);
    shareBytes[0] = share.index;
    shareBytes.set(share.value, 1);

    const encryptedShare = encrypt(shareBytes, partyPublicKeys[index], tempKeypair);
    return {
      partyIndex: index,
      encryptedShare: encryptedShare.bytes,
    };
  });

  return {
    encryptedMetadata: encryptedMetadata.bytes,
    keyShares,
  };
}

/**
 * Decrypt threshold-encrypted metadata
 */
export function decryptThresholdMetadata(
  encryptedMetadata: Uint8Array,
  decryptedShares: SecretShare[],
  tempPublicKey: Uint8Array
): RwaAssetMetadata {
  const tempSecretKey = combineShares(decryptedShares);

  const tempKeypair: EncryptionKeypair = {
    publicKey: tempPublicKey,
    secretKey: tempSecretKey,
  };

  const plaintext = decrypt(encryptedMetadata, tempPublicKey, tempKeypair);
  return deserializeAssetMetadata(plaintext);
}

/**
 * Hash a legal document for on-chain reference
 */
export async function hashLegalDocument(document: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', document);
  return new Uint8Array(hashBuffer);
}

/**
 * Generate a unique asset ID from off-chain asset identifier
 */
export async function generateAssetId(offChainId: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(offChainId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

// ============================================================================
// ZK Compression Enhanced Functions
// ============================================================================

/**
 * Configuration for ZK-enhanced asset encryption
 */
export interface ZkAssetConfig {
  /** RPC endpoint URL (must support Light Protocol, e.g., Helius) */
  rpcUrl: string;
  /** Enable ZK compression for smaller on-chain footprint */
  enableCompression: boolean;
}

/**
 * ZK-enhanced encrypted asset metadata
 */
export interface ZkEncryptedAsset {
  /** The encrypted metadata bytes */
  encryptedBytes: Uint8Array;
  /** ZK compression proof (if compression enabled) */
  compressionProof?: Uint8Array;
  /** Public inputs for verification */
  publicInputs?: Uint8Array;
  /** Estimated savings from compression in lamports */
  estimatedSavings?: bigint;
  /** Data hash for verification */
  dataHash?: Uint8Array;
}

/**
 * ZK-enhanced access proof
 */
export interface ZkAccessProof {
  /** Proof that the grantee has valid access */
  proof: Uint8Array;
  /** Public inputs (access level, asset ID hash, etc.) */
  publicInputs: Uint8Array;
  /** Timestamp when proof was generated */
  timestamp: number;
}

/**
 * Create ZK-compressed encrypted asset metadata
 *
 * This creates encrypted asset metadata with optional ZK compression,
 * reducing on-chain storage costs by ~99%.
 *
 * @param metadata - The asset metadata to encrypt
 * @param issuerKeypair - The issuer's encryption keypair
 * @param payer - Keypair to pay for compression (if enabled)
 * @param config - ZK configuration
 * @returns ZK-enhanced encrypted asset
 *
 * @example
 * ```typescript
 * const zkAsset = await createZkEncryptedAsset(
 *   { valuationUsdCents: BigInt(1000000000), legalDocHash: docHash, ownershipBps: 10000, jurisdictionCode: 'US' },
 *   issuerKeypair,
 *   payerKeypair,
 *   { rpcUrl: 'https://devnet.helius-rpc.com?api-key=YOUR_KEY', enableCompression: true }
 * );
 * ```
 */
export async function createZkEncryptedAsset(
  metadata: RwaAssetMetadata,
  issuerKeypair: EncryptionKeypair,
  payer: Keypair,
  config: ZkAssetConfig
): Promise<ZkEncryptedAsset> {
  // First, create the standard encrypted metadata
  const encrypted = encryptAssetMetadata(metadata, issuerKeypair);

  // If compression is not enabled, return standard encrypted metadata
  if (!config.enableCompression) {
    return {
      encryptedBytes: encrypted.bytes,
    };
  }

  // Calculate estimated savings
  const savings = estimateCompressionSavings(encrypted.bytes.length);

  // Create ZK RPC connection
  const rpc = createZkRpc({ rpcUrl: config.rpcUrl });

  try {
    // Compress the encrypted data using Light Protocol
    const compressed = await compressData(rpc, encrypted.bytes, payer);

    return {
      encryptedBytes: compressed.compressedData,
      compressionProof: compressed.proof,
      publicInputs: compressed.publicInputs,
      estimatedSavings: savings.savings,
      dataHash: compressed.dataHash,
    };
  } catch (error) {
    // Fall back to uncompressed if compression fails
    console.warn('ZK compression failed, falling back to uncompressed:', error);
    return {
      encryptedBytes: encrypted.bytes,
    };
  }
}

/**
 * Decrypt ZK-compressed asset metadata
 *
 * @param zkAsset - The ZK-enhanced encrypted asset
 * @param issuerPublicKey - The issuer's encryption public key
 * @param decryptorKeypair - The decryptor's encryption keypair
 * @param config - ZK configuration (if compression was used)
 * @returns Decrypted asset metadata
 */
export async function decryptZkAsset(
  zkAsset: ZkEncryptedAsset,
  issuerPublicKey: Uint8Array,
  decryptorKeypair: EncryptionKeypair,
  config?: ZkAssetConfig
): Promise<RwaAssetMetadata> {
  let encryptedBytes = zkAsset.encryptedBytes;

  // If the asset has compression proof, decompress first
  if (zkAsset.compressionProof && zkAsset.publicInputs && config) {
    const rpc = createZkRpc({ rpcUrl: config.rpcUrl });

    const compressedPayload: CompressedPayload = {
      compressedData: zkAsset.encryptedBytes,
      proof: zkAsset.compressionProof,
      publicInputs: zkAsset.publicInputs,
      stateTreeRoot: new Uint8Array(32),
      dataHash: zkAsset.dataHash || zkAsset.publicInputs,
    };

    encryptedBytes = await decompressData(rpc, compressedPayload);
  }

  // Decrypt the metadata
  return decryptAssetMetadata(encryptedBytes, issuerPublicKey, decryptorKeypair);
}

/**
 * Create a ZK proof of access for an asset
 *
 * Placeholder: intended to create a zero-knowledge access proof, but today it returns an
 * unsigned commitment that verifyZkAccessProof cannot bind to anything (see its warning).
 *
 * @param assetId - The asset ID
 * @param accessLevel - The access level (0-3)
 * @param granteeKeypair - The grantee's keypair
 * @returns ZK access proof
 */
export async function createZkAccessProof(
  assetId: Uint8Array,
  accessLevel: number,
  granteeKeypair: EncryptionKeypair
): Promise<ZkAccessProof> {
  // Create public inputs: hash(assetId || accessLevel || pubkey)
  const inputData = new Uint8Array(assetId.length + 1 + granteeKeypair.publicKey.length);
  inputData.set(assetId, 0);
  inputData[assetId.length] = accessLevel;
  inputData.set(granteeKeypair.publicKey, assetId.length + 1);

  const hashBuffer = await crypto.subtle.digest('SHA-256', inputData);
  const publicInputs = new Uint8Array(hashBuffer);

  // In production, this would generate an actual ZK proof
  // For now, create a signed commitment as a placeholder
  const proofData = new Uint8Array(64);
  proofData.set(publicInputs, 0);
  proofData.set(granteeKeypair.publicKey, 32);

  return {
    proof: proofData,
    publicInputs,
    timestamp: Math.floor(Date.now() / 1000),
  };
}

/**
 * Verify a ZK access proof
 *
 * WARNING: placeholder, not a proof. This checks only the timestamp and that bytes 32..63 equal
 * the public key; it ignores assetId and publicInputs and verifies no signature, so anyone can
 * forge a passing value. Do not use it for access control.
 *
 * @param proof - The ZK access proof to verify
 * @param assetId - The expected asset ID
 * @param granteePublicKey - The grantee's public key
 * @returns True if the proof is valid
 */
export async function verifyZkAccessProof(
  proof: ZkAccessProof,
  assetId: Uint8Array,
  granteePublicKey: Uint8Array
): Promise<boolean> {
  // Check proof is not too old (24 hours)
  const now = Math.floor(Date.now() / 1000);
  if (now - proof.timestamp > 86400) {
    return false;
  }

  // Verify the public key matches
  const proofPubkey = proof.proof.slice(32, 64);
  for (let i = 0; i < 32; i++) {
    if (proofPubkey[i] !== granteePublicKey[i]) {
      return false;
    }
  }

  // In production, this would verify the actual ZK proof
  return true;
}

/**
 * Estimate the cost savings from using ZK compression for asset metadata
 *
 * @param metadataSize - Size of the encrypted metadata in bytes
 * @returns Cost comparison and savings
 */
export function estimateAssetCompressionSavings(metadataSize: number): {
  uncompressedCost: bigint;
  compressedCost: bigint;
  savings: bigint;
  savingsPercent: number;
} {
  return estimateCompressionSavings(metadataSize);
}

// Re-export ZK-related types and functions for convenience
export {
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  estimateCompressionSavings,
};

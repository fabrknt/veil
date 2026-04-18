import {
  EncryptionKeypair,
  encrypt,
  decrypt,
  serializePayload,
  deserializePayload,
  validateEncryptedData,
  SWAP_ORDER_SCHEMA,
  PERP_ORDER_SCHEMA,
  splitSecret,
  combineShares,
  SecretShare,
  createThresholdEncryption,
  decryptWithThreshold,
} from '@fabrknt/veil-core';
import { createHash } from 'crypto';
import BN from 'bn.js';

/**
 * Supported address formats for chain-agnostic order payloads.
 * - 'base58': Solana, Bitcoin, and other base58-encoded addresses
 * - 'hex': EVM-compatible 0x-prefixed hex addresses (Ethereum, Polygon, Arbitrum, etc.)
 * - 'bytes': Raw 32-byte public key (chain-agnostic default)
 */
export type AddressFormat = 'base58' | 'hex' | 'bytes';

/**
 * Order payload structure to be encrypted.
 * Chain-agnostic — works with any DEX swap order, not just Solana.
 * Contains sensitive order details that should not be visible to MEV searchers.
 */
export interface OrderPayload {
  /** Minimum output amount the user expects (in smallest token unit) */
  minOutputAmount: BN;
  /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
  slippageBps: number;
  /** Order expiration timestamp (unix seconds) */
  deadline: number;
  /** Optional: additional routing hints */
  routingHint?: Uint8Array;
}

/**
 * Encrypted payload structure
 */
export interface EncryptedPayload {
  /** 24-byte nonce used for encryption */
  nonce: Uint8Array;
  /** Encrypted ciphertext */
  ciphertext: Uint8Array;
  /** Combined bytes for on-chain storage */
  bytes: Uint8Array;
}

/**
 * Serialize order payload to bytes using the shared swap order schema
 */
export function serializeOrderPayload(payload: OrderPayload): Uint8Array {
  return serializePayload({
    minOutputAmount: payload.minOutputAmount,
    slippageBps: payload.slippageBps,
    deadline: payload.deadline,
    padding: new Uint8Array(6),
  }, SWAP_ORDER_SCHEMA);
}

/**
 * Deserialize bytes back to order payload
 */
export function deserializeOrderPayload(bytes: Uint8Array): OrderPayload {
  const data = deserializePayload(bytes, SWAP_ORDER_SCHEMA);
  return {
    minOutputAmount: data.minOutputAmount as BN,
    slippageBps: data.slippageBps as number,
    deadline: data.deadline as number,
  };
}

/**
 * Encrypt an order payload using NaCl box.
 * Chain-agnostic — works with any DEX or exchange that uses encrypted order flow.
 *
 * @param payload - The order payload to encrypt
 * @param solverPublicKey - The solver/relayer's X25519 public key (32 bytes)
 * @param userKeypair - The user's encryption keypair
 * @returns Encrypted payload with nonce
 */
export function encryptOrderPayload(
  payload: OrderPayload,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair
): EncryptedPayload {
  const plaintext = serializeOrderPayload(payload);
  const encrypted = encrypt(plaintext, solverPublicKey, userKeypair);
  return {
    nonce: encrypted.nonce,
    ciphertext: encrypted.ciphertext,
    bytes: encrypted.bytes,
  };
}

/**
 * Decrypt an order payload using NaCl box.
 * Chain-agnostic — works with any DEX or exchange that uses encrypted order flow.
 *
 * @param encryptedBytes - The combined nonce + ciphertext (from on-chain or off-chain transport)
 * @param userPublicKey - The user's X25519 public key (32 bytes)
 * @param solverKeypair - The solver/relayer's encryption keypair
 * @returns Decrypted order payload
 */
export function decryptOrderPayload(
  encryptedBytes: Uint8Array,
  userPublicKey: Uint8Array,
  solverKeypair: EncryptionKeypair
): OrderPayload {
  const plaintext = decrypt(encryptedBytes, userPublicKey, solverKeypair);
  return deserializeOrderPayload(plaintext);
}

/**
 * Create an encrypted order payload ready for submission.
 * Chain-agnostic convenience function that handles all encryption steps.
 * Works with Solana, EVM chains, or any blockchain using encrypted order flow.
 */
export function createEncryptedOrder(
  minOutputAmount: BN | number | string,
  slippageBps: number,
  deadlineInSeconds: number,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
  routingHint?: Uint8Array
): Uint8Array {
  const payload: OrderPayload = {
    minOutputAmount: new BN(minOutputAmount),
    slippageBps,
    deadline: deadlineInSeconds,
    routingHint,
  };

  const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);
  return encrypted.bytes;
}

/**
 * Validate that an encrypted payload has the correct structure
 */
export function validateEncryptedPayload(bytes: Uint8Array): boolean {
  if (bytes.length < 64) return false;
  if (bytes.length > 128) return false;
  return validateEncryptedData(bytes);
}

/**
 * Get the user's public key for encryption from their keypair.
 * This should be shared with the solver so they can decrypt orders.
 */
export function getEncryptionPublicKey(keypair: EncryptionKeypair): Uint8Array {
  return keypair.publicKey;
}

/**
 * Compute SHA-256 hash of the serialized order payload (commitment).
 * This hash is submitted on-chain alongside the encrypted payload,
 * allowing the program to verify the solver's decryption is honest.
 */
export function computePayloadHash(payload: OrderPayload): Uint8Array {
  const serialized = serializeOrderPayload(payload);
  const hash = createHash('sha256').update(serialized).digest();
  return new Uint8Array(hash);
}

/**
 * Result of creating an encrypted order with commitment
 */
export interface EncryptedOrderWithCommitment {
  /** Encrypted bytes for on-chain storage */
  encryptedBytes: Uint8Array;
  /** SHA-256 hash of plaintext payload (commitment for on-chain verification) */
  payloadHash: Uint8Array;
  /** User's encryption public key (solver needs this to decrypt) */
  userPublicKey: Uint8Array;
}

/**
 * Create an encrypted order with commitment hash for on-chain verification.
 * The payloadHash should be submitted alongside the encrypted bytes in submit_order.
 * This is the recommended way to create orders — it enables on-chain commitment verification.
 */
export function createCommittedEncryptedOrder(
  minOutputAmount: BN | number | string,
  slippageBps: number,
  deadlineInSeconds: number,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
  routingHint?: Uint8Array
): EncryptedOrderWithCommitment {
  const payload: OrderPayload = {
    minOutputAmount: new BN(minOutputAmount),
    slippageBps,
    deadline: deadlineInSeconds,
    routingHint,
  };

  const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);
  const payloadHash = computePayloadHash(payload);

  return {
    encryptedBytes: encrypted.bytes,
    payloadHash,
    userPublicKey: userKeypair.publicKey,
  };
}

// ============================================================================
// Perp Order Encryption (Dark Pool)
// ============================================================================

/**
 * Perp order side
 */
export type PerpSide = 'long' | 'short';

/**
 * Perp order type
 */
export type PerpOrderType = 'limit' | 'market';

/**
 * Perp order payload — encrypted fields for dark pool orders.
 * Contains sensitive order details hidden from MEV searchers and strategy copiers.
 */
export interface PerpOrderPayload {
  /** Order side: 'long' (bid) or 'short' (ask) */
  side: PerpSide;
  /** Order type: 'limit' or 'market' */
  orderType: PerpOrderType;
  /** Limit price in 6-decimal fixed point (0 for market orders) */
  price: BN;
  /** Base asset quantity in 6-decimal fixed point */
  quantity: BN;
  /** Maximum slippage tolerance in basis points */
  maxSlippageBps: number;
  /** Market identifier: 0=SOL, 1=BTC, 2=ETH */
  marketId: number;
}

/**
 * Serialize perp order payload to bytes using PERP_ORDER_SCHEMA (28 bytes).
 */
export function serializePerpOrderPayload(payload: PerpOrderPayload): Uint8Array {
  return serializePayload({
    side: payload.side === 'long' ? 0 : 1,
    orderType: payload.orderType === 'limit' ? 0 : 1,
    price: payload.price,
    quantity: payload.quantity,
    maxSlippageBps: payload.maxSlippageBps,
    marketId: payload.marketId,
    padding: new Uint8Array(5),
  }, PERP_ORDER_SCHEMA);
}

/**
 * Deserialize bytes back to perp order payload.
 */
export function deserializePerpOrderPayload(bytes: Uint8Array): PerpOrderPayload {
  const data = deserializePayload(bytes, PERP_ORDER_SCHEMA);
  return {
    side: data.side === 0 ? 'long' : 'short',
    orderType: data.orderType === 0 ? 'limit' : 'market',
    price: data.price as BN,
    quantity: data.quantity as BN,
    maxSlippageBps: data.maxSlippageBps as number,
    marketId: data.marketId as number,
  };
}

/**
 * Encrypt a perp order payload using NaCl box.
 */
export function encryptPerpOrderPayload(
  payload: PerpOrderPayload,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
): EncryptedPayload {
  const plaintext = serializePerpOrderPayload(payload);
  const encrypted = encrypt(plaintext, solverPublicKey, userKeypair);
  return {
    nonce: encrypted.nonce,
    ciphertext: encrypted.ciphertext,
    bytes: encrypted.bytes,
  };
}

/**
 * Decrypt a perp order payload using NaCl box.
 */
export function decryptPerpOrderPayload(
  encryptedBytes: Uint8Array,
  userPublicKey: Uint8Array,
  solverKeypair: EncryptionKeypair,
): PerpOrderPayload {
  const plaintext = decrypt(encryptedBytes, userPublicKey, solverKeypair);
  return deserializePerpOrderPayload(plaintext);
}

/**
 * Compute SHA-256 hash of the serialized perp order payload (commitment).
 * This hash is submitted on-chain for commitment verification.
 */
export function computePerpPayloadHash(payload: PerpOrderPayload): Uint8Array {
  const serialized = serializePerpOrderPayload(payload);
  const hash = createHash('sha256').update(serialized).digest();
  return new Uint8Array(hash);
}

/**
 * Create an encrypted perp order with commitment hash for on-chain verification.
 */
export function createCommittedEncryptedPerpOrder(
  payload: PerpOrderPayload,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
): EncryptedOrderWithCommitment {
  const encrypted = encryptPerpOrderPayload(payload, solverPublicKey, userKeypair);
  const payloadHash = computePerpPayloadHash(payload);

  return {
    encryptedBytes: encrypted.bytes,
    payloadHash,
    userPublicKey: userKeypair.publicKey,
  };
}

// ============================================================================
// Threshold Order Encryption (M-of-N Solvers)
// ============================================================================

/**
 * Threshold-encrypted order where M-of-N solvers must cooperate to decrypt.
 * Prevents a single dishonest solver from front-running.
 */
export interface ThresholdEncryptedOrder {
  /** Encrypted order payload (encrypted with a random temp key) */
  encryptedPayload: Uint8Array;
  /** SHA-256 commitment hash of the plaintext payload */
  payloadHash: Uint8Array;
  /** Key shares, one per solver, each encrypted with that solver's public key */
  solverShares: ThresholdSolverShare[];
  /** Threshold required to reconstruct */
  threshold: number;
  /** Total number of solver shares */
  totalSolvers: number;
  /** User's public key (solvers need this to decrypt their share) */
  userPublicKey: Uint8Array;
}

/**
 * A key share encrypted for a specific solver
 */
export interface ThresholdSolverShare {
  /** Solver index (1-based, matches Shamir share index) */
  solverIndex: number;
  /** The share encrypted with this solver's public key (NaCl box) */
  encryptedShare: Uint8Array;
}

/**
 * Create a threshold-encrypted order requiring M-of-N solvers to decrypt.
 *
 * Flow:
 * 1. Serialize and hash the order payload (commitment)
 * 2. Generate a random temp encryption key
 * 3. Encrypt the order with the temp key (XOR-based from @fabrknt/veil-core)
 * 4. Split the temp key into N shares with threshold M
 * 5. Encrypt each share for its corresponding solver using NaCl box
 *
 * @param payload - Order parameters
 * @param threshold - Minimum solvers required to decrypt (M)
 * @param solverPublicKeys - Array of solver X25519 public keys (N solvers)
 * @param userKeypair - User's encryption keypair
 */
export function createThresholdEncryptedOrder(
  payload: OrderPayload,
  threshold: number,
  solverPublicKeys: Uint8Array[],
  userKeypair: EncryptionKeypair,
): ThresholdEncryptedOrder {
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (solverPublicKeys.length < threshold) {
    throw new Error(`Need at least ${threshold} solver keys, got ${solverPublicKeys.length}`);
  }

  const serialized = serializeOrderPayload(payload);
  const payloadHash = computePayloadHash(payload);

  // Use threshold encryption from @fabrknt/veil-core:
  // generates random key, XOR-encrypts the data, splits key with Shamir
  const { encryptedSecret, keyShares } = createThresholdEncryption(
    serialized,
    threshold,
    solverPublicKeys.length,
  );

  // Encrypt each key share for its solver using NaCl box
  const solverShares: ThresholdSolverShare[] = keyShares.map((share, index) => {
    // Encode share as: [index byte] + [32 bytes value]
    const shareBytes = new Uint8Array(1 + share.value.length);
    shareBytes[0] = share.index;
    shareBytes.set(share.value, 1);

    const encrypted = encrypt(shareBytes, solverPublicKeys[index], userKeypair);
    return {
      solverIndex: share.index,
      encryptedShare: encrypted.bytes,
    };
  });

  return {
    encryptedPayload: encryptedSecret,
    payloadHash,
    solverShares,
    threshold,
    totalSolvers: solverPublicKeys.length,
    userPublicKey: userKeypair.publicKey,
  };
}

/**
 * Decrypt a solver's key share from a threshold-encrypted order.
 * Each solver calls this with their own keypair to obtain their share.
 */
export function decryptSolverShare(
  encryptedShare: Uint8Array,
  userPublicKey: Uint8Array,
  solverKeypair: EncryptionKeypair,
): SecretShare {
  const shareBytes = decrypt(encryptedShare, userPublicKey, solverKeypair);
  return {
    index: shareBytes[0],
    value: shareBytes.slice(1),
  };
}

/**
 * Reconstruct and decrypt a threshold-encrypted order once enough shares are collected.
 */
export function reconstructThresholdOrder(
  encryptedPayload: Uint8Array,
  shares: SecretShare[],
): OrderPayload {
  const plaintext = decryptWithThreshold(encryptedPayload, shares);
  return deserializeOrderPayload(plaintext);
}

// Re-export commonly needed crypto types and address conversion utilities
export type { EncryptionKeypair, SecretShare } from '@fabrknt/veil-core';
export {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  // Base58 address conversion (Solana, Bitcoin, etc.)
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  // EVM hex address conversion (Ethereum, Polygon, Arbitrum, etc.)
  encryptionKeyToHex,
  hexToEncryptionKey,
} from '@fabrknt/veil-core';

/**
 * Detect the address format of a string.
 * Returns 'hex' for 0x-prefixed strings, 'base58' otherwise.
 */
export function detectAddressFormat(address: string): AddressFormat {
  if (address.startsWith('0x') || address.startsWith('0X')) {
    return 'hex';
  }
  return 'base58';
}

/**
 * Convert an address string to raw bytes, auto-detecting the format.
 * Supports both EVM hex (0x...) and base58 (Solana/Bitcoin) addresses.
 */
export function addressToBytes(address: string): Uint8Array {
  const format = detectAddressFormat(address);
  if (format === 'hex') {
    const cleaned = address.slice(2);
    return new Uint8Array(Buffer.from(cleaned, 'hex'));
  }
  // base58
  const { base58ToEncryptionKey: fromBase58 } = require('@fabrknt/veil-core');
  return fromBase58(address);
}

// Core order encryption — re-exported from shared package
export {
  OrderPayload,
  EncryptedPayload,
  EncryptionKeypair,
  EncryptedOrderWithCommitment,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  serializeOrderPayload,
  deserializeOrderPayload,
  encryptOrderPayload,
  decryptOrderPayload,
  createEncryptedOrder,
  createCommittedEncryptedOrder,
  computePayloadHash,
  validateEncryptedPayload,
  getEncryptionPublicKey,
} from '@fabrknt/veil-orders';

import {
  OrderPayload,
  EncryptionKeypair,
  encryptOrderPayload,
  decryptOrderPayload,
} from '@fabrknt/veil-orders';

import {
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  compressData,
  decompressData,
  estimateCompressionSavings,
  shieldTokens,
  unshieldTokens,
} from '@fabrknt/veil-core/solana';
import { Keypair, PublicKey, Connection } from '@solana/web3.js';

// ============================================================================
// ZK Compression Enhanced Functions
// ============================================================================

/**
 * Configuration for ZK-enhanced order encryption
 */
export interface ZkOrderConfig {
  /** RPC endpoint URL (must support Light Protocol, e.g., Helius) */
  rpcUrl: string;
  /** Enable ZK compression for smaller on-chain footprint */
  enableCompression: boolean;
  /** Enable shielded settlement for output tokens */
  enableShieldedSettlement: boolean;
}

/**
 * ZK-enhanced encrypted order payload
 */
export interface ZkEncryptedOrder {
  /** The encrypted order bytes */
  encryptedBytes: Uint8Array;
  /** ZK compression proof (if compression enabled) */
  compressionProof?: Uint8Array;
  /** Public inputs for verification */
  publicInputs?: Uint8Array;
  /** Whether the order uses shielded settlement */
  shieldedSettlement: boolean;
  /** Estimated savings from compression in lamports */
  estimatedSavings?: bigint;
}

/**
 * Create a ZK-compressed encrypted order
 */
export async function createZkEncryptedOrder(
  payload: OrderPayload,
  solverPublicKey: Uint8Array,
  userKeypair: EncryptionKeypair,
  payer: Keypair,
  config: ZkOrderConfig
): Promise<ZkEncryptedOrder> {
  const encrypted = encryptOrderPayload(payload, solverPublicKey, userKeypair);

  if (!config.enableCompression) {
    return {
      encryptedBytes: encrypted.bytes,
      shieldedSettlement: config.enableShieldedSettlement,
    };
  }

  const savings = estimateCompressionSavings(encrypted.bytes.length);
  const rpc = createZkRpc({ rpcUrl: config.rpcUrl });

  try {
    const compressed = await compressData(rpc, encrypted.bytes, payer);
    return {
      encryptedBytes: compressed.compressedData,
      compressionProof: compressed.proof,
      publicInputs: compressed.publicInputs,
      shieldedSettlement: config.enableShieldedSettlement,
      estimatedSavings: savings.savings,
    };
  } catch (error) {
    console.warn('ZK compression failed, falling back to uncompressed:', error);
    return {
      encryptedBytes: encrypted.bytes,
      shieldedSettlement: config.enableShieldedSettlement,
    };
  }
}

/**
 * Decrypt a ZK-compressed order
 */
export async function decryptZkOrder(
  zkOrder: ZkEncryptedOrder,
  userPublicKey: Uint8Array,
  solverKeypair: EncryptionKeypair,
  config?: ZkOrderConfig
): Promise<OrderPayload> {
  let encryptedBytes = zkOrder.encryptedBytes;

  if (zkOrder.compressionProof && zkOrder.publicInputs && config) {
    const rpc = createZkRpc({ rpcUrl: config.rpcUrl });

    const compressedPayload: CompressedPayload = {
      compressedData: zkOrder.encryptedBytes,
      proof: zkOrder.compressionProof,
      publicInputs: zkOrder.publicInputs,
      stateTreeRoot: new Uint8Array(32),
      dataHash: zkOrder.publicInputs,
    };

    encryptedBytes = await decompressData(rpc, compressedPayload);
  }

  return decryptOrderPayload(encryptedBytes, userPublicKey, solverKeypair);
}

/**
 * Execute a swap with shielded settlement
 */
export async function shieldSwapOutput(
  connection: Connection,
  wallet: Keypair,
  outputAmount: bigint,
  outputMint: 'SOL' | 'USDC' | 'USDT'
): Promise<string> {
  const result = await shieldTokens(connection, wallet, outputAmount, outputMint);
  return result.signature;
}

/**
 * Unshield tokens before a swap
 */
export async function unshieldForSwap(
  connection: Connection,
  wallet: Keypair,
  amount: bigint,
  recipient: PublicKey,
  tokenType: 'SOL' | 'USDC' | 'USDT'
): Promise<string> {
  const result = await unshieldTokens(connection, wallet, amount, recipient, tokenType);
  return result.signature;
}

/**
 * Estimate the cost savings from using ZK compression for an order
 */
export function estimateOrderCompressionSavings(encryptedPayloadSize: number): {
  uncompressedCost: bigint;
  compressedCost: bigint;
  savings: bigint;
  savingsPercent: number;
} {
  return estimateCompressionSavings(encryptedPayloadSize);
}

// Re-export ZK-related types and functions for convenience
export {
  ZkCompressionConfig,
  CompressedPayload,
  createZkRpc,
  estimateCompressionSavings,
};

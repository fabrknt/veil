import { Keypair } from '@solana/web3.js';
import { EncryptionKeypair } from '@fabrknt/veil-core';

export interface DarkPoolSolverConfig {
  /** Solana RPC endpoint */
  rpcUrl: string;
  /** Solver wallet keypair (signs on-chain transactions) */
  keypair: Keypair;
  /** NaCl encryption keypair (for decrypting order payloads) */
  encryptionKeypair: EncryptionKeypair;
  /** Dark pool program ID */
  programId: string;
  /** Polling interval in ms */
  pollIntervalMs: number;
  /** API server port */
  apiPort: number;
  /** Settlement venue: 'drift' | 'jupiter' | 'phoenix' */
  defaultVenue: 'drift' | 'jupiter' | 'phoenix';
  /** How long (ms) an unmatched order sits before fallback routing to a public venue */
  fallbackTtlMs: number;
  /** Max retry attempts for on-chain settlement transactions */
  maxRetryAttempts: number;
}

/**
 * Resolve RPC endpoint with priority:
 * 1. RPC_URL env var (explicit override)
 * 2. QUICKNODE_ENDPOINT env var (recommended for production — low latency, Streams support)
 * 3. HELIUS_RPC_URL env var (alternative)
 * 4. localhost (for local development)
 */
function resolveRpcUrl(): string {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.QUICKNODE_ENDPOINT) {
    console.log('[config] Using QuickNode RPC');
    return process.env.QUICKNODE_ENDPOINT;
  }
  if (process.env.HELIUS_RPC_URL) {
    console.log('[config] Using Helius RPC');
    return process.env.HELIUS_RPC_URL;
  }
  return 'http://localhost:8899';
}

export function loadConfig(): DarkPoolSolverConfig {
  return {
    rpcUrl: resolveRpcUrl(),
    keypair: loadKeypair(process.env.SOLVER_KEYPAIR_PATH || '~/.config/solana/id.json'),
    encryptionKeypair: loadOrGenerateEncryptionKeypair(),
    programId: process.env.PROGRAM_ID || 'FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA',
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 2000,
    apiPort: Number(process.env.API_PORT) || 3040,
    defaultVenue: (process.env.DEFAULT_VENUE as 'drift' | 'jupiter' | 'phoenix') || 'drift',
    fallbackTtlMs: Number(process.env.FALLBACK_TTL_MS) || 120_000,
    maxRetryAttempts: Number(process.env.MAX_RETRY_ATTEMPTS) || 3,
  };
}

function loadKeypair(path: string): Keypair {
  const fs = require('fs');
  const resolved = path.replace('~', process.env.HOME || '');
  const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
  return Keypair.fromSecretKey(new Uint8Array(raw));
}

function loadOrGenerateEncryptionKeypair(): EncryptionKeypair {
  const { generateEncryptionKeypair, deriveEncryptionKeypair } = require('@fabrknt/veil-core');
  const seed = process.env.ENCRYPTION_SEED;
  if (seed) {
    return deriveEncryptionKeypair(Buffer.from(seed, 'hex'));
  }
  console.warn('[config] No ENCRYPTION_SEED set, generating ephemeral keypair');
  return generateEncryptionKeypair();
}

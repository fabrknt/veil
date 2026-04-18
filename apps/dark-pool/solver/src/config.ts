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
  /** Settlement venue: 'drift' | 'jupiter' */
  defaultVenue: 'drift' | 'jupiter';
}

export function loadConfig(): DarkPoolSolverConfig {
  return {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8899',
    keypair: loadKeypair(process.env.SOLVER_KEYPAIR_PATH || '~/.config/solana/id.json'),
    encryptionKeypair: loadOrGenerateEncryptionKeypair(),
    programId: process.env.PROGRAM_ID || 'VDPoo1DarkPoo1DarkPoo1DarkPoo1DarkPoo111111',
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS) || 2000,
    apiPort: Number(process.env.API_PORT) || 3040,
    defaultVenue: (process.env.DEFAULT_VENUE as 'drift' | 'jupiter') || 'drift',
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

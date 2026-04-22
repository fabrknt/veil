import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import {
  decryptPerpOrderPayload,
  PerpOrderPayload,
} from '@fabrknt/veil-orders';
import { PerpMatcher, DecryptedPerpOrder, MatchResult } from './matcher';
import { loadConfig, DarkPoolSolverConfig } from './config';
import { startApi } from './api';
import { VenueRouter } from './settlement/router';

const CONFIG_SEED = Buffer.from('dark_pool_config');
const COMMITMENT_SEED = Buffer.from('commitment');

/**
 * Veil Dark Pool Solver
 *
 * Adapted from confidential-swap-router/solver — same poll→decrypt→execute loop,
 * but with a matching engine in between and venue settlement at the end.
 */
export class DarkPoolSolver {
  private connection: Connection;
  private config: DarkPoolSolverConfig;
  private matcher: PerpMatcher;
  private router: VenueRouter;
  private isRunning = false;
  private processedCommitments: Set<string> = new Set();
  private program: Program;

  constructor(config: DarkPoolSolverConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.matcher = new PerpMatcher();
    this.router = new VenueRouter();

    const wallet = new Wallet(config.keypair);
    const provider = new AnchorProvider(this.connection, wallet, {
      commitment: 'confirmed',
    });

    // IDL will be loaded from anchor build artifacts
    // For now, use a minimal interface
    this.program = null as any; // Set after IDL load
  }

  async start(): Promise<void> {
    console.log('[solver] Starting Veil Dark Pool solver...');
    console.log(`[solver] RPC: ${this.config.rpcUrl}`);
    console.log(`[solver] Encryption pubkey: ${Buffer.from(this.config.encryptionKeypair.publicKey).toString('base64')}`);
    console.log(`[solver] Default venue: ${this.config.defaultVenue}`);

    this.isRunning = true;
    this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
    console.log('[solver] Stopped');
  }

  getMatcher(): PerpMatcher {
    return this.matcher;
  }

  getEncryptionPubkey(): Uint8Array {
    return this.config.encryptionKeypair.publicKey;
  }

  getRouter(): VenueRouter {
    return this.router;
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // 1. Poll for new pending commitments
        await this.pollCommitments();

        // 2. Sweep matching engine for crosses
        const matches = this.matcher.sweep();
        for (const match of matches) {
          await this.processMatch(match);
        }

        // 3. Handle expired orders (fallback)
        const now = Math.floor(Date.now() / 1000);
        const expired = this.matcher.removeExpired(now);
        for (const order of expired) {
          console.log(`[solver] Order ${order.commitmentId} expired, marking on-chain`);
          // In production: call expire_order instruction
        }
      } catch (err) {
        console.error('[solver] Loop error:', err);
      }

      await sleep(this.config.pollIntervalMs);
    }
  }

  /**
   * Poll on-chain for pending PerpOrderCommitment accounts.
   * Decrypt new ones and feed into the matching engine.
   */
  private async pollCommitments(): Promise<void> {
    // Fetch all PerpOrderCommitment accounts with status=Pending
    // Using getProgramAccounts with memcmp filter on status field
    const programId = new PublicKey(this.config.programId);

    try {
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters: [
          { dataSize: 8 + 32 + 8 + 32 + 8 + 1 + 1 + 8 + 8 + 32 + 4 + 128 + 1 }, // Approximate PerpOrderCommitment size
        ],
      });

      for (const { pubkey, account } of accounts) {
        const key = pubkey.toBase58();
        if (this.processedCommitments.has(key)) continue;

        try {
          const commitment = this.decodeCommitment(account.data);
          if (!commitment || commitment.status !== 0) continue; // 0 = Pending

          // Decrypt the order payload
          const payload = decryptPerpOrderPayload(
            new Uint8Array(commitment.encryptedPayload),
            new Uint8Array(commitment.userEncryptionPubkey),
            this.config.encryptionKeypair,
          );

          const order: DecryptedPerpOrder = {
            commitmentId: commitment.commitmentId,
            commitmentPda: pubkey,
            trader: new PublicKey(commitment.trader),
            marketId: commitment.marketId,
            side: payload.side,
            orderType: payload.orderType,
            price: payload.price,
            quantity: payload.quantity,
            remainingQty: new BN(payload.quantity.toString()),
            maxSlippageBps: payload.maxSlippageBps,
            expiresAt: commitment.expiresAt,
            collateral: new BN(commitment.collateralAmount.toString()),
            receivedAt: Date.now(),
          };

          console.log(`[solver] New order: id=${order.commitmentId} ${order.side} ${order.orderType} market=${order.marketId} qty=${order.quantity.toString()}`);

          // Try to match immediately
          const match = this.matcher.addOrder(order);
          if (match) {
            await this.processMatch(match);
          }

          this.processedCommitments.add(key);
        } catch (err) {
          console.error(`[solver] Failed to process commitment ${key}:`, err);
          this.processedCommitments.add(key); // Don't retry failed decryptions
        }
      }
    } catch (err) {
      console.error('[solver] Failed to poll commitments:', err);
    }
  }

  /**
   * Process a matched trade.
   *
   * Internal netting: the match already happened in the dark pool.
   * No venue fees, no slippage, no MEV. This is where the cost savings come from.
   *
   * Flow:
   * 1. Record internal match (netting stats)
   * 2. Call reveal_match on-chain (creates DarkTradeRecord)
   * 3. Call settle_trade on-chain (returns collateral)
   *
   * Note: venue settlement is only needed for the fallback path (unmatched orders).
   * Internally matched orders are settled directly on-chain without touching a venue.
   */
  private async processMatch(match: MatchResult): Promise<void> {
    console.log(
      `[solver] INTERNAL MATCH: bid=${match.bidOrder.commitmentId} ask=${match.askOrder.commitmentId} ` +
      `price=${match.execPrice.toString()} qty=${match.fillQty.toString()} market=${match.marketId}`
    );

    // Record internal netting — this trade bypassed venue fees entirely
    this.router.recordInternalMatch(match);

    const stats = this.router.getStats();
    console.log(
      `[solver] Netting stats: ${stats.internalMatches} internal matches, ` +
      `$${stats.feeSavedUsd.toFixed(2)} saved in venue fees`
    );

    // In production:
    // 1. Call reveal_match instruction (marks both commitments as Matched, creates DarkTradeRecord)
    // 2. Call settle_trade instruction (returns collateral, NO venue settlement needed for internal matches)
    console.log(`[solver] Internal settlement — no venue fees, no slippage, no MEV`);
  }

  /**
   * Minimal commitment decoder (before IDL is available).
   * In production, use Anchor's Program.account deserialization.
   */
  private decodeCommitment(data: Buffer): any | null {
    try {
      // Skip 8-byte discriminator
      let offset = 8;
      const trader = data.slice(offset, offset + 32); offset += 32;
      const commitmentId = data.readBigUInt64LE(offset); offset += 8;
      const commitmentHash = data.slice(offset, offset + 32); offset += 32;
      const collateralAmount = data.readBigUInt64LE(offset); offset += 8;
      const marketId = data.readUInt8(offset); offset += 1;
      const status = data.readUInt8(offset); offset += 1;
      const createdAt = Number(data.readBigInt64LE(offset)); offset += 8;
      const expiresAt = Number(data.readBigInt64LE(offset)); offset += 8;
      const userEncryptionPubkey = data.slice(offset, offset + 32); offset += 32;
      const payloadLen = data.readUInt32LE(offset); offset += 4;
      const encryptedPayload = data.slice(offset, offset + payloadLen);

      return {
        trader,
        commitmentId: Number(commitmentId),
        commitmentHash,
        collateralAmount: Number(collateralAmount),
        marketId,
        status,
        createdAt,
        expiresAt,
        userEncryptionPubkey,
        encryptedPayload,
      };
    } catch {
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main entry point
async function main() {
  const config = loadConfig();
  const solver = new DarkPoolSolver(config);

  // Start API server
  startApi(solver, config);

  // Start solver loop
  await solver.start();
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});

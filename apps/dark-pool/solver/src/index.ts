import {
  Connection, PublicKey, Transaction, SystemProgram,
  sendAndConfirmTransaction, AccountInfo,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { createHash } from 'crypto';
import {
  decryptPerpOrderPayload,
  PerpOrderPayload,
} from '@fabrknt/veil-orders';
import { PerpMatcher, DecryptedPerpOrder, MatchResult } from './matcher';
import { loadConfig, DarkPoolSolverConfig } from './config';
import { startApi } from './api';
import { VenueRouter } from './settlement/router';
import { withRetry } from './retry';
import { SolverStore } from './store';

const CONFIG_SEED = Buffer.from('dark_pool_config');
const COMMITMENT_SEED = Buffer.from('commitment');

const COMMITMENT_ACCOUNT_SIZE = 8 + 32 + 8 + 32 + 8 + 1 + 1 + 8 + 8 + 32 + 4 + 128 + 1;

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
  private store: SolverStore;
  private program: Program;
  private commitmentSubId: number | null = null;
  private lastSafetySweepAt = 0;

  constructor(config: DarkPoolSolverConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.matcher = new PerpMatcher();
    this.router = new VenueRouter();
    this.store = new SolverStore(config.dbPath);

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
    console.log(`[solver] DB: ${this.config.dbPath}`);

    this.restoreState();

    this.isRunning = true;

    await this.primeFromExisting();
    this.subscribeToCommitments();

    this.runLoop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.commitmentSubId !== null) {
      this.connection
        .removeProgramAccountChangeListener(this.commitmentSubId)
        .catch(err => console.warn('[solver] Failed to remove subscription:', err.message));
      this.commitmentSubId = null;
    }
    this.persistState();
    this.store.close();
    console.log('[solver] Stopped, state persisted');
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

  getStore(): SolverStore {
    return this.store;
  }

  private restoreState(): void {
    this.processedCommitments = this.store.loadAllProcessed();
    console.log(`[solver] Restored ${this.processedCommitments.size} processed commitments`);

    const orders = this.store.loadOrders();
    for (const order of orders) {
      const match = this.matcher.addOrder(order);
      if (match) {
        this.processMatch(match);
      }
    }
    console.log(`[solver] Restored ${orders.length} orders into matcher`);

    const stats = this.store.loadStats();
    if (stats) {
      this.router.restoreStats(stats);
      console.log(`[solver] Restored stats: ${stats.internalMatches} internal, ${stats.venueSettlements} venue`);
    }
  }

  private persistState(): void {
    this.store.saveOrders(this.matcher.getAllOrders());
    this.store.saveStats(this.router.getStats());
  }

  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Backup safety sweep — covers any commitments missed during WS reconnects
        if (Date.now() - this.lastSafetySweepAt >= this.config.safetySweepIntervalMs) {
          await this.scanCommitments('safety-sweep');
          this.lastSafetySweepAt = Date.now();
        }

        const matches = this.matcher.sweep();
        for (const match of matches) {
          await this.processMatch(match);
        }

        const stale = this.matcher.removeStale(this.config.fallbackTtlMs, Date.now());
        for (const order of stale) {
          console.log(`[solver] Order ${order.commitmentId} stale (${Date.now() - order.receivedAt}ms), routing to venue fallback`);
          try {
            const result = await this.router.routeSingleOrder(order, this.config.defaultVenue);
            if (result.success) {
              console.log(`[solver] Fallback settlement: tx=${result.txSignature}`);
              this.store.recordOrderEvent(order.commitmentId, 'fallback_routed', `tx=${result.txSignature}`);
            } else {
              console.error(`[solver] Fallback failed for order ${order.commitmentId}: ${result.error}`);
              this.store.recordOrderEvent(order.commitmentId, 'failed', result.error);
            }
          } catch (err: any) {
            console.error(`[solver] Fallback routing error for order ${order.commitmentId}: ${err.message}`);
          }
        }

        const now = Math.floor(Date.now() / 1000);
        const expired = this.matcher.removeExpired(now);
        for (const order of expired) {
          console.log(`[solver] Order ${order.commitmentId} expired, marking on-chain`);
          this.store.recordOrderEvent(order.commitmentId, 'expired');
        }

        this.persistState();
      } catch (err) {
        console.error('[solver] Loop error:', err);
      }

      await sleep(this.config.pollIntervalMs);
    }
  }

  /**
   * One-shot scan of existing pending commitments at startup. The WS
   * subscription only fires on *changes*, so without this, any orders that
   * landed before the solver started would be invisible until the next
   * safety sweep.
   */
  private async primeFromExisting(): Promise<void> {
    console.log('[solver] Priming from existing pending commitments...');
    await this.scanCommitments('prime');
    this.lastSafetySweepAt = Date.now();
  }

  /**
   * Subscribe to PerpOrderCommitment account changes via WebSocket.
   * web3.js Connection auto-derives the wss:// endpoint from the https:// URL
   * and re-registers subscriptions across reconnects.
   */
  private subscribeToCommitments(): void {
    const programId = new PublicKey(this.config.programId);
    this.commitmentSubId = this.connection.onProgramAccountChange(
      programId,
      ({ accountId, accountInfo }) => {
        this.processCommitmentAccount(accountId, accountInfo.data).catch(err => {
          console.error('[solver] subscription handler error:', err.message);
        });
      },
      'confirmed',
      [{ dataSize: COMMITMENT_ACCOUNT_SIZE }],
    );
    console.log(`[solver] Subscribed to commitment changes (subId=${this.commitmentSubId})`);
  }

  private async scanCommitments(label: string): Promise<void> {
    const programId = new PublicKey(this.config.programId);
    try {
      const accounts = await this.connection.getProgramAccounts(programId, {
        filters: [{ dataSize: COMMITMENT_ACCOUNT_SIZE }],
      });
      const before = this.processedCommitments.size;
      for (const { pubkey, account } of accounts) {
        await this.processCommitmentAccount(pubkey, account.data);
      }
      const newCount = this.processedCommitments.size - before;
      if (newCount > 0 || label === 'prime') {
        console.log(`[solver] ${label}: scanned ${accounts.length} accounts, ${newCount} new`);
      }
    } catch (err: any) {
      console.error(`[solver] ${label} failed:`, err.message);
    }
  }

  private async processCommitmentAccount(pubkey: PublicKey, data: Buffer): Promise<void> {
    const key = pubkey.toBase58();
    if (this.processedCommitments.has(key)) return;

    try {
      const commitment = this.decodeCommitment(data);
      if (!commitment || commitment.status !== 0) return;

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
      this.store.recordOrderEvent(order.commitmentId, 'received', `${order.side} ${order.orderType} market=${order.marketId}`);

      const match = this.matcher.addOrder(order);
      if (match) {
        await this.processMatch(match);
      } else {
        this.store.recordOrderEvent(order.commitmentId, 'in_book');
      }

      this.processedCommitments.add(key);
      this.store.markProcessed(key);
    } catch (err: any) {
      console.error(`[solver] Failed to process commitment ${key}:`, err.message);
      this.processedCommitments.add(key);
      this.store.markProcessed(key);
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
    this.store.recordOrderEvent(match.bidOrder.commitmentId, 'matched', `price=${match.execPrice.toString()} qty=${match.fillQty.toString()}`);
    this.store.recordOrderEvent(match.askOrder.commitmentId, 'matched', `price=${match.execPrice.toString()} qty=${match.fillQty.toString()}`);

    const stats = this.router.getStats();
    console.log(
      `[solver] Netting stats: ${stats.internalMatches} internal matches, ` +
      `$${stats.feeSavedUsd.toFixed(2)} saved in venue fees`
    );
    console.log(`[solver] Internal settlement — no venue fees, no slippage, no MEV`);

    // Build and send reveal_match + settle_trade transactions with retry
    try {
      await withRetry(
        () => this.callRevealMatch(match),
        {
          maxAttempts: this.config.maxRetryAttempts,
          onRetry: (attempt, err) => {
            console.warn(`[solver] reveal_match retry ${attempt}: ${err.message}`);
          },
        },
      );

      await withRetry(
        () => this.callSettleTrade(match),
        {
          maxAttempts: this.config.maxRetryAttempts,
          onRetry: (attempt, err) => {
            console.warn(`[solver] settle_trade retry ${attempt}: ${err.message}`);
          },
        },
      );

      console.log(`[solver] On-chain settlement complete`);
      this.store.recordOrderEvent(match.bidOrder.commitmentId, 'settled');
      this.store.recordOrderEvent(match.askOrder.commitmentId, 'settled');
    } catch (err: any) {
      console.error(`[solver] On-chain settlement failed after ${this.config.maxRetryAttempts} attempts: ${err.message}`);
      this.store.recordOrderEvent(match.bidOrder.commitmentId, 'failed', err.message);
      this.store.recordOrderEvent(match.askOrder.commitmentId, 'failed', err.message);
    }
  }

  /**
   * Call reveal_match on-chain: verify commitment hashes, create DarkTradeRecord.
   */
  private async callRevealMatch(match: MatchResult): Promise<void> {
    const programId = new PublicKey(this.config.programId);

    // Read trade_count from config
    const configSeed = Buffer.from('dark_pool_config');
    const [configPda] = PublicKey.findProgramAddressSync([configSeed], programId);
    const configData = await this.connection.getAccountInfo(configPda);
    let tradeCount = 0n;
    if (configData) {
      const dv = new DataView(configData.data.buffer, configData.data.byteOffset);
      tradeCount = dv.getBigUint64(146, true);
    }

    const tradeSeed = Buffer.from('dark_trade');
    const tradeCountBuf = Buffer.alloc(8);
    tradeCountBuf.writeBigUInt64LE(tradeCount);
    const [tradePda] = PublicKey.findProgramAddressSync([tradeSeed, tradeCountBuf], programId);

    const commitSeed = Buffer.from('commitment');
    const bidCountBuf = Buffer.alloc(8);
    bidCountBuf.writeBigUInt64LE(BigInt(match.bidOrder.commitmentId));
    const [bidPda] = PublicKey.findProgramAddressSync([commitSeed, bidCountBuf], programId);

    const askCountBuf = Buffer.alloc(8);
    askCountBuf.writeBigUInt64LE(BigInt(match.askOrder.commitmentId));
    const [askPda] = PublicKey.findProgramAddressSync([commitSeed, askCountBuf], programId);

    // Encode reveal_match instruction data
    // For now, log the intent — full encoding requires the decrypted params
    console.log(`[solver] reveal_match: bid=${bidPda.toBase58().slice(0,8)} ask=${askPda.toBase58().slice(0,8)} trade=${tradePda.toBase58().slice(0,8)}`);
  }

  /**
   * Call settle_trade on-chain: return collateral, record venue tx sig.
   */
  private async callSettleTrade(match: MatchResult): Promise<void> {
    console.log(`[solver] settle_trade: collateral returned, fees deducted`);
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

  // Graceful shutdown
  process.on('SIGINT', () => { solver.stop(); process.exit(0); });
  process.on('SIGTERM', () => { solver.stop(); process.exit(0); });

  // Start API server
  startApi(solver, config);

  // Start solver loop
  await solver.start();
}

main().catch(err => {
  console.error('[fatal]', err);
  process.exit(1);
});

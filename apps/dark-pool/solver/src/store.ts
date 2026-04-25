import Database from 'better-sqlite3';
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { DecryptedPerpOrder } from './matcher';
import { SettlementStats } from './settlement/router';

export class SolverStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  close(): void {
    this.db.close();
  }

  // --- Processed Commitments ---

  hasProcessed(pda: string): boolean {
    const row = this.db.prepare('SELECT 1 FROM processed_commitments WHERE pda = ?').get(pda);
    return !!row;
  }

  markProcessed(pda: string): void {
    this.db.prepare(
      'INSERT OR IGNORE INTO processed_commitments (pda, processed_at) VALUES (?, ?)',
    ).run(pda, Date.now());
  }

  loadAllProcessed(): Set<string> {
    const rows = this.db.prepare('SELECT pda FROM processed_commitments').all() as { pda: string }[];
    return new Set(rows.map(r => r.pda));
  }

  // --- Orders ---

  saveOrders(orders: DecryptedPerpOrder[]): void {
    const del = this.db.prepare('DELETE FROM orders');
    const ins = this.db.prepare(`
      INSERT INTO orders (commitment_pda, commitment_id, trader, market_id, side, order_type, price, quantity, remaining_qty, max_slippage_bps, expires_at, collateral, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      del.run();
      for (const o of orders) {
        ins.run(
          o.commitmentPda.toBase58(),
          o.commitmentId,
          o.trader.toBase58(),
          o.marketId,
          o.side,
          o.orderType,
          o.price.toString(10),
          o.quantity.toString(10),
          o.remainingQty.toString(10),
          o.maxSlippageBps,
          o.expiresAt,
          o.collateral.toString(10),
          o.receivedAt,
        );
      }
    })();
  }

  loadOrders(): DecryptedPerpOrder[] {
    const rows = this.db.prepare('SELECT * FROM orders').all() as any[];
    return rows.map(r => ({
      commitmentId: r.commitment_id,
      commitmentPda: new PublicKey(r.commitment_pda),
      trader: new PublicKey(r.trader),
      marketId: r.market_id,
      side: r.side as 'long' | 'short',
      orderType: r.order_type as 'limit' | 'market',
      price: new BN(r.price),
      quantity: new BN(r.quantity),
      remainingQty: new BN(r.remaining_qty),
      maxSlippageBps: r.max_slippage_bps,
      expiresAt: r.expires_at,
      collateral: new BN(r.collateral),
      receivedAt: r.received_at,
    }));
  }

  // --- Stats ---

  saveStats(stats: SettlementStats): void {
    this.db.prepare(`
      INSERT INTO settlement_stats (id, internal_matches, venue_settlements, total_volume, internal_volume, venue_volume, fee_saved_bps, fee_saved_usd)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        internal_matches = excluded.internal_matches,
        venue_settlements = excluded.venue_settlements,
        total_volume = excluded.total_volume,
        internal_volume = excluded.internal_volume,
        venue_volume = excluded.venue_volume,
        fee_saved_bps = excluded.fee_saved_bps,
        fee_saved_usd = excluded.fee_saved_usd
    `).run(
      stats.internalMatches,
      stats.venueSettlements,
      stats.totalVolume.toString(10),
      stats.internalVolume.toString(10),
      stats.venueVolume.toString(10),
      stats.feeSavedBps,
      stats.feeSavedUsd,
    );
  }

  loadStats(): SettlementStats | null {
    const row = this.db.prepare('SELECT * FROM settlement_stats WHERE id = 1').get() as any;
    if (!row) return null;
    return {
      internalMatches: row.internal_matches,
      venueSettlements: row.venue_settlements,
      totalVolume: new BN(row.total_volume),
      internalVolume: new BN(row.internal_volume),
      venueVolume: new BN(row.venue_volume),
      feeSavedBps: row.fee_saved_bps,
      feeSavedUsd: row.fee_saved_usd,
    };
  }

  // --- Schema ---

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS processed_commitments (
        pda TEXT PRIMARY KEY,
        processed_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        commitment_pda TEXT PRIMARY KEY,
        commitment_id INTEGER NOT NULL,
        trader TEXT NOT NULL,
        market_id INTEGER NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('long','short')),
        order_type TEXT NOT NULL CHECK (order_type IN ('limit','market')),
        price TEXT NOT NULL,
        quantity TEXT NOT NULL,
        remaining_qty TEXT NOT NULL,
        max_slippage_bps INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        collateral TEXT NOT NULL,
        received_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settlement_stats (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        internal_matches INTEGER NOT NULL DEFAULT 0,
        venue_settlements INTEGER NOT NULL DEFAULT 0,
        total_volume TEXT NOT NULL DEFAULT '0',
        internal_volume TEXT NOT NULL DEFAULT '0',
        venue_volume TEXT NOT NULL DEFAULT '0',
        fee_saved_bps REAL NOT NULL DEFAULT 0,
        fee_saved_usd REAL NOT NULL DEFAULT 0
      );
    `);
  }
}

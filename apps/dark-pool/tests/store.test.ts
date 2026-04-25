import { expect } from 'chai';
import { Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { SolverStore } from '../solver/src/store';
import { DecryptedPerpOrder } from '../solver/src/matcher';
import { SettlementStats } from '../solver/src/settlement/router';

function makeOrder(overrides: Partial<DecryptedPerpOrder> = {}): DecryptedPerpOrder {
  return {
    commitmentId: 1,
    commitmentPda: Keypair.generate().publicKey,
    trader: Keypair.generate().publicKey,
    marketId: 0,
    side: 'long',
    orderType: 'limit',
    price: new BN(100_000_000),
    quantity: new BN(1_000_000),
    remainingQty: new BN(1_000_000),
    maxSlippageBps: 50,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    collateral: new BN(100_000_000),
    receivedAt: Date.now(),
    ...overrides,
  };
}

function makeStats(overrides: Partial<SettlementStats> = {}): SettlementStats {
  return {
    internalMatches: 5,
    venueSettlements: 2,
    totalVolume: new BN('7000000'),
    internalVolume: new BN('5000000'),
    venueVolume: new BN('2000000'),
    feeSavedBps: 7.5,
    feeSavedUsd: 12.34,
    ...overrides,
  };
}

describe('SolverStore', () => {
  let store: SolverStore;

  beforeEach(() => {
    store = new SolverStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  // ============================================================
  // Processed Commitments
  // ============================================================

  describe('processed commitments', () => {
    it('should return false for unknown PDA', () => {
      expect(store.hasProcessed('abc123')).to.be.false;
    });

    it('should mark and check processed PDA', () => {
      store.markProcessed('abc123');
      expect(store.hasProcessed('abc123')).to.be.true;
    });

    it('should be idempotent', () => {
      store.markProcessed('abc123');
      store.markProcessed('abc123'); // no throw
      expect(store.hasProcessed('abc123')).to.be.true;
    });

    it('should load all processed PDAs as a Set', () => {
      store.markProcessed('a');
      store.markProcessed('b');
      store.markProcessed('c');

      const set = store.loadAllProcessed();
      expect(set.size).to.equal(3);
      expect(set.has('a')).to.be.true;
      expect(set.has('b')).to.be.true;
      expect(set.has('c')).to.be.true;
    });

    it('should return empty set when nothing processed', () => {
      const set = store.loadAllProcessed();
      expect(set.size).to.equal(0);
    });
  });

  // ============================================================
  // Orders
  // ============================================================

  describe('orders', () => {
    it('should save and load orders with correct field round-trip', () => {
      const order = makeOrder({ commitmentId: 42, side: 'short', orderType: 'market' });
      store.saveOrders([order]);

      const loaded = store.loadOrders();
      expect(loaded).to.have.length(1);
      const o = loaded[0];
      expect(o.commitmentId).to.equal(42);
      expect(o.commitmentPda.toBase58()).to.equal(order.commitmentPda.toBase58());
      expect(o.trader.toBase58()).to.equal(order.trader.toBase58());
      expect(o.marketId).to.equal(0);
      expect(o.side).to.equal('short');
      expect(o.orderType).to.equal('market');
      expect(o.price.toString()).to.equal('100000000');
      expect(o.quantity.toString()).to.equal('1000000');
      expect(o.remainingQty.toString()).to.equal('1000000');
      expect(o.maxSlippageBps).to.equal(50);
      expect(o.collateral.toString()).to.equal('100000000');
    });

    it('should save multiple orders', () => {
      const orders = [
        makeOrder({ commitmentId: 1 }),
        makeOrder({ commitmentId: 2, side: 'short', marketId: 1 }),
        makeOrder({ commitmentId: 3, marketId: 2 }),
      ];
      store.saveOrders(orders);

      const loaded = store.loadOrders();
      expect(loaded).to.have.length(3);
    });

    it('should replace previous snapshot on save', () => {
      store.saveOrders([makeOrder({ commitmentId: 1 }), makeOrder({ commitmentId: 2 })]);
      expect(store.loadOrders()).to.have.length(2);

      store.saveOrders([makeOrder({ commitmentId: 3 })]);
      const loaded = store.loadOrders();
      expect(loaded).to.have.length(1);
      expect(loaded[0].commitmentId).to.equal(3);
    });

    it('should handle empty save', () => {
      store.saveOrders([makeOrder({ commitmentId: 1 })]);
      store.saveOrders([]);
      expect(store.loadOrders()).to.have.length(0);
    });

    it('should preserve partial fill remainingQty', () => {
      const order = makeOrder({
        quantity: new BN(10_000_000),
        remainingQty: new BN(3_500_000),
      });
      store.saveOrders([order]);

      const loaded = store.loadOrders();
      expect(loaded[0].quantity.toString()).to.equal('10000000');
      expect(loaded[0].remainingQty.toString()).to.equal('3500000');
    });

    it('should return empty array when no orders saved', () => {
      expect(store.loadOrders()).to.deep.equal([]);
    });
  });

  // ============================================================
  // Stats
  // ============================================================

  describe('stats', () => {
    it('should save and load stats', () => {
      const stats = makeStats();
      store.saveStats(stats);

      const loaded = store.loadStats();
      expect(loaded).to.not.be.null;
      expect(loaded!.internalMatches).to.equal(5);
      expect(loaded!.venueSettlements).to.equal(2);
      expect(loaded!.totalVolume.toString()).to.equal('7000000');
      expect(loaded!.internalVolume.toString()).to.equal('5000000');
      expect(loaded!.venueVolume.toString()).to.equal('2000000');
      expect(loaded!.feeSavedBps).to.equal(7.5);
      expect(loaded!.feeSavedUsd).to.be.closeTo(12.34, 0.01);
    });

    it('should upsert on repeated save', () => {
      store.saveStats(makeStats({ internalMatches: 1 }));
      store.saveStats(makeStats({ internalMatches: 10 }));

      const loaded = store.loadStats();
      expect(loaded!.internalMatches).to.equal(10);
    });

    it('should return null when no stats saved', () => {
      expect(store.loadStats()).to.be.null;
    });
  });
});

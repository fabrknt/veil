import { expect } from 'chai';
import { Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { VenueRouter } from '../solver/src/settlement/router';
import { DecryptedPerpOrder, MatchResult } from '../solver/src/matcher';
import { VenueSettlement } from '../solver/src/settlement/types';

function makeMatch(overrides: Partial<MatchResult> = {}): MatchResult {
  const defaultOrder: DecryptedPerpOrder = {
    commitmentId: 0,
    commitmentPda: Keypair.generate().publicKey,
    trader: Keypair.generate().publicKey,
    marketId: 0,
    side: 'long',
    orderType: 'limit',
    price: new BN(100_000_000),
    quantity: new BN(1_000_000),
    remainingQty: new BN(0),
    maxSlippageBps: 50,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    collateral: new BN(100_000_000),
    receivedAt: Date.now(),
  };

  return {
    bidOrder: { ...defaultOrder, side: 'long', commitmentId: 1 },
    askOrder: { ...defaultOrder, side: 'short', commitmentId: 2 },
    execPrice: new BN(100_000_000),
    fillQty: new BN(1_000_000),
    marketId: 0,
    ...overrides,
  };
}

describe('VenueRouter', () => {
  let router: VenueRouter;

  beforeEach(() => {
    router = new VenueRouter();
  });

  // ============================================================
  // Internal Netting Stats
  // ============================================================

  describe('internal netting', () => {
    it('should start with zero stats', () => {
      const stats = router.getStats();
      expect(stats.internalMatches).to.equal(0);
      expect(stats.venueSettlements).to.equal(0);
      expect(stats.feeSavedUsd).to.equal(0);
      expect(stats.totalVolume.toString()).to.equal('0');
    });

    it('should record internal match', () => {
      router.recordInternalMatch(makeMatch());
      const stats = router.getStats();
      expect(stats.internalMatches).to.equal(1);
      expect(stats.venueSettlements).to.equal(0);
    });

    it('should accumulate multiple internal matches', () => {
      router.recordInternalMatch(makeMatch());
      router.recordInternalMatch(makeMatch());
      router.recordInternalMatch(makeMatch());
      const stats = router.getStats();
      expect(stats.internalMatches).to.equal(3);
    });

    it('should calculate fee savings', () => {
      router.recordInternalMatch(makeMatch());
      const stats = router.getStats();
      expect(stats.feeSavedBps).to.be.greaterThan(0);
      expect(stats.feeSavedUsd).to.be.greaterThan(0);
    });

    it('should track internal volume', () => {
      router.recordInternalMatch(makeMatch({
        execPrice: new BN(150_000_000),
        fillQty: new BN(10_000_000),
      }));
      const stats = router.getStats();
      expect(stats.internalVolume.toNumber()).to.be.greaterThan(0);
      expect(stats.totalVolume.toString()).to.equal(stats.internalVolume.toString());
    });

    it('should calculate savings correctly vs best venue', () => {
      // Dark pool fee is 3 bps, best venue (Phoenix) is 4 bps
      // Savings should be 1 bps per match minimum
      router.recordInternalMatch(makeMatch());
      const stats = router.getStats();
      expect(stats.feeSavedBps).to.be.greaterThanOrEqual(1);
    });
  });

  // ============================================================
  // Fee Comparison
  // ============================================================

  describe('fee comparison', () => {
    it('should return dark pool fee', () => {
      const comparison = router.getFeeComparison();
      expect(comparison.darkPoolFeeBps).to.equal(3.0);
    });

    it('should list all venues', () => {
      const comparison = router.getFeeComparison();
      expect(comparison.venues.length).to.be.greaterThanOrEqual(3);
    });

    it('should have Drift venue', () => {
      const comparison = router.getFeeComparison();
      const drift = comparison.venues.find(v => v.id === 'drift');
      expect(drift).to.not.be.undefined;
      expect(drift!.takerBps).to.equal(4.5);
    });

    it('should have Jupiter venue', () => {
      const comparison = router.getFeeComparison();
      const jupiter = comparison.venues.find(v => v.id === 'jupiter');
      expect(jupiter).to.not.be.undefined;
      expect(jupiter!.takerBps).to.equal(6.0);
    });

    it('should have Phoenix venue', () => {
      const comparison = router.getFeeComparison();
      const phoenix = comparison.venues.find(v => v.id === 'phoenix');
      expect(phoenix).to.not.be.undefined;
      expect(phoenix!.takerBps).to.equal(4.0);
    });

    it('should show positive savings for all venues vs dark pool', () => {
      const comparison = router.getFeeComparison();
      comparison.venues.forEach(v => {
        expect(v.savingsVsDarkPool).to.be.greaterThan(0);
      });
    });

    it('should have slippage and MEV estimates', () => {
      const comparison = router.getFeeComparison();
      expect(comparison.estimatedSlippageSaved).to.be.a('string');
      expect(comparison.estimatedMevSaved).to.be.a('string');
    });
  });

  // ============================================================
  // Venue Routing (fallback)
  // ============================================================

  describe('venue routing', () => {
    it('should fail with no venues registered', async () => {
      const result = await router.routeToVenue(makeMatch());
      expect(result.success).to.be.false;
      expect(result.error).to.include('No venues available');
    });

    it('should route to registered venue', async () => {
      const mockVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: 'mock_sig', success: true }),
        placeOrder: async () => ({ txSignature: 'mock_place_sig', success: true }),
      };
      router.addVenue(mockVenue);

      const result = await router.routeToVenue(makeMatch());
      expect(result.success).to.be.true;
      expect(result.txSignature).to.equal('mock_sig');
    });

    it('should track venue settlement stats', async () => {
      const mockVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: 'sig', success: true }),
        placeOrder: async () => ({ txSignature: 'sig', success: true }),
      };
      router.addVenue(mockVenue);
      await router.routeToVenue(makeMatch());

      const stats = router.getStats();
      expect(stats.venueSettlements).to.equal(1);
      expect(stats.internalMatches).to.equal(0);
    });

    it('should prefer venue with lowest fees', async () => {
      let selectedVenue = '';
      const driftVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
        placeOrder: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
      };
      const phoenixVenue = {
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => { selectedVenue = 'phoenix'; return { txSignature: 'sig', success: true }; },
        placeOrder: async () => { selectedVenue = 'phoenix'; return { txSignature: 'sig', success: true }; },
      };
      router.addVenue(driftVenue);
      router.addVenue(phoenixVenue);

      await router.routeToVenue(makeMatch());
      // Phoenix has 4.0 bps (lowest), should be selected
      expect(selectedVenue).to.equal('phoenix');
    });

    it('should use preferred venue when specified', async () => {
      let selectedVenue = '';
      const driftVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
        placeOrder: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
      };
      const phoenixVenue = {
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => { selectedVenue = 'phoenix'; return { txSignature: 'sig', success: true }; },
        placeOrder: async () => { selectedVenue = 'phoenix'; return { txSignature: 'sig', success: true }; },
      };
      router.addVenue(driftVenue);
      router.addVenue(phoenixVenue);

      await router.routeToVenue(makeMatch(), 'drift');
      expect(selectedVenue).to.equal('drift');
    });

    it('should not track stats on failed settlement', async () => {
      const failVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: false, error: 'fail' }),
        placeOrder: async () => ({ txSignature: '', success: false, error: 'fail' }),
      };
      router.addVenue(failVenue);
      await router.routeToVenue(makeMatch());

      const stats = router.getStats();
      expect(stats.venueSettlements).to.equal(0);
    });
  });

  // ============================================================
  // Combined Stats
  // ============================================================

  describe('combined stats', () => {
    it('should track both internal and venue separately', async () => {
      const mockVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: 'sig', success: true }),
        placeOrder: async () => ({ txSignature: 'sig', success: true }),
      };
      router.addVenue(mockVenue);

      router.recordInternalMatch(makeMatch());
      router.recordInternalMatch(makeMatch());
      await router.routeToVenue(makeMatch());

      const stats = router.getStats();
      expect(stats.internalMatches).to.equal(2);
      expect(stats.venueSettlements).to.equal(1);
      expect(stats.totalVolume.toNumber()).to.be.greaterThan(0);
    });

    it('should return copy of stats (immutable)', () => {
      router.recordInternalMatch(makeMatch());
      const stats1 = router.getStats();
      const stats2 = router.getStats();
      stats1.internalMatches = 999;
      expect(stats2.internalMatches).to.equal(1);
    });
  });

  // ============================================================
  // Single Order Fallback
  // ============================================================

  describe('single order fallback', () => {
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

    it('should fail with no venues registered', async () => {
      const result = await router.routeSingleOrder(makeOrder());
      expect(result.success).to.be.false;
      expect(result.error).to.include('No venues available');
    });

    it('should route to registered venue', async () => {
      const mockVenue = {
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => ({ txSignature: 'fallback_sig', success: true }),
      };
      router.addVenue(mockVenue);

      const result = await router.routeSingleOrder(makeOrder());
      expect(result.success).to.be.true;
      expect(result.txSignature).to.equal('fallback_sig');
    });

    it('should pick cheapest venue', async () => {
      let selectedVenue = '';
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
      });
      router.addVenue({
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => { selectedVenue = 'phoenix'; return { txSignature: 'sig', success: true }; },
      });

      await router.routeSingleOrder(makeOrder());
      expect(selectedVenue).to.equal('phoenix');
    });

    it('should use preferred venue when specified', async () => {
      let selectedVenue = '';
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
      });
      router.addVenue({
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => { selectedVenue = 'phoenix'; return { txSignature: 'sig', success: true }; },
      });

      await router.routeSingleOrder(makeOrder(), 'drift');
      expect(selectedVenue).to.equal('drift');
    });

    it('should track venue stats on success', async () => {
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => ({ txSignature: 'sig', success: true }),
      });

      await router.routeSingleOrder(makeOrder());
      const stats = router.getStats();
      expect(stats.venueSettlements).to.equal(1);
      expect(stats.venueVolume.toNumber()).to.be.greaterThan(0);
    });

    it('should not track stats on failure', async () => {
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => ({ txSignature: '', success: false, error: 'fail' }),
      });

      await router.routeSingleOrder(makeOrder());
      const stats = router.getStats();
      expect(stats.venueSettlements).to.equal(0);
    });
  });

  // ============================================================
  // Venue Cascade (fallback on failure)
  // ============================================================

  describe('venue cascade', () => {
    it('should cascade to next venue when first fails (routeToVenue)', async () => {
      let selectedVenue = '';
      router.addVenue({
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: false, error: 'phoenix down' }),
        placeOrder: async () => ({ txSignature: '', success: false, error: 'phoenix down' }),
      });
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => { selectedVenue = 'drift'; return { txSignature: 'drift_sig', success: true }; },
        placeOrder: async () => { selectedVenue = 'drift'; return { txSignature: 'drift_sig', success: true }; },
      });

      const result = await router.routeToVenue(makeMatch());
      expect(result.success).to.be.true;
      expect(selectedVenue).to.equal('drift');
    });

    it('should cascade to next venue when first fails (routeSingleOrder)', async () => {
      function makeOrder(overrides: Partial<DecryptedPerpOrder> = {}): DecryptedPerpOrder {
        return {
          commitmentId: 1, commitmentPda: Keypair.generate().publicKey, trader: Keypair.generate().publicKey,
          marketId: 0, side: 'long', orderType: 'limit', price: new BN(100_000_000),
          quantity: new BN(1_000_000), remainingQty: new BN(1_000_000), maxSlippageBps: 50,
          expiresAt: Math.floor(Date.now() / 1000) + 3600, collateral: new BN(100_000_000), receivedAt: Date.now(), ...overrides,
        };
      }

      let selectedVenue = '';
      router.addVenue({
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: false, error: 'down' }),
        placeOrder: async () => ({ txSignature: '', success: false, error: 'down' }),
      });
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: true }),
        placeOrder: async () => { selectedVenue = 'drift'; return { txSignature: 'sig', success: true }; },
      });

      const result = await router.routeSingleOrder(makeOrder());
      expect(result.success).to.be.true;
      expect(selectedVenue).to.equal('drift');
    });

    it('should return failure when all venues fail', async () => {
      router.addVenue({
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: false, error: 'down' }),
        placeOrder: async () => ({ txSignature: '', success: false, error: 'down' }),
      });
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => ({ txSignature: '', success: false, error: 'also down' }),
        placeOrder: async () => ({ txSignature: '', success: false, error: 'also down' }),
      });

      const result = await router.routeToVenue(makeMatch());
      expect(result.success).to.be.false;
      expect(result.error).to.include('All venues failed');
    });

    it('should try preferred venue first then cascade', async () => {
      const tried: string[] = [];
      router.addVenue({
        name: 'phoenix',
        initialize: async () => {},
        executeMatch: async () => { tried.push('phoenix'); return { txSignature: 'phoenix_sig', success: true }; },
        placeOrder: async () => ({ txSignature: '', success: true }),
      });
      router.addVenue({
        name: 'drift',
        initialize: async () => {},
        executeMatch: async () => { tried.push('drift'); return { txSignature: '', success: false, error: 'fail' }; },
        placeOrder: async () => ({ txSignature: '', success: true }),
      });

      const result = await router.routeToVenue(makeMatch(), 'drift');
      // Drift tried first (preferred), fails, cascades to phoenix
      expect(tried).to.deep.equal(['drift', 'phoenix']);
      expect(result.success).to.be.true;
      expect(result.txSignature).to.equal('phoenix_sig');
    });
  });
});

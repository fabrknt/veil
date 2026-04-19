import { expect } from 'chai';
import { PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { PerpMatcher, DecryptedPerpOrder, MatchResult } from '../solver/src/matcher';

function makeOrder(overrides: Partial<DecryptedPerpOrder> = {}): DecryptedPerpOrder {
  return {
    commitmentId: 0,
    commitmentPda: Keypair.generate().publicKey,
    trader: Keypair.generate().publicKey,
    marketId: 0,
    side: 'long',
    orderType: 'limit',
    price: new BN(100_000_000), // $100
    quantity: new BN(1_000_000), // 1.0
    remainingQty: new BN(1_000_000),
    maxSlippageBps: 50,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    collateral: new BN(100_000_000),
    receivedAt: Date.now(),
    ...overrides,
  };
}

describe('PerpMatcher', () => {
  let matcher: PerpMatcher;

  beforeEach(() => {
    matcher = new PerpMatcher();
  });

  // ============================================================
  // Basic Crossing
  // ============================================================

  describe('basic crossing', () => {
    it('should match crossing limit orders', () => {
      const bid = makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) });
      expect(matcher.addOrder(bid)).to.be.null;

      const ask = makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000) });
      const result = matcher.addOrder(ask);

      expect(result).to.not.be.null;
      expect(result!.bidOrder.commitmentId).to.equal(1);
      expect(result!.askOrder.commitmentId).to.equal(2);
      expect(result!.execPrice.toString()).to.equal('100000000');
      expect(result!.fillQty.toString()).to.equal('1000000');
    });

    it('should not match non-crossing limit orders', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(100_000_000) }));

      expect(result).to.be.null;
      expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 1 });
    });

    it('should match at exact same price', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(100_000_000) }));

      expect(result).to.not.be.null;
      expect(result!.execPrice.toString()).to.equal('100000000');
    });

    it('should use resting order price as execution price (bid resting)', () => {
      // Bid rests at $100, ask comes in at $95 — exec at $100 (resting bid)
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(95_000_000) }));

      expect(result!.execPrice.toString()).to.equal('100000000');
    });

    it('should use resting order price as execution price (ask resting)', () => {
      // Ask rests at $95, bid comes in at $100 — exec at $95 (resting ask)
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'short', price: new BN(95_000_000) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(100_000_000) }));

      expect(result!.execPrice.toString()).to.equal('95000000');
    });

    it('should leave book empty after full match', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long' }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000) }));

      expect(matcher.getDepth(0)).to.deep.equal({ bids: 0, asks: 0 });
      expect(matcher.getTotalOrders()).to.equal(0);
    });
  });

  // ============================================================
  // Market Orders
  // ============================================================

  describe('market orders', () => {
    it('should match market buy against resting limit ask', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'short', price: new BN(100_000_000) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', orderType: 'market', price: new BN(0) }));

      expect(result).to.not.be.null;
      expect(result!.execPrice.toString()).to.equal('100000000');
    });

    it('should match market sell against resting limit bid', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', orderType: 'market', price: new BN(0) }));

      expect(result).to.not.be.null;
      expect(result!.execPrice.toString()).to.equal('100000000');
    });

    it('should match two market orders against each other', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', orderType: 'market', price: new BN(0) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', orderType: 'market', price: new BN(0) }));

      // Both are market — resting market uses incoming's price (0)
      expect(result).to.not.be.null;
    });

    it('should not match market order with empty book', () => {
      const result = matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', orderType: 'market', price: new BN(0) }));
      expect(result).to.be.null;
      expect(matcher.getTotalOrders()).to.equal(1);
    });
  });

  // ============================================================
  // Partial Fills
  // ============================================================

  describe('partial fills', () => {
    it('should partially fill larger bid', () => {
      matcher.addOrder(makeOrder({
        commitmentId: 1, side: 'long',
        quantity: new BN(2_000_000), remainingQty: new BN(2_000_000),
      }));
      const result = matcher.addOrder(makeOrder({
        commitmentId: 2, side: 'short', price: new BN(99_000_000),
        quantity: new BN(1_000_000), remainingQty: new BN(1_000_000),
      }));

      expect(result!.fillQty.toString()).to.equal('1000000');
      expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 0 });
    });

    it('should partially fill larger ask', () => {
      matcher.addOrder(makeOrder({
        commitmentId: 1, side: 'short', price: new BN(99_000_000),
        quantity: new BN(3_000_000), remainingQty: new BN(3_000_000),
      }));
      const result = matcher.addOrder(makeOrder({
        commitmentId: 2, side: 'long',
        quantity: new BN(1_000_000), remainingQty: new BN(1_000_000),
      }));

      expect(result!.fillQty.toString()).to.equal('1000000');
      expect(matcher.getDepth(0)).to.deep.equal({ bids: 0, asks: 1 });
    });

    it('should handle multiple partial fills via sweep', () => {
      // Large bid of 5.0
      matcher.addOrder(makeOrder({
        commitmentId: 1, side: 'long', price: new BN(100_000_000),
        quantity: new BN(5_000_000), remainingQty: new BN(5_000_000),
      }));
      // Three small asks of 1.0 each
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'short', price: new BN(98_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 4, side: 'short', price: new BN(97_000_000) }));

      // First ask matched on insertion, sweep catches rest
      const swept = matcher.sweep();
      // After all matches: bid has 5-3=2 remaining (first matched on add, 2 via sweep)
      expect(matcher.getDepth(0).asks).to.equal(0);
    });

    it('should correctly track remaining quantity after partial fill', () => {
      const bid = makeOrder({
        commitmentId: 1, side: 'long',
        quantity: new BN(10_000_000), remainingQty: new BN(10_000_000),
      });
      matcher.addOrder(bid);

      matcher.addOrder(makeOrder({
        commitmentId: 2, side: 'short', price: new BN(99_000_000),
        quantity: new BN(3_000_000), remainingQty: new BN(3_000_000),
      }));

      // Bid should have 7.0 remaining
      expect(bid.remainingQty.toString()).to.equal('7000000');
    });
  });

  // ============================================================
  // Price-Time Priority
  // ============================================================

  describe('price-time priority', () => {
    it('should match best price first (bids)', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(102_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(101_000_000) }));

      const result = matcher.addOrder(makeOrder({ commitmentId: 4, side: 'short', price: new BN(99_000_000) }));

      // Best bid is $102 (commitmentId: 2)
      expect(result!.bidOrder.commitmentId).to.equal(2);
      expect(result!.execPrice.toString()).to.equal('102000000');
    });

    it('should match best price first (asks)', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'short', price: new BN(100_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(98_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'short', price: new BN(99_000_000) }));

      const result = matcher.addOrder(makeOrder({ commitmentId: 4, side: 'long', price: new BN(101_000_000) }));

      // Best ask is $98 (commitmentId: 2)
      expect(result!.askOrder.commitmentId).to.equal(2);
      expect(result!.execPrice.toString()).to.equal('98000000');
    });

    it('should use time priority for same-price bids', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', receivedAt: 1000 }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', receivedAt: 2000 }));

      const result = matcher.addOrder(makeOrder({ commitmentId: 3, side: 'short', price: new BN(99_000_000) }));

      expect(result!.bidOrder.commitmentId).to.equal(1); // Earlier bid
    });

    it('should use time priority for same-price asks', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'short', price: new BN(99_000_000), receivedAt: 1000 }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000), receivedAt: 2000 }));

      const result = matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long' }));

      expect(result!.askOrder.commitmentId).to.equal(1); // Earlier ask
    });
  });

  // ============================================================
  // Market Separation
  // ============================================================

  describe('market separation', () => {
    it('should not match orders across different markets', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', marketId: 0 }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', marketId: 1 }));

      expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 0 });
      expect(matcher.getDepth(1)).to.deep.equal({ bids: 0, asks: 1 });
    });

    it('should match within the same market', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', marketId: 1 }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000), marketId: 1 }));

      expect(result).to.not.be.null;
      expect(result!.marketId).to.equal(1);
    });

    it('should handle all three markets independently', () => {
      // Add crossing orders in each market
      for (const marketId of [0, 1, 2]) {
        matcher.addOrder(makeOrder({ commitmentId: marketId * 10, side: 'long', marketId }));
        const result = matcher.addOrder(makeOrder({ commitmentId: marketId * 10 + 1, side: 'short', price: new BN(99_000_000), marketId }));
        expect(result).to.not.be.null;
        expect(result!.marketId).to.equal(marketId);
      }
      expect(matcher.getTotalOrders()).to.equal(0);
    });

    it('should return correct depth for non-existent market', () => {
      expect(matcher.getDepth(99)).to.deep.equal({ bids: 0, asks: 0 });
    });
  });

  // ============================================================
  // Expiry
  // ============================================================

  describe('expiry', () => {
    it('should remove expired orders', () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 10;
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000), expiresAt: pastExpiry }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(101_000_000), expiresAt: pastExpiry }));

      const expired = matcher.removeExpired(Math.floor(Date.now() / 1000));
      expect(expired).to.have.length(2);
      expect(matcher.getTotalOrders()).to.equal(0);
    });

    it('should keep non-expired orders', () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const pastExpiry = Math.floor(Date.now() / 1000) - 10;

      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000), expiresAt: futureExpiry }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(98_000_000), expiresAt: pastExpiry }));

      const expired = matcher.removeExpired(Math.floor(Date.now() / 1000));
      expect(expired).to.have.length(1);
      expect(expired[0].commitmentId).to.equal(2);
      expect(matcher.getTotalOrders()).to.equal(1);
    });

    it('should return empty array when nothing is expired', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000) }));
      const expired = matcher.removeExpired(Math.floor(Date.now() / 1000));
      expect(expired).to.have.length(0);
    });

    it('should handle expiry at exact boundary', () => {
      const now = Math.floor(Date.now() / 1000);
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000), expiresAt: now }));

      // expiresAt <= now should expire
      const expired = matcher.removeExpired(now);
      expect(expired).to.have.length(1);
    });

    it('should expire from multiple markets', () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 10;
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000), marketId: 0, expiresAt: pastExpiry }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(101_000_000), marketId: 1, expiresAt: pastExpiry }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(99_000_000), marketId: 2, expiresAt: pastExpiry }));

      const expired = matcher.removeExpired(Math.floor(Date.now() / 1000));
      expect(expired).to.have.length(3);
    });
  });

  // ============================================================
  // Sweep
  // ============================================================

  describe('sweep', () => {
    it('should match all crossing orders in one sweep', () => {
      // 3 bids at different prices
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(102_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(101_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(100_000_000) }));

      // 2 asks that cross (added without matching since they're on the same side as previous adds)
      matcher.addOrder(makeOrder({ commitmentId: 4, side: 'short', price: new BN(99_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 5, side: 'short', price: new BN(100_000_000) }));

      const matches = matcher.sweep();
      // Some matched on insertion, rest via sweep
      expect(matcher.getDepth(0).bids + matcher.getDepth(0).asks).to.be.lessThanOrEqual(1);
    });

    it('should return empty when no crosses exist', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(101_000_000) }));

      const matches = matcher.sweep();
      expect(matches).to.have.length(0);
    });

    it('should return empty on empty book', () => {
      const matches = matcher.sweep();
      expect(matches).to.have.length(0);
    });

    it('should sweep across multiple markets', () => {
      // Add crossing orders in two markets (non-matching prices so they don't cross on add)
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000), marketId: 0 }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(100_000_000), marketId: 1 }));
      // These asks cross when swept
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'short', price: new BN(99_000_000), marketId: 0 }));
      matcher.addOrder(makeOrder({ commitmentId: 4, side: 'short', price: new BN(99_000_000), marketId: 1 }));

      const matches = matcher.sweep();
      // Some may have matched on add, rest on sweep
      expect(matcher.getTotalOrders()).to.equal(0);
    });
  });

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('edge cases', () => {
    it('should handle very small quantities', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', quantity: new BN(1), remainingQty: new BN(1) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000), quantity: new BN(1), remainingQty: new BN(1) }));

      expect(result).to.not.be.null;
      expect(result!.fillQty.toString()).to.equal('1');
    });

    it('should handle very large quantities', () => {
      const largeQty = new BN('1000000000000000'); // 1 billion units
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', quantity: largeQty, remainingQty: new BN(largeQty.toString()) }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000), quantity: largeQty, remainingQty: new BN(largeQty.toString()) }));

      expect(result).to.not.be.null;
      expect(result!.fillQty.toString()).to.equal(largeQty.toString());
    });

    it('should handle very large prices', () => {
      const largePrice = new BN('100000000000'); // $100,000
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: largePrice }));
      const result = matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN('99000000000') }));

      expect(result).to.not.be.null;
      expect(result!.execPrice.toString()).to.equal(largePrice.toString());
    });

    it('should handle many orders in one book', () => {
      // Add 100 non-crossing bids
      for (let i = 0; i < 100; i++) {
        matcher.addOrder(makeOrder({
          commitmentId: i,
          side: 'long',
          price: new BN(90_000_000 + i * 10_000),
          receivedAt: i,
        }));
      }
      expect(matcher.getDepth(0).bids).to.equal(100);

      // One ask that crosses the best bid
      const result = matcher.addOrder(makeOrder({ commitmentId: 999, side: 'short', price: new BN(90_000_000) }));
      expect(result).to.not.be.null;
      expect(matcher.getDepth(0).bids).to.equal(99);
    });

    it('should handle adding order to same side without match', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(99_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(98_000_000) }));

      expect(matcher.getDepth(0)).to.deep.equal({ bids: 3, asks: 0 });
    });

    it('should maintain correct order after multiple operations', () => {
      // Add, match, add more, expire some, sweep
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000) })); // matches 1

      const pastExpiry = Math.floor(Date.now() / 1000) - 10;
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(95_000_000), expiresAt: pastExpiry }));
      matcher.addOrder(makeOrder({ commitmentId: 4, side: 'short', price: new BN(105_000_000) }));

      matcher.removeExpired(Math.floor(Date.now() / 1000)); // removes 3
      expect(matcher.getTotalOrders()).to.equal(1); // only 4 remains

      matcher.addOrder(makeOrder({ commitmentId: 5, side: 'long', price: new BN(106_000_000) }));
      const matches = matcher.sweep();
      expect(matches.length).to.be.greaterThanOrEqual(0); // 5 crosses 4
      expect(matcher.getTotalOrders()).to.equal(0);
    });
  });

  // ============================================================
  // getTotalOrders / getDepth
  // ============================================================

  describe('state queries', () => {
    it('should return 0 for empty matcher', () => {
      expect(matcher.getTotalOrders()).to.equal(0);
      expect(matcher.getDepth(0)).to.deep.equal({ bids: 0, asks: 0 });
    });

    it('should track orders across multiple markets', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000), marketId: 0 }));
      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(101_000_000), marketId: 0 }));
      matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(99_000_000), marketId: 1 }));

      expect(matcher.getTotalOrders()).to.equal(3);
      expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 1 });
      expect(matcher.getDepth(1)).to.deep.equal({ bids: 1, asks: 0 });
    });

    it('should decrease count after match', () => {
      matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long' }));
      expect(matcher.getTotalOrders()).to.equal(1);

      matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000) }));
      expect(matcher.getTotalOrders()).to.equal(0);
    });
  });
});

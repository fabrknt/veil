import { expect } from 'chai';
import { PublicKey, Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import { PerpMatcher, DecryptedPerpOrder } from '../solver/src/matcher';

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

  it('should match crossing limit orders', () => {
    // Bid at $100
    const bid = makeOrder({ commitmentId: 1, side: 'long', price: new BN(100_000_000) });
    const bidResult = matcher.addOrder(bid);
    expect(bidResult).to.be.null; // No match yet

    // Ask at $99 — crosses with bid
    const ask = makeOrder({ commitmentId: 2, side: 'short', price: new BN(99_000_000) });
    const askResult = matcher.addOrder(ask);

    expect(askResult).to.not.be.null;
    expect(askResult!.bidOrder.commitmentId).to.equal(1);
    expect(askResult!.askOrder.commitmentId).to.equal(2);
    // Exec price = resting order's price (bid was resting)
    expect(askResult!.execPrice.toString()).to.equal('100000000');
    expect(askResult!.fillQty.toString()).to.equal('1000000');
  });

  it('should not match non-crossing limit orders', () => {
    // Bid at $99
    const bid = makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000) });
    matcher.addOrder(bid);

    // Ask at $100 — does NOT cross
    const ask = makeOrder({ commitmentId: 2, side: 'short', price: new BN(100_000_000) });
    const result = matcher.addOrder(ask);

    expect(result).to.be.null;
    expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 1 });
  });

  it('should match market orders against resting limits', () => {
    // Resting ask at $100
    const ask = makeOrder({ commitmentId: 1, side: 'short', price: new BN(100_000_000) });
    matcher.addOrder(ask);

    // Market buy — always crosses
    const bid = makeOrder({ commitmentId: 2, side: 'long', orderType: 'market', price: new BN(0) });
    const result = matcher.addOrder(bid);

    expect(result).to.not.be.null;
    // Exec price = resting ask's limit price
    expect(result!.execPrice.toString()).to.equal('100000000');
  });

  it('should handle partial fills', () => {
    // Bid for 2.0
    const bid = makeOrder({
      commitmentId: 1,
      side: 'long',
      quantity: new BN(2_000_000),
      remainingQty: new BN(2_000_000),
    });
    matcher.addOrder(bid);

    // Ask for 1.0 — partial fill
    const ask = makeOrder({
      commitmentId: 2,
      side: 'short',
      price: new BN(99_000_000),
      quantity: new BN(1_000_000),
      remainingQty: new BN(1_000_000),
    });
    const result = matcher.addOrder(ask);

    expect(result).to.not.be.null;
    expect(result!.fillQty.toString()).to.equal('1000000');
    // Bid should still have 1.0 remaining in the book
    expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 0 });
  });

  it('should sweep multiple crossing orders', () => {
    // Add 3 bids
    matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(102_000_000) }));
    matcher.addOrder(makeOrder({ commitmentId: 2, side: 'long', price: new BN(101_000_000) }));
    matcher.addOrder(makeOrder({ commitmentId: 3, side: 'long', price: new BN(100_000_000) }));

    // Add 2 asks that cross
    matcher.addOrder(makeOrder({ commitmentId: 4, side: 'short', price: new BN(99_000_000) }));
    matcher.addOrder(makeOrder({ commitmentId: 5, side: 'short', price: new BN(100_000_000) }));

    // Two should have matched on insertion, sweep catches the rest
    const remaining = matcher.sweep();
    // All crossable should be matched
    expect(matcher.getDepth(0).bids + matcher.getDepth(0).asks).to.be.lessThanOrEqual(1);
  });

  it('should separate orders by market', () => {
    // SOL bid
    matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', marketId: 0 }));
    // BTC ask
    matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', marketId: 1 }));

    // No match — different markets
    expect(matcher.getDepth(0)).to.deep.equal({ bids: 1, asks: 0 });
    expect(matcher.getDepth(1)).to.deep.equal({ bids: 0, asks: 1 });
  });

  it('should remove expired orders', () => {
    const pastExpiry = Math.floor(Date.now() / 1000) - 10;
    // Use non-crossing prices so orders rest in the book without matching
    matcher.addOrder(makeOrder({ commitmentId: 1, side: 'long', price: new BN(99_000_000), expiresAt: pastExpiry }));
    matcher.addOrder(makeOrder({ commitmentId: 2, side: 'short', price: new BN(101_000_000), expiresAt: pastExpiry }));

    const expired = matcher.removeExpired(Math.floor(Date.now() / 1000));
    expect(expired).to.have.length(2);
    expect(matcher.getTotalOrders()).to.equal(0);
  });

  it('should prioritize by price then time', () => {
    // Two bids at same price, first should match first
    const bid1 = makeOrder({ commitmentId: 1, side: 'long', receivedAt: 1000 });
    const bid2 = makeOrder({ commitmentId: 2, side: 'long', receivedAt: 2000 });
    matcher.addOrder(bid1);
    matcher.addOrder(bid2);

    const ask = makeOrder({ commitmentId: 3, side: 'short', price: new BN(99_000_000) });
    const result = matcher.addOrder(ask);

    expect(result).to.not.be.null;
    expect(result!.bidOrder.commitmentId).to.equal(1); // Earlier bid matches first
  });
});

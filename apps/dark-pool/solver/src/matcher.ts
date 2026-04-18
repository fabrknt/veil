import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Decrypted perp order ready for matching
 */
export interface DecryptedPerpOrder {
  commitmentId: number;
  commitmentPda: PublicKey;
  trader: PublicKey;
  marketId: number;
  side: 'long' | 'short';
  orderType: 'limit' | 'market';
  /** 6-decimal fixed point. 0 for market orders. */
  price: BN;
  /** 6-decimal base asset quantity */
  quantity: BN;
  /** Remaining unfilled quantity */
  remainingQty: BN;
  maxSlippageBps: number;
  /** Expiration timestamp (unix seconds) */
  expiresAt: number;
  /** Collateral deposited (USDC, 6 decimals) */
  collateral: BN;
  /** When the order was received by the solver */
  receivedAt: number;
}

/**
 * Result of matching two orders
 */
export interface MatchResult {
  bidOrder: DecryptedPerpOrder;
  askOrder: DecryptedPerpOrder;
  /** Execution price: resting order's price (price-time priority) */
  execPrice: BN;
  /** Fill quantity: min of both remaining quantities */
  fillQty: BN;
  /** Market ID */
  marketId: number;
}

/**
 * Per-market order book
 */
interface OrderBook {
  /** Sorted by price DESC, then receivedAt ASC (best bid first) */
  bids: DecryptedPerpOrder[];
  /** Sorted by price ASC, then receivedAt ASC (best ask first) */
  asks: DecryptedPerpOrder[];
}

/**
 * Price-time priority matching engine for dark pool perp orders.
 *
 * Maintains separate order books per market. When a new order arrives,
 * it attempts to cross against the opposite side. If no cross, the order
 * rests in the book until matched or expired.
 *
 * Execution price = resting (earlier) order's limit price.
 * Market orders cross at the best available price.
 */
export class PerpMatcher {
  private books: Map<number, OrderBook> = new Map();

  /**
   * Add an order and attempt to match it immediately.
   * Returns a match result if a crossing was found, null otherwise.
   */
  addOrder(order: DecryptedPerpOrder): MatchResult | null {
    const book = this.getOrCreateBook(order.marketId);

    if (order.side === 'long') {
      // Try to match against best ask
      const match = this.tryCross(order, book.asks);
      if (match) return match;
      // No match — insert into bids (price DESC, time ASC)
      this.insertBid(book, order);
    } else {
      // Try to match against best bid
      const match = this.tryCross(order, book.bids);
      if (match) return match;
      // No match — insert into asks (price ASC, time ASC)
      this.insertAsk(book, order);
    }

    return null;
  }

  /**
   * Sweep all books for crossing orders.
   * Returns all executable matches.
   */
  sweep(): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const [, book] of this.books) {
      while (book.bids.length > 0 && book.asks.length > 0) {
        const bestBid = book.bids[0];
        const bestAsk = book.asks[0];

        if (!this.canCross(bestBid, bestAsk)) break;

        const fillQty = BN.min(bestBid.remainingQty, bestAsk.remainingQty);
        // Exec price = resting order's price. If both are resting, use ask (maker) price.
        const execPrice = bestAsk.orderType === 'market' ? bestBid.price : bestAsk.price;

        const result: MatchResult = {
          bidOrder: bestBid,
          askOrder: bestAsk,
          execPrice,
          fillQty,
          marketId: bestBid.marketId,
        };

        // Update remaining quantities
        bestBid.remainingQty = bestBid.remainingQty.sub(fillQty);
        bestAsk.remainingQty = bestAsk.remainingQty.sub(fillQty);

        // Remove fully filled orders
        if (bestBid.remainingQty.isZero()) book.bids.shift();
        if (bestAsk.remainingQty.isZero()) book.asks.shift();

        matches.push(result);
      }
    }

    return matches;
  }

  /**
   * Remove and return all expired orders (for fallback routing).
   */
  removeExpired(now: number): DecryptedPerpOrder[] {
    const expired: DecryptedPerpOrder[] = [];

    for (const [, book] of this.books) {
      book.bids = book.bids.filter(o => {
        if (o.expiresAt <= now) {
          expired.push(o);
          return false;
        }
        return true;
      });
      book.asks = book.asks.filter(o => {
        if (o.expiresAt <= now) {
          expired.push(o);
          return false;
        }
        return true;
      });
    }

    return expired;
  }

  /**
   * Get current book depth for a market.
   */
  getDepth(marketId: number): { bids: number; asks: number } {
    const book = this.books.get(marketId);
    if (!book) return { bids: 0, asks: 0 };
    return { bids: book.bids.length, asks: book.asks.length };
  }

  /**
   * Get total order count across all markets.
   */
  getTotalOrders(): number {
    let total = 0;
    for (const [, book] of this.books) {
      total += book.bids.length + book.asks.length;
    }
    return total;
  }

  // --- Private helpers ---

  private getOrCreateBook(marketId: number): OrderBook {
    let book = this.books.get(marketId);
    if (!book) {
      book = { bids: [], asks: [] };
      this.books.set(marketId, book);
    }
    return book;
  }

  /**
   * Try to cross an incoming order against the opposite side.
   * For a buy: check best ask. For a sell: check best bid.
   */
  private tryCross(
    incoming: DecryptedPerpOrder,
    oppositeSide: DecryptedPerpOrder[],
  ): MatchResult | null {
    if (oppositeSide.length === 0) return null;

    const resting = oppositeSide[0];
    if (!this.canCross(
      incoming.side === 'long' ? incoming : resting,
      incoming.side === 'short' ? incoming : resting,
    )) return null;

    const fillQty = BN.min(incoming.remainingQty, resting.remainingQty);
    // Exec price = resting order's price (price-time priority)
    const execPrice = resting.orderType === 'market'
      ? incoming.price  // If resting is market, use incoming's price
      : resting.price;  // Normal case: resting's limit price

    const [bidOrder, askOrder] = incoming.side === 'long'
      ? [incoming, resting]
      : [resting, incoming];

    const result: MatchResult = {
      bidOrder,
      askOrder,
      execPrice,
      fillQty,
      marketId: incoming.marketId,
    };

    // Update remaining quantities
    incoming.remainingQty = incoming.remainingQty.sub(fillQty);
    resting.remainingQty = resting.remainingQty.sub(fillQty);

    // Remove resting if fully filled
    if (resting.remainingQty.isZero()) oppositeSide.shift();

    return result;
  }

  /**
   * Check if a bid and ask can cross.
   * Limit-limit: bid.price >= ask.price
   * Market orders always cross if there's a counterparty.
   */
  private canCross(bid: DecryptedPerpOrder, ask: DecryptedPerpOrder): boolean {
    if (bid.orderType === 'market' || ask.orderType === 'market') return true;
    return bid.price.gte(ask.price);
  }

  /** Insert bid in price DESC, time ASC order */
  private insertBid(book: OrderBook, order: DecryptedPerpOrder): void {
    const idx = book.bids.findIndex(o =>
      order.price.gt(o.price) ||
      (order.price.eq(o.price) && order.receivedAt < o.receivedAt)
    );
    if (idx === -1) {
      book.bids.push(order);
    } else {
      book.bids.splice(idx, 0, order);
    }
  }

  /** Insert ask in price ASC, time ASC order */
  private insertAsk(book: OrderBook, order: DecryptedPerpOrder): void {
    const idx = book.asks.findIndex(o =>
      order.price.lt(o.price) ||
      (order.price.eq(o.price) && order.receivedAt < o.receivedAt)
    );
    if (idx === -1) {
      book.asks.push(order);
    } else {
      book.asks.splice(idx, 0, order);
    }
  }
}

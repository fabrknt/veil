import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  DriftClient,
  Wallet,
  PositionDirection,
  OrderType,
  MarketType,
  PostOnlyParams,
  BN,
  BASE_PRECISION,
  PRICE_PRECISION,
  initialize,
} from '@drift-labs/sdk';
import { VenueSettlement, SettlementResult } from './types';
import { MatchResult } from '../matcher';

/**
 * Market index mapping for Drift Protocol.
 * Matches yogi/src/keeper/delta-neutral.ts DN_MARKET_MAP.
 */
const DRIFT_MARKET_MAP: Record<number, number> = {
  0: 0,  // SOL-PERP → market index 0
  1: 1,  // BTC-PERP → market index 1
  2: 2,  // ETH-PERP → market index 2
};

/**
 * Drift settlement adapter.
 * Adapted from yogi/src/keeper/position-manager.ts order patterns.
 *
 * For matched dark pool trades, the solver places two opposing limit orders on Drift:
 * - Buyer gets a long perp position at the matched exec price
 * - Seller gets a short perp position at the matched exec price
 *
 * Both use MUST_POST_ONLY for maker fee rebates (-0.002%).
 */
export class DriftSettlement implements VenueSettlement {
  readonly name = 'drift';
  private connection: Connection;
  private solverKeypair: Keypair;
  private driftClient: DriftClient | null = null;
  private initialized = false;

  constructor(connection: Connection, solverKeypair: Keypair) {
    this.connection = connection;
    this.solverKeypair = solverKeypair;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const sdkConfig = initialize({ env: 'devnet' });

    const wallet = new Wallet(this.solverKeypair);
    this.driftClient = new DriftClient({
      connection: this.connection,
      wallet,
      env: 'devnet',
    });

    await this.driftClient.subscribe();
    this.initialized = true;
    console.log('[drift] Settlement adapter initialized');
  }

  async executeMatch(match: MatchResult): Promise<SettlementResult> {
    if (!this.driftClient) {
      return { txSignature: '', success: false, error: 'DriftClient not initialized' };
    }

    const marketIndex = DRIFT_MARKET_MAP[match.marketId];
    if (marketIndex === undefined) {
      return { txSignature: '', success: false, error: `Unknown market ${match.marketId}` };
    }

    console.log(
      `[drift] Settling match: market=${marketIndex} price=${match.execPrice.toString()} qty=${match.fillQty.toString()}`
    );

    try {
      // Place long (buy) for the bid side
      // baseAssetAmount is in BASE_PRECISION (1e9), our fillQty is in 6 decimals
      // Convert: fillQty (6 dec) → BASE_PRECISION (9 dec) = multiply by 1e3
      const baseAssetAmount = match.fillQty.mul(new BN(1000));

      // Price in PRICE_PRECISION (1e6) — our execPrice is already 6 decimals
      const limitPrice = match.execPrice;

      const buyTx = await this.driftClient.placePerpOrder({
        orderType: OrderType.LIMIT,
        marketType: MarketType.PERP,
        marketIndex,
        direction: PositionDirection.LONG,
        baseAssetAmount,
        price: limitPrice,
        reduceOnly: false,
        postOnly: PostOnlyParams.MUST_POST_ONLY,
      });

      console.log(`[drift] Buy (long) placed: ${buyTx}`);

      // Place short (sell) for the ask side
      const sellTx = await this.driftClient.placePerpOrder({
        orderType: OrderType.LIMIT,
        marketType: MarketType.PERP,
        marketIndex,
        direction: PositionDirection.SHORT,
        baseAssetAmount,
        price: limitPrice,
        reduceOnly: false,
        postOnly: PostOnlyParams.MUST_POST_ONLY,
      });

      console.log(`[drift] Sell (short) placed: ${sellTx}`);

      // Return the buy tx as the primary signature
      // Both sides are recorded for the DarkTradeRecord
      return {
        txSignature: buyTx,
        success: true,
      };
    } catch (err: any) {
      console.error(`[drift] Settlement failed:`, err);
      return { txSignature: '', success: false, error: err.message };
    }
  }

  /**
   * Cancel all open orders on a market (cleanup on failure).
   */
  async cancelOrders(marketIndex: number): Promise<void> {
    if (!this.driftClient) return;
    try {
      await this.driftClient.cancelOrders(
        MarketType.PERP,
        marketIndex,
      );
      console.log(`[drift] Cancelled orders on market ${marketIndex}`);
    } catch (err) {
      console.error(`[drift] Failed to cancel orders:`, err);
    }
  }

  /**
   * Shutdown Drift client subscription.
   */
  async shutdown(): Promise<void> {
    if (this.driftClient) {
      await this.driftClient.unsubscribe();
      this.initialized = false;
      console.log('[drift] Shutdown complete');
    }
  }
}

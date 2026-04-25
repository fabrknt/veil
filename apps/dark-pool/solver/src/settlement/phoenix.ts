import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as Phoenix from '@ellipsis-labs/phoenix-sdk';
import BN from 'bn.js';
import { VenueSettlement, SettlementResult } from './types';
import { MatchResult, DecryptedPerpOrder } from '../matcher';

/**
 * Phoenix market addresses on Solana.
 * Phoenix is a spot CLOB — dark pool uses it for the spot leg of
 * delta-neutral strategies (buy spot + short perp on Drift/Jupiter).
 */
const PHOENIX_MARKET_MAP: Record<number, PublicKey> = {
  0: new PublicKey('4DoNfFBfF7UokCC2FQzriy7yHK6DY6NVdYpuekQ5pRgg'), // SOL/USDC
};

/**
 * Phoenix settlement adapter.
 * Adapted from syntx/keeper/src/venues/phoenix.ts
 *
 * Phoenix is a spot CLOB — for dark pool settlement, it executes the
 * spot leg of matched trades. Both sides get IOC swaps at the matched price.
 *
 * Use case: when a dark pool match is for a delta-neutral pair
 * (spot buy on Phoenix + perp short on Drift), the Phoenix adapter
 * handles the spot side.
 */
export class PhoenixSettlement implements VenueSettlement {
  readonly name = 'phoenix';
  private connection: Connection;
  private solverKeypair: Keypair;
  private client: Phoenix.Client | null = null;
  private initialized = false;

  constructor(connection: Connection, solverKeypair: Keypair) {
    this.connection = connection;
    this.solverKeypair = solverKeypair;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const marketAddresses = Object.values(PHOENIX_MARKET_MAP);
    this.client = await Phoenix.Client.createWithoutConfig(
      this.connection,
      marketAddresses,
    );

    this.initialized = true;
    console.log('[phoenix] Settlement adapter initialized');

    // Log market state
    for (const [id, addr] of Object.entries(PHOENIX_MARKET_MAP)) {
      const key = addr.toBase58();
      try {
        const ladder = this.client.getUiLadder(key, 1);
        const bid = ladder.bids[0]?.price ?? 0;
        const ask = ladder.asks[0]?.price ?? 0;
        console.log(`[phoenix] Market ${id}: bid=$${bid.toFixed(2)} ask=$${ask.toFixed(2)}`);
      } catch {
        console.log(`[phoenix] Market ${id}: no data yet`);
      }
    }
  }

  async executeMatch(match: MatchResult): Promise<SettlementResult> {
    const marketAddr = PHOENIX_MARKET_MAP[match.marketId];
    if (!marketAddr) {
      return { txSignature: '', success: false, error: `No Phoenix market for id ${match.marketId}` };
    }

    if (!this.client) {
      return { txSignature: '', success: false, error: 'Phoenix client not initialized' };
    }

    const marketKey = marketAddr.toBase58();

    console.log(
      `[phoenix] Settling match: market=${match.marketId} price=${match.execPrice.toString()} qty=${match.fillQty.toString()}`
    );

    try {
      await this.client.refreshMarket(marketKey);
      const marketState = this.client.marketStates.get(marketKey);
      if (!marketState) {
        return { txSignature: '', success: false, error: `Market state not found: ${marketKey}` };
      }

      // Convert fill quantity from 6-decimal to UI units
      const fillAmount = Number(match.fillQty.toString()) / 1_000_000;

      // Buy side (bid) — buyer gets the spot asset
      const buyPacket = marketState.getSwapOrderPacket({
        side: Phoenix.Side.Bid,
        inAmount: fillAmount,
        slippage: 0.005, // 0.5%
      });
      const buyIx = marketState.createSwapInstruction(buyPacket, this.solverKeypair.publicKey);
      const buyTx = new Transaction().add(buyIx);
      const buySig = await sendAndConfirmTransaction(this.connection, buyTx, [this.solverKeypair]);
      console.log(`[phoenix] Buy swap: ${buySig}`);

      // Sell side (ask) — seller provides the spot asset
      const sellPacket = marketState.getSwapOrderPacket({
        side: Phoenix.Side.Ask,
        inAmount: fillAmount,
        slippage: 0.005,
      });
      const sellIx = marketState.createSwapInstruction(sellPacket, this.solverKeypair.publicKey);
      const sellTx = new Transaction().add(sellIx);
      const sellSig = await sendAndConfirmTransaction(this.connection, sellTx, [this.solverKeypair]);
      console.log(`[phoenix] Sell swap: ${sellSig}`);

      return {
        txSignature: buySig,
        success: true,
      };
    } catch (err: any) {
      console.error('[phoenix] Settlement failed:', err);
      return { txSignature: '', success: false, error: err.message };
    }
  }

  async placeOrder(order: DecryptedPerpOrder): Promise<SettlementResult> {
    const marketAddr = PHOENIX_MARKET_MAP[order.marketId];
    if (!marketAddr) {
      return { txSignature: '', success: false, error: `No Phoenix market for id ${order.marketId}` };
    }
    if (!this.client) {
      return { txSignature: '', success: false, error: 'Phoenix client not initialized' };
    }

    const marketKey = marketAddr.toBase58();
    console.log(`[phoenix] Fallback ${order.side}: market=${order.marketId} qty=${order.remainingQty.toString()}`);

    try {
      await this.client.refreshMarket(marketKey);
      const marketState = this.client.marketStates.get(marketKey);
      if (!marketState) {
        return { txSignature: '', success: false, error: `Market state not found: ${marketKey}` };
      }

      const fillAmount = Number(order.remainingQty.toString()) / 1_000_000;
      const side = order.side === 'long' ? Phoenix.Side.Bid : Phoenix.Side.Ask;
      const packet = marketState.getSwapOrderPacket({ side, inAmount: fillAmount, slippage: 0.005 });
      const ix = marketState.createSwapInstruction(packet, this.solverKeypair.publicKey);
      const tx = new Transaction().add(ix);
      const sig = await sendAndConfirmTransaction(this.connection, tx, [this.solverKeypair]);
      return { txSignature: sig, success: true };
    } catch (err: any) {
      return { txSignature: '', success: false, error: err.message };
    }
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    console.log('[phoenix] Shutdown complete');
  }
}

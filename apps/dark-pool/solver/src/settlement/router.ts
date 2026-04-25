import { Connection } from '@solana/web3.js';
import BN from 'bn.js';
import { VenueSettlement, SettlementResult } from './types';
import { MatchResult, DecryptedPerpOrder } from '../matcher';

/**
 * Fee structure per venue (in basis points).
 * Taker fees — what you pay when hitting the public book.
 */
const VENUE_FEES: Record<string, { takerBps: number; makerBps: number; name: string }> = {
  drift:   { takerBps: 4.5, makerBps: -0.2, name: 'Drift' },    // -0.2 = maker rebate
  jupiter: { takerBps: 6.0, makerBps: 0,    name: 'Jupiter' },   // pool-based, no maker rebate
  phoenix: { takerBps: 4.0, makerBps: 1.0,  name: 'Phoenix' },   // spot CLOB
};

/**
 * Fee charged by the dark pool for internal matches (in basis points).
 * This is LOWER than any venue — that's the value proposition.
 */
const DARK_POOL_FEE_BPS = 3.0;

/**
 * VenueRouter — scores venues and picks best execution for each trade.
 *
 * When orders match internally in the dark pool, they bypass venue fees entirely.
 * When they need to go to a venue (fallback), the router picks the cheapest one.
 *
 * Fee savings from internal matching:
 *   Drift taker:   4.5 bps → saved
 *   Jupiter taker: 6.0 bps → saved
 *   + slippage:    ~2-10 bps → saved
 *   + MEV:         ~1-5 bps → saved
 *   Total savings: 7-20 bps per internally matched trade
 */
export class VenueRouter {
  private venues: Map<string, VenueSettlement> = new Map();
  private stats: SettlementStats;

  constructor() {
    this.stats = {
      internalMatches: 0,
      venueSettlements: 0,
      totalVolume: new BN(0),
      internalVolume: new BN(0),
      venueVolume: new BN(0),
      feeSavedBps: 0,
      feeSavedUsd: 0,
    };
  }

  /**
   * Register a settlement venue.
   */
  addVenue(venue: VenueSettlement): void {
    this.venues.set(venue.name, venue);
  }

  /**
   * Record an internal match (no venue needed).
   * This is the netting benefit — orders crossed in the dark pool.
   */
  recordInternalMatch(match: MatchResult): void {
    this.stats.internalMatches++;
    const volume = match.execPrice.mul(match.fillQty).div(new BN(1_000_000)); // normalize
    this.stats.internalVolume = this.stats.internalVolume.add(volume);
    this.stats.totalVolume = this.stats.totalVolume.add(volume);

    // Calculate fee saved vs best venue
    const bestVenueFee = Math.min(...Object.values(VENUE_FEES).map(v => v.takerBps));
    const savedBps = bestVenueFee - DARK_POOL_FEE_BPS;
    const savedUsd = Number(volume.toString()) * savedBps / 10000;
    this.stats.feeSavedBps += savedBps;
    this.stats.feeSavedUsd += savedUsd;
  }

  /**
   * Route a trade to the best venue for settlement.
   * Tries venues in fee order; if one fails, cascades to the next.
   */
  async routeToVenue(match: MatchResult, preferredVenue?: string): Promise<SettlementResult> {
    const ranked = this.rankVenues(preferredVenue);

    if (ranked.length === 0) {
      return { txSignature: '', success: false, error: 'No venues available' };
    }

    for (const { name, venue, fee } of ranked) {
      console.log(`[router] Trying venue: ${name} (${fee} bps taker fee)`);
      const result = await venue.executeMatch(match);

      if (result.success) {
        this.stats.venueSettlements++;
        const volume = match.execPrice.mul(match.fillQty).div(new BN(1_000_000));
        this.stats.venueVolume = this.stats.venueVolume.add(volume);
        this.stats.totalVolume = this.stats.totalVolume.add(volume);
        return result;
      }

      console.warn(`[router] Venue ${name} failed: ${result.error}, trying next`);
    }

    return { txSignature: '', success: false, error: 'All venues failed' };
  }

  /**
   * Route a single unmatched order to the best venue as fallback.
   * Tries venues in fee order; if one fails, cascades to the next.
   */
  async routeSingleOrder(order: DecryptedPerpOrder, preferredVenue?: string): Promise<SettlementResult> {
    const ranked = this.rankVenues(preferredVenue);

    if (ranked.length === 0) {
      return { txSignature: '', success: false, error: 'No venues available for fallback' };
    }

    for (const { name, venue, fee } of ranked) {
      console.log(`[router] Trying fallback venue: ${name} (${fee} bps)`);
      const result = await venue.placeOrder(order);

      if (result.success) {
        this.stats.venueSettlements++;
        const volume = order.price.mul(order.remainingQty).div(new BN(1_000_000));
        this.stats.venueVolume = this.stats.venueVolume.add(volume);
        this.stats.totalVolume = this.stats.totalVolume.add(volume);
        return result;
      }

      console.warn(`[router] Fallback venue ${name} failed: ${result.error}, trying next`);
    }

    return { txSignature: '', success: false, error: 'All venues failed for fallback' };
  }

  /**
   * Get settlement statistics — shows the value of internal netting.
   */
  getStats(): SettlementStats {
    return { ...this.stats };
  }

  /**
   * Restore stats from persistent storage (called on startup).
   */
  restoreStats(stats: SettlementStats): void {
    this.stats = { ...stats };
  }

  /**
   * Rank venues by fee, with preferred venue first if specified.
   */
  private rankVenues(preferredVenue?: string): { name: string; venue: VenueSettlement; fee: number }[] {
    const scored = Array.from(this.venues.entries())
      .map(([name, v]) => ({ name, venue: v, fee: VENUE_FEES[name]?.takerBps ?? 100 }))
      .sort((a, b) => a.fee - b.fee);

    if (preferredVenue) {
      const prefIdx = scored.findIndex(s => s.name === preferredVenue);
      if (prefIdx > 0) {
        const [pref] = scored.splice(prefIdx, 1);
        scored.unshift(pref);
      }
    }

    return scored;
  }

  /**
   * Get fee comparison for display.
   */
  getFeeComparison(): FeeComparison {
    return {
      darkPoolFeeBps: DARK_POOL_FEE_BPS,
      venues: Object.entries(VENUE_FEES).map(([id, v]) => ({
        id,
        name: v.name,
        takerBps: v.takerBps,
        makerBps: v.makerBps,
        savingsVsDarkPool: v.takerBps - DARK_POOL_FEE_BPS,
      })),
      estimatedSlippageSaved: '2-10 bps',
      estimatedMevSaved: '1-5 bps',
    };
  }
}

export interface SettlementStats {
  /** Number of orders matched internally (no venue needed) */
  internalMatches: number;
  /** Number of orders settled on a venue */
  venueSettlements: number;
  /** Total volume processed */
  totalVolume: BN;
  /** Volume matched internally */
  internalVolume: BN;
  /** Volume settled on venues */
  venueVolume: BN;
  /** Total basis points saved from internal matching */
  feeSavedBps: number;
  /** Total USD saved from internal matching */
  feeSavedUsd: number;
}

export interface FeeComparison {
  darkPoolFeeBps: number;
  venues: {
    id: string;
    name: string;
    takerBps: number;
    makerBps: number;
    savingsVsDarkPool: number;
  }[];
  estimatedSlippageSaved: string;
  estimatedMevSaved: string;
}

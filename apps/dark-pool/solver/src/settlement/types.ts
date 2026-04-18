import { MatchResult } from '../matcher';

/**
 * Settlement result from executing a matched dark pool trade on a venue.
 */
export interface SettlementResult {
  /** Transaction signature from venue execution */
  txSignature: string;
  /** Whether settlement succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Interface for venue settlement adapters.
 * Each venue (Drift, Jupiter Perps) implements this to execute matched trades.
 */
export interface VenueSettlement {
  /** Venue name */
  readonly name: string;

  /** Initialize connection to venue */
  initialize(): Promise<void>;

  /**
   * Execute a matched dark pool trade on-venue.
   * The adapter places opposing orders for buyer and seller.
   */
  executeMatch(match: MatchResult): Promise<SettlementResult>;
}

import { PublicKey } from '@solana/web3.js';

/**
 * DarkFlow pool configuration
 */
export interface DarkPoolConfig {
  /** Token A mint */
  tokenAMint: PublicKey;
  /** Token B mint */
  tokenBMint: PublicKey;
  /** Fee rate in basis points */
  feeRateBps: number;
  /** Pool encryption public key */
  encryptionPubkey: Uint8Array;
  /** Trusted solver/attestor that must sign order execution and dark swaps */
  solver: PublicKey;
}

/**
 * Dark pool state
 */
export interface DarkPoolState {
  /** Pool address */
  address: PublicKey;
  /** Pool authority */
  authority: PublicKey;
  /** Trusted solver/attestor (signs execute_dark_order and dark_swap) */
  solver: PublicKey;
  /** Token A mint */
  tokenAMint: PublicKey;
  /** Token B mint */
  tokenBMint: PublicKey;
  /** Encryption public key */
  encryptionPubkey: Uint8Array;
  /** Fee rate in basis points */
  feeRateBps: number;
  /** Number of LP positions */
  positionCount: number;
  /** Total liquidity units (sum of positions + locked minimum) */
  totalLiquidity: bigint;
  /** Total orders processed */
  orderCount: number;
  /** Is pool active */
  isActive: boolean;
}

/**
 * Pool aggregates (public data)
 */
export interface PoolAggregates {
  /** Total value locked in token A */
  tvlTokenA: bigint;
  /** Total value locked in token B */
  tvlTokenB: bigint;
  /** Number of LPs */
  lpCount: number;
  /** 24h volume */
  volume24h: bigint;
  /** Utilization rate (basis points) */
  utilizationBps: number;
}

/**
 * Encrypted LP position
 */
export interface EncryptedPositionState {
  /** Position address */
  address: PublicKey;
  /** Position owner */
  owner: PublicKey;
  /** Pool address */
  pool: PublicKey;
  /** Encrypted amount data */
  encryptedData: Uint8Array;
  /** Position commitment */
  commitment: Uint8Array;
  /** Liquidity units held (withdrawals pay vault * burned / totalLiquidity) */
  liquidity: bigint;
  /** Is position active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: number;
}

/**
 * Decrypted position data (only available to owner)
 */
export interface DecryptedPositionData {
  /** Token A amount */
  amountA: bigint;
  /** Token B amount */
  amountB: bigint;
  /** Share percentage (basis points) */
  shareBps: number;
}

/**
 * Dark order state
 */
export interface DarkOrderState {
  /** Order address */
  address: PublicKey;
  /** Order maker */
  maker: PublicKey;
  /** Pool address */
  pool: PublicKey;
  /** Input token mint */
  inputMint: PublicKey;
  /** Output token mint */
  outputMint: PublicKey;
  /** Encrypted order parameters */
  encryptedParams: Uint8Array;
  /** Order commitment */
  commitment: Uint8Array;
  /** Input amount (public) */
  inputAmount: bigint;
  /** Deadline */
  deadline: number;
  /** Order status */
  status: OrderStatus;
  /** Executed by (if filled) */
  executedBy?: PublicKey;
}

/**
 * Order status enum
 */
export enum OrderStatus {
  Pending = 'pending',
  Filled = 'filled',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

/**
 * Dark swap parameters
 */
export interface DarkSwapParams {
  /** Input token mint */
  inputMint: PublicKey;
  /** Output token mint */
  outputMint: PublicKey;
  /** Input amount */
  inputAmount: bigint;
  /** Minimum output amount */
  minOutputAmount: bigint;
  /** Deadline (Unix timestamp) */
  deadline: number;
}

/**
 * Add liquidity parameters
 */
export interface AddLiquidityParams {
  /** Pool address */
  pool: PublicKey;
  /** Token A amount */
  amountA: bigint;
  /** Token B amount */
  amountB: bigint;
}

/**
 * Remove liquidity parameters
 */
export interface RemoveLiquidityParams {
  /** Position address */
  position: PublicKey;
  /** Percentage to withdraw (basis points, 10000 = 100%) */
  withdrawPercentageBps: number;
}

/**
 * Confidential launch configuration
 */
export interface LaunchConfig {
  /** Token mint */
  tokenMint: PublicKey;
  /** Initial price */
  initialPrice: bigint;
  /** Maximum supply */
  maxSupply: bigint;
  /** Bonding curve type */
  curveType: 'linear' | 'exponential' | 'logarithmic';
  /** Start time (optional) */
  startTime?: number;
  /** End time (optional) */
  endTime?: number;
}

/**
 * Launch state
 */
export interface LaunchState {
  /** Launch address */
  address: PublicKey;
  /** Creator */
  creator: PublicKey;
  /** Token mint */
  tokenMint: PublicKey;
  /** Initial price */
  initialPrice: bigint;
  /** Max supply */
  maxSupply: bigint;
  /** Approximate sold (public aggregate) */
  approximateSold: bigint;
  /** Buyer count */
  buyerCount: number;
  /** Total payments received */
  totalPayments: bigint;
  /** Launch status */
  status: LaunchStatus;
}

/**
 * Launch status enum
 */
export enum LaunchStatus {
  Active = 'active',
  SoldOut = 'sold_out',
  Cancelled = 'cancelled',
  Ended = 'ended',
}

/**
 * Transaction result
 */
export interface TxResult {
  /** Transaction signature */
  signature: string;
  /** Whether transaction was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

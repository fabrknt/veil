import { PublicKey } from '@solana/web3.js';
import { DarkFlowClient } from './darkflow';
import { DarkPoolConfig, DarkPoolState, PoolAggregates, TxResult } from './types';

/**
 * Pool-specific operations for DarkFlow
 */
export class DarkPoolOperations {
  constructor(private client: DarkFlowClient) {}

  /**
   * Create a new dark liquidity pool
   */
  async createPool(config: DarkPoolConfig): Promise<TxResult> {
    return this.client.initializePool(config);
  }

  /**
   * Get pool state
   */
  async getState(poolAddress: PublicKey): Promise<DarkPoolState | null> {
    return this.client.getPoolState(poolAddress);
  }

  /**
   * Get pool aggregates (public stats)
   */
  async getAggregates(poolAddress: PublicKey): Promise<PoolAggregates | null> {
    return this.client.getPoolAggregates(poolAddress);
  }

  /**
   * Find pool address for a token pair
   */
  static findPoolAddress(
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    programId: PublicKey = new PublicKey('8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U')
  ): PublicKey {
    const [poolAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('dark_pool'), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      programId
    );
    return poolAddress;
  }

  /**
   * Program config address. Pool creation (initialize_pool) must be signed
   * by the admin stored here; the config is created once by the program
   * upgrade authority with initialize_config.
   */
  static findConfigAddress(
    programId: PublicKey = new PublicKey('8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U')
  ): PublicKey {
    const [configAddress] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
    return configAddress;
  }

  /**
   * Calculate pool fee for an amount
   */
  static calculateFee(amount: bigint, feeRateBps: number): bigint {
    return (amount * BigInt(feeRateBps)) / BigInt(10000);
  }
}

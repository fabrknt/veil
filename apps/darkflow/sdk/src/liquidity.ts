import { PublicKey } from '@solana/web3.js';
import { DarkFlowClient } from './darkflow';
import {
  AddLiquidityParams,
  RemoveLiquidityParams,
  EncryptedPositionState,
  DecryptedPositionData,
  TxResult,
} from './types';
import { decrypt, EncryptionKeypair } from '@fabrknt/veil-core';

/**
 * Liquidity operations for DarkFlow
 */
export class LiquidityOperations {
  constructor(private client: DarkFlowClient) {}

  /**
   * Add liquidity to a pool with encrypted amounts
   *
   * Your deposit size is hidden from other users.
   */
  async addLiquidity(params: AddLiquidityParams): Promise<TxResult> {
    return this.client.addLiquidityEncrypted(params);
  }

  /**
   * Remove liquidity privately with ZK proof
   *
   * Prove ownership without revealing amount.
   */
  async removeLiquidity(params: RemoveLiquidityParams): Promise<TxResult> {
    return this.client.removeLiquidityPrivate(params);
  }

  /**
   * Get a specific position
   */
  async getPosition(positionAddress: PublicKey): Promise<EncryptedPositionState | null> {
    return this.client.getPosition(positionAddress);
  }

  /**
   * Get all positions for the current user
   */
  async getUserPositions(): Promise<EncryptedPositionState[]> {
    return this.client.getUserPositions();
  }

  /**
   * Decrypt position data (only works if you're the owner)
   */
  decryptPositionData(
    position: EncryptedPositionState,
    senderPubkey: Uint8Array,
    encryptionKeypair: EncryptionKeypair
  ): DecryptedPositionData | null {
    try {
      const decrypted = decrypt(
        position.encryptedData,
        senderPubkey,
        encryptionKeypair
      );

      const data = JSON.parse(new TextDecoder().decode(decrypted));

      return {
        amountA: BigInt(data.amountA),
        amountB: BigInt(data.amountB),
        shareBps: data.shareBps || 0,
      };
    } catch (error) {
      console.error('Failed to decrypt position data:', error);
      return null;
    }
  }

  /**
   * Calculate expected share for a deposit
   */
  static calculateShareForDeposit(
    depositA: bigint,
    depositB: bigint,
    poolReserveA: bigint,
    poolReserveB: bigint
  ): number {
    if (poolReserveA === BigInt(0) || poolReserveB === BigInt(0)) {
      return 10000; // 100% of empty pool
    }

    // Share based on smaller ratio
    const ratioA = (depositA * BigInt(10000)) / poolReserveA;
    const ratioB = (depositB * BigInt(10000)) / poolReserveB;

    return Number(ratioA < ratioB ? ratioA : ratioB);
  }

  /**
   * Find position address for a user in a pool
   *
   * `positionId` is the pool's `nextPositionId` at the time the position was
   * created (pass the pool's current `nextPositionId` for a new deposit). It
   * only ever increases, unlike `positionCount`.
   */
  static findPositionAddress(
    pool: PublicKey,
    owner: PublicKey,
    positionId: number | bigint,
    programId: PublicKey = new PublicKey('8UvUSCfsXUjRW6NwcLVEJ4Y5jg8nWbxsZGNrzK1xs38U')
  ): PublicKey {
    const [positionAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('position'),
        pool.toBuffer(),
        owner.toBuffer(),
        Buffer.from(new Uint8Array(new BigUint64Array([BigInt(positionId)]).buffer)),
      ],
      programId
    );
    return positionAddress;
  }
}

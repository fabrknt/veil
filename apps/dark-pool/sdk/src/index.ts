/**
 * Veil Dark Pool SDK
 *
 * Client library for submitting encrypted perp orders to the dark pool.
 * Wraps @fabrknt/veil-orders for encryption and @coral-xyz/anchor for on-chain interaction.
 */

export {
  // Perp order encryption
  PerpOrderPayload,
  PerpSide,
  PerpOrderType,
  serializePerpOrderPayload,
  deserializePerpOrderPayload,
  encryptPerpOrderPayload,
  decryptPerpOrderPayload,
  computePerpPayloadHash,
  createCommittedEncryptedPerpOrder,
  // Re-exports from veil-orders
  EncryptionKeypair,
  generateEncryptionKeypair,
} from '@fabrknt/veil-orders';

// Re-export schema for direct use
export { PERP_ORDER_SCHEMA } from '@fabrknt/veil-core';

/**
 * Market identifiers matching on-chain config.
 */
export const MARKETS = {
  SOL_PERP: 0,
  BTC_PERP: 1,
  ETH_PERP: 2,
} as const;

/**
 * Venue identifiers matching on-chain config.
 */
export const VENUES = {
  DRIFT: 0,
  JUPITER: 1,
  PHOENIX: 2,
} as const;

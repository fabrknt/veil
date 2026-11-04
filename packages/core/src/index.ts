// NaCl Box encryption (Curve25519-XSalsa20-Poly1305) — chain-agnostic
export {
  EncryptionKeypair,
  EncryptedData,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
  encryptForMultiple,
  encryptionKeyToBase58,
  base58ToEncryptionKey,
  encryptionKeyToHex,
  hexToEncryptionKey,
  validateEncryptedData,
} from './nacl-box';

// Threshold secret sharing (Shamir's)
export {
  SecretShare,
  ThresholdConfig,
  splitSecret,
  combineShares,
  verifyShares,
  createThresholdEncryption,
  decryptWithThreshold,
} from './threshold';

// Payload serialization
export {
  FieldType,
  FieldDef,
  PayloadSchema,
  calculateSchemaSize,
  serializePayload,
  deserializePayload,
  SWAP_ORDER_SCHEMA,
  PERP_ORDER_SCHEMA,
  RWA_ASSET_SCHEMA,
  RWA_ACCESS_GRANT_SCHEMA,
} from './payload';

// Solana extensions are not exported here: import them from '@fabrknt/veil-core/solana'
// (all of them) or '@fabrknt/veil-core/solana/<part>', with the optional peer dependencies
// @solana/web3.js and @lightprotocol/* installed.

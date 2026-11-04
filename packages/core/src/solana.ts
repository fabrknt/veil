// Solana extensions — all of them, from one path. Needs the optional peer dependencies
// @solana/web3.js, @lightprotocol/stateless.js and @lightprotocol/compressed-token.

// ZK Compression (Light Protocol)
export {
  ZkCompressionConfig,
  CompressedAccount,
  CompressedPayload,
  CompressedTokenInfo,
  createZkRpc,
  createStandardConnection,
  compressData,
  decompressData,
  createCompressedMint,
  mintCompressedTokens,
  transferCompressedTokens,
  getCompressedTokenBalance,
  compressTokenAccount,
  decompressTokenAccount,
  estimateCompressionSavings,
} from './zk-compression';

// Shielded Transfers (Privacy Cash)
export {
  PrivacyCashConfig,
  ShieldedBalance,
  DepositResult,
  WithdrawalResult,
  ShieldedTransferParams,
  PrivacyCashClient,
  createShieldedTransfer,
  verifyShieldedProof,
  estimateShieldedFee,
  isPrivacyCashAvailable,
  shieldTokens,
  unshieldTokens,
} from './shielded';

// Arcium Integration (Encrypted Shared State)
export {
  ArciumConfig,
  EncryptedStateEntry,
  PoolAggregates,
  EncryptedPosition,
  DarkOrder,
  MpcComputationResult,
  ArciumClient,
  DarkPoolStateManager,
  createArciumClient,
  createDarkPoolManager,
} from './arcium';

// Noir ZK Proofs
export {
  NoirProof,
  VerificationResult,
  SwapProofInputs,
  SwapProofOutputs,
  PositionProofInputs,
  RangeProofInputs,
  CircuitConfig,
  NoirProver,
  NoirVerifier,
  createNoirProver,
  createNoirVerifier,
  generateSwapProof,
  verifySwapProof,
  generateRangeProof,
  OrderCommitmentProofInputs,
  OrderCommitmentProofOutputs,
  generateOrderCommitmentProof,
  verifyOrderCommitmentProof,
} from './noir';

// Helius / QuickNode connections
export * from './rpc-providers';

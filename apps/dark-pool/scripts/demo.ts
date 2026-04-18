/**
 * Veil Dark Pool — End-to-End Demo Script
 *
 * Demonstrates the full dark pool lifecycle on Solana devnet:
 * 1. Initialize the dark pool
 * 2. Trader A encrypts a LONG SOL-PERP order
 * 3. Trader B encrypts a SHORT SOL-PERP order
 * 4. Both submit commitment hashes on-chain with USDC collateral
 * 5. Solver decrypts both, matching engine finds a cross
 * 6. Solver calls reveal_match → DarkTradeRecord created
 * 7. Solver calls settle_trade → collateral returned
 *
 * Usage: npx ts-node scripts/demo.ts
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { BorshCoder, BN } from '@coral-xyz/anchor';
import {
  generateEncryptionKeypair,
  createCommittedEncryptedPerpOrder,
  decryptPerpOrderPayload,
  PerpOrderPayload,
} from '@fabrknt/veil-orders';
import { PerpMatcher } from '../solver/src/matcher';
import { createHash } from 'crypto';

// ----- Config -----
const PROGRAM_ID = new PublicKey('FPAF4iwMtb2CWDcqpWf6NJzJCYrBhQNH8PkWY8ZCGMUA');
const RPC_URL = process.env.RPC_URL || 'http://localhost:8899';

// PDA seeds (must match on-chain constants)
const CONFIG_SEED = Buffer.from('dark_pool_config');
const COMMITMENT_SEED = Buffer.from('commitment');
const COLLATERAL_VAULT_SEED = Buffer.from('collateral_vault');
const TRADE_SEED = Buffer.from('dark_trade');

// ----- Helpers -----

function findConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}

function findCommitmentPda(commitmentId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(commitmentId));
  return PublicKey.findProgramAddressSync([COMMITMENT_SEED, buf], PROGRAM_ID);
}

function findCollateralVaultPda(commitmentPda: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [COLLATERAL_VAULT_SEED, commitmentPda.toBuffer()],
    PROGRAM_ID,
  );
}

function findTradePda(tradeId: number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(tradeId));
  return PublicKey.findProgramAddressSync([TRADE_SEED, buf], PROGRAM_ID);
}

/** Build an Anchor instruction manually (discriminator + borsh-encoded args) */
function buildInstruction(
  name: string,
  data: Buffer,
  keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
): Transaction {
  const discriminator = createHash('sha256')
    .update(`global:${name}`)
    .digest()
    .slice(0, 8);

  const tx = new Transaction();
  tx.add({
    programId: PROGRAM_ID,
    keys,
    data: Buffer.concat([discriminator, data]),
  });
  return tx;
}

/** Encode initialize args: solver(Pubkey) + fee_bps(u16) + min_order(u64) + max_order(u64) */
function encodeInitialize(solver: PublicKey, feeBps: number, minOrder: bigint, maxOrder: bigint): Buffer {
  const buf = Buffer.alloc(32 + 2 + 8 + 8);
  solver.toBuffer().copy(buf, 0);
  buf.writeUInt16LE(feeBps, 32);
  buf.writeBigUInt64LE(minOrder, 34);
  buf.writeBigUInt64LE(maxOrder, 42);
  return buf;
}

/** Encode submit_perp_order args */
function encodeSubmitPerpOrder(
  collateralAmount: bigint,
  marketId: number,
  ttlSeconds: number,
  commitmentHash: Uint8Array,
  userEncPubkey: Uint8Array,
  encryptedPayload: Uint8Array,
): Buffer {
  // collateral(u64) + market_id(u8) + ttl(u32) + hash(32) + enc_pubkey(32) + vec_len(u32) + payload
  const buf = Buffer.alloc(8 + 1 + 4 + 32 + 32 + 4 + encryptedPayload.length);
  let offset = 0;
  buf.writeBigUInt64LE(collateralAmount, offset); offset += 8;
  buf.writeUInt8(marketId, offset); offset += 1;
  buf.writeUInt32LE(ttlSeconds, offset); offset += 4;
  Buffer.from(commitmentHash).copy(buf, offset); offset += 32;
  Buffer.from(userEncPubkey).copy(buf, offset); offset += 32;
  buf.writeUInt32LE(encryptedPayload.length, offset); offset += 4;
  Buffer.from(encryptedPayload).copy(buf, offset);
  return buf;
}

/** Encode reveal_match args */
function encodeRevealMatch(
  bidSide: number, bidOrderType: number, bidPrice: bigint, bidQty: bigint, bidSlippage: number, bidMarket: number,
  askSide: number, askOrderType: number, askPrice: bigint, askQty: bigint, askSlippage: number, askMarket: number,
  execPrice: bigint, fillQty: bigint, venue: number,
): Buffer {
  const buf = Buffer.alloc(1+1+8+8+2+1 + 1+1+8+8+2+1 + 8+8+1);
  let o = 0;
  buf.writeUInt8(bidSide, o); o+=1;
  buf.writeUInt8(bidOrderType, o); o+=1;
  buf.writeBigUInt64LE(bidPrice, o); o+=8;
  buf.writeBigUInt64LE(bidQty, o); o+=8;
  buf.writeUInt16LE(bidSlippage, o); o+=2;
  buf.writeUInt8(bidMarket, o); o+=1;
  buf.writeUInt8(askSide, o); o+=1;
  buf.writeUInt8(askOrderType, o); o+=1;
  buf.writeBigUInt64LE(askPrice, o); o+=8;
  buf.writeBigUInt64LE(askQty, o); o+=8;
  buf.writeUInt16LE(askSlippage, o); o+=2;
  buf.writeUInt8(askMarket, o); o+=1;
  buf.writeBigUInt64LE(execPrice, o); o+=8;
  buf.writeBigUInt64LE(fillQty, o); o+=8;
  buf.writeUInt8(venue, o); o+=1;
  return buf;
}

/** Encode settle_trade args */
function encodeSettleTrade(venueTxSig: string): Buffer {
  const sigBytes = Buffer.from(venueTxSig, 'utf-8');
  const buf = Buffer.alloc(4 + sigBytes.length);
  buf.writeUInt32LE(sigBytes.length, 0);
  sigBytes.copy(buf, 4);
  return buf;
}

// ----- Main Demo -----

async function main() {
  console.log('='.repeat(60));
  console.log('  VEIL DARK POOL — End-to-End Demo');
  console.log('='.repeat(60));
  console.log();

  const connection = new Connection(RPC_URL, 'confirmed');

  // Load funder from default keypair, generate test accounts
  const fs = require('fs');
  const funderPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;
  const funder = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(funderPath, 'utf-8'))));
  const admin = Keypair.generate();
  const solver = Keypair.generate();
  const traderA = Keypair.generate();
  const traderB = Keypair.generate();

  console.log('[setup] Funder:', funder.publicKey.toBase58());
  console.log('[setup] Admin:', admin.publicKey.toBase58());
  console.log('[setup] Solver:', solver.publicKey.toBase58());
  console.log('[setup] Trader A:', traderA.publicKey.toBase58());
  console.log('[setup] Trader B:', traderB.publicKey.toBase58());
  console.log();

  // Fund accounts from funder wallet (works even when airdrop is rate-limited)
  console.log('[setup] Funding accounts...');
  const fundAmount = 0.5e9; // 0.5 SOL each
  for (const kp of [admin, solver, traderA, traderB]) {
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: funder.publicKey,
        toPubkey: kp.publicKey,
        lamports: fundAmount,
      }),
    );
    await sendAndConfirmTransaction(connection, tx, [funder]);
    console.log('       Funded 0.5 SOL to', kp.publicKey.toBase58().slice(0, 8) + '...');
  }
  console.log('[setup] All accounts funded');

  // Create USDC mock mint
  console.log('[setup] Creating mock USDC mint...');
  const usdcMint = await createMint(connection, admin, admin.publicKey, null, 6);
  console.log('[setup] USDC mint:', usdcMint.toBase58());

  // Create token accounts and mint USDC
  const traderAUsdc = await createAssociatedTokenAccount(connection, traderA, usdcMint, traderA.publicKey);
  const traderBUsdc = await createAssociatedTokenAccount(connection, traderB, usdcMint, traderB.publicKey);
  const feeUsdc = await createAssociatedTokenAccount(connection, admin, usdcMint, admin.publicKey);

  await mintTo(connection, admin, usdcMint, traderAUsdc, admin, 1000_000_000); // 1000 USDC
  await mintTo(connection, admin, usdcMint, traderBUsdc, admin, 1000_000_000);
  console.log('[setup] Minted 1000 USDC each to Trader A and B');
  console.log();

  // ===== Step 1: Initialize Dark Pool =====
  console.log('[1/6] Initializing dark pool...');

  const [configPda] = findConfigPda();
  const initData = encodeInitialize(
    solver.publicKey,
    30,                  // 0.3% fee
    1_000_000n,          // min 1 USDC
    1_000_000_000_000n,  // max 1M USDC
  );

  const initTx = buildInstruction('initialize', initData, [
    { pubkey: admin.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]);

  const initSig = await sendAndConfirmTransaction(connection, initTx, [admin]);
  console.log('[1/6] Dark pool initialized:', initSig);
  console.log('       Config PDA:', configPda.toBase58());
  console.log();

  // ===== Step 2: Encrypt Orders =====
  console.log('[2/6] Encrypting perp orders...');

  const solverEncKeypair = generateEncryptionKeypair();
  const traderAEncKeypair = generateEncryptionKeypair();
  const traderBEncKeypair = generateEncryptionKeypair();

  // Trader A: LONG SOL-PERP at $150, 10 units
  const orderA: PerpOrderPayload = {
    side: 'long',
    orderType: 'limit',
    price: new BN(150_000_000),  // $150
    quantity: new BN(10_000_000), // 10.0
    maxSlippageBps: 50,
    marketId: 0, // SOL
  };

  const encOrderA = createCommittedEncryptedPerpOrder(
    orderA, solverEncKeypair.publicKey, traderAEncKeypair,
  );

  // Trader B: SHORT SOL-PERP at $149, 10 units
  const orderB: PerpOrderPayload = {
    side: 'short',
    orderType: 'limit',
    price: new BN(149_000_000),  // $149
    quantity: new BN(10_000_000), // 10.0
    maxSlippageBps: 50,
    marketId: 0, // SOL
  };

  const encOrderB = createCommittedEncryptedPerpOrder(
    orderB, solverEncKeypair.publicKey, traderBEncKeypair,
  );

  console.log('       Trader A order: LONG SOL-PERP @ $150, qty=10');
  console.log('       Encrypted payload:', Buffer.from(encOrderA.encryptedBytes).toString('hex').slice(0, 40) + '...');
  console.log('       Commitment hash:', Buffer.from(encOrderA.payloadHash).toString('hex').slice(0, 20) + '...');
  console.log();
  console.log('       Trader B order: SHORT SOL-PERP @ $149, qty=10');
  console.log('       Encrypted payload:', Buffer.from(encOrderB.encryptedBytes).toString('hex').slice(0, 40) + '...');
  console.log('       Commitment hash:', Buffer.from(encOrderB.payloadHash).toString('hex').slice(0, 20) + '...');
  console.log();

  // ===== Step 3: Submit Commitments On-Chain =====
  console.log('[3/6] Submitting commitments on-chain...');

  const collateral = 100_000_000n; // 100 USDC each

  // Trader A submits (commitment_id = 0)
  const [commitA] = findCommitmentPda(0);
  const [vaultA] = findCollateralVaultPda(commitA);
  const submitAData = encodeSubmitPerpOrder(
    collateral, 0, 3600,
    encOrderA.payloadHash,
    encOrderA.userPublicKey,
    encOrderA.encryptedBytes,
  );

  const submitATx = buildInstruction('submit_perp_order', submitAData, [
    { pubkey: traderA.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: commitA, isSigner: false, isWritable: true },
    { pubkey: vaultA, isSigner: false, isWritable: true },
    { pubkey: traderAUsdc, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]);

  const sigA = await sendAndConfirmTransaction(connection, submitATx, [traderA]);
  console.log('       Trader A commitment submitted:', sigA);
  console.log('       Commitment PDA:', commitA.toBase58());
  console.log('       Collateral vault:', vaultA.toBase58());

  // Trader B submits (commitment_id = 1)
  const [commitB] = findCommitmentPda(1);
  const [vaultB] = findCollateralVaultPda(commitB);
  const submitBData = encodeSubmitPerpOrder(
    collateral, 0, 3600,
    encOrderB.payloadHash,
    encOrderB.userPublicKey,
    encOrderB.encryptedBytes,
  );

  const submitBTx = buildInstruction('submit_perp_order', submitBData, [
    { pubkey: traderB.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: commitB, isSigner: false, isWritable: true },
    { pubkey: vaultB, isSigner: false, isWritable: true },
    { pubkey: traderBUsdc, isSigner: false, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]);

  const sigB = await sendAndConfirmTransaction(connection, submitBTx, [traderB]);
  console.log('       Trader B commitment submitted:', sigB);
  console.log('       Commitment PDA:', commitB.toBase58());
  console.log();

  // ===== Step 4: Solver Decrypts + Matches =====
  console.log('[4/6] Solver decrypting orders...');

  const decryptedA = decryptPerpOrderPayload(
    encOrderA.encryptedBytes, traderAEncKeypair.publicKey, solverEncKeypair,
  );
  const decryptedB = decryptPerpOrderPayload(
    encOrderB.encryptedBytes, traderBEncKeypair.publicKey, solverEncKeypair,
  );

  console.log('       Decrypted A:', decryptedA.side, decryptedA.orderType, 'price=' + decryptedA.price.toString(), 'qty=' + decryptedA.quantity.toString());
  console.log('       Decrypted B:', decryptedB.side, decryptedB.orderType, 'price=' + decryptedB.price.toString(), 'qty=' + decryptedB.quantity.toString());

  // Feed into matching engine
  const matcher = new PerpMatcher();
  matcher.addOrder({
    commitmentId: 0,
    commitmentPda: commitA,
    trader: traderA.publicKey,
    marketId: 0,
    side: decryptedA.side,
    orderType: decryptedA.orderType,
    price: decryptedA.price,
    quantity: decryptedA.quantity,
    remainingQty: new BN(decryptedA.quantity.toString()),
    maxSlippageBps: decryptedA.maxSlippageBps,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    collateral: new BN(collateral.toString()),
    receivedAt: Date.now(),
  });

  const match = matcher.addOrder({
    commitmentId: 1,
    commitmentPda: commitB,
    trader: traderB.publicKey,
    marketId: 0,
    side: decryptedB.side,
    orderType: decryptedB.orderType,
    price: decryptedB.price,
    quantity: decryptedB.quantity,
    remainingQty: new BN(decryptedB.quantity.toString()),
    maxSlippageBps: decryptedB.maxSlippageBps,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    collateral: new BN(collateral.toString()),
    receivedAt: Date.now(),
  });

  if (!match) {
    console.error('ERROR: No match found!');
    process.exit(1);
  }

  console.log('       MATCH FOUND!');
  console.log('       Exec price:', match.execPrice.toString());
  console.log('       Fill qty:', match.fillQty.toString());
  console.log('       Bid commitment:', match.bidOrder.commitmentId);
  console.log('       Ask commitment:', match.askOrder.commitmentId);
  console.log();

  // ===== Step 5: Reveal Match On-Chain =====
  console.log('[5/6] Calling reveal_match on-chain...');

  const [tradePda] = findTradePda(0);
  const revealData = encodeRevealMatch(
    0, 0, BigInt(decryptedA.price.toString()), BigInt(decryptedA.quantity.toString()), decryptedA.maxSlippageBps, 0,
    1, 0, BigInt(decryptedB.price.toString()), BigInt(decryptedB.quantity.toString()), decryptedB.maxSlippageBps, 0,
    BigInt(match.execPrice.toString()),
    BigInt(match.fillQty.toString()),
    0, // venue = drift
  );

  const revealTx = buildInstruction('reveal_match', revealData, [
    { pubkey: solver.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: commitA, isSigner: false, isWritable: true },
    { pubkey: commitB, isSigner: false, isWritable: true },
    { pubkey: tradePda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]);

  const revealSig = await sendAndConfirmTransaction(connection, revealTx, [solver]);
  console.log('       reveal_match tx:', revealSig);
  console.log('       DarkTradeRecord PDA:', tradePda.toBase58());
  console.log();

  // ===== Step 6: Settle Trade =====
  console.log('[6/6] Calling settle_trade on-chain...');

  const venueTxSig = `drift_devnet_${Date.now()}`;
  const settleData = encodeSettleTrade(venueTxSig);

  const settleTx = buildInstruction('settle_trade', settleData, [
    { pubkey: solver.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: false },
    { pubkey: tradePda, isSigner: false, isWritable: true },
    { pubkey: commitA, isSigner: false, isWritable: true },
    { pubkey: commitB, isSigner: false, isWritable: true },
    { pubkey: vaultA, isSigner: false, isWritable: true },
    { pubkey: vaultB, isSigner: false, isWritable: true },
    { pubkey: traderAUsdc, isSigner: false, isWritable: true },
    { pubkey: traderBUsdc, isSigner: false, isWritable: true },
    { pubkey: feeUsdc, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ]);

  const settleSig = await sendAndConfirmTransaction(connection, settleTx, [solver]);
  console.log('       settle_trade tx:', settleSig);
  console.log('       Venue tx sig recorded:', venueTxSig);
  console.log();

  // ===== Summary =====
  console.log('='.repeat(60));
  console.log('  DEMO COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('  Program ID:', PROGRAM_ID.toBase58());
  console.log('  Config:', configPda.toBase58());
  console.log('  Bid Commitment:', commitA.toBase58());
  console.log('  Ask Commitment:', commitB.toBase58());
  console.log('  DarkTradeRecord:', tradePda.toBase58());
  console.log();
  console.log('  Explorer links:');
  console.log(`  Config: https://explorer.solana.com/address/${configPda.toBase58()}?cluster=devnet`);
  console.log(`  Trade:  https://explorer.solana.com/address/${tradePda.toBase58()}?cluster=devnet`);
  console.log(`  Init:   https://explorer.solana.com/tx/${initSig}?cluster=devnet`);
  console.log(`  Reveal: https://explorer.solana.com/tx/${revealSig}?cluster=devnet`);
  console.log(`  Settle: https://explorer.solana.com/tx/${settleSig}?cluster=devnet`);
  console.log();
}

main().catch(err => {
  console.error('Demo failed:', err);
  process.exit(1);
});

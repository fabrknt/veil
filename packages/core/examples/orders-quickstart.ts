// Seal a swap order's limits so only the solver can read them (MEV protection).
// No Solana, no network. Run: npx tsx examples/orders-quickstart.ts
import BN from 'bn.js';
import { generateEncryptionKeypair } from '@fabrknt/veil-core/box';
import { encryptOrderPayload, decryptOrderPayload } from '@fabrknt/veil-core/orders';

const user = generateEncryptionKeypair();
const solver = generateEncryptionKeypair();

const order = { minOutputAmount: new BN('995000000'), slippageBps: 50, deadline: 1767225600 };
const sealed = encryptOrderPayload(order, solver.publicKey, user);
console.log(`order sealed: ${sealed.bytes.length} bytes, min output not visible on the wire`);

const read = decryptOrderPayload(sealed.bytes, user.publicKey, solver);
console.log(`solver reads: min output ${read.minOutputAmount.toString()}, slippage ${read.slippageBps} bp, deadline ${read.deadline}`);

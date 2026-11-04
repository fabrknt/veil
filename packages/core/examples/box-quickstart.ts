// Encrypt a message for one recipient with NaCl box. No Solana, no network.
// Run: npx tsx examples/box-quickstart.ts
import { generateEncryptionKeypair, encrypt, decrypt } from '@fabrknt/veil-core/box';

const alice = generateEncryptionKeypair();
const bob = generateEncryptionKeypair();

const message = new TextEncoder().encode('KYC record #4821: verified');
const sealed = encrypt(message, bob.publicKey, alice);
console.log(`sealed ${message.length} bytes into ${sealed.bytes.length} (24 nonce + ${sealed.ciphertext.length} ciphertext)`);

const opened = decrypt(sealed.bytes, alice.publicKey, bob);
console.log(`bob opens it: "${new TextDecoder().decode(opened)}"`);

const eve = generateEncryptionKeypair();
try {
  decrypt(sealed.bytes, alice.publicKey, eve);
} catch {
  console.log('eve opens it: rejected');
}

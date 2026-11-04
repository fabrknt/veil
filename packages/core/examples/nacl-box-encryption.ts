/**
 * @fabrknt/veil-core/box — NaCl Box Encryption Example
 *
 * Demonstrates authenticated public-key encryption using
 * Curve25519-XSalsa20-Poly1305 (NaCl box).
 *
 * Use case: Encrypting KYC data, confidential metadata, or private
 * messages between two parties on any blockchain.
 */
import {
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt,
  decrypt,
} from '@fabrknt/veil-core/box';

// ---------------------------------------------------------------------------
// 1. Generate fresh keypairs for two parties
// ---------------------------------------------------------------------------

const alice = generateEncryptionKeypair();
const bob = generateEncryptionKeypair();

console.log('Alice public key:', Buffer.from(alice.publicKey).toString('hex'));
console.log('Bob   public key:', Buffer.from(bob.publicKey).toString('hex'));

// ---------------------------------------------------------------------------
// 2. Alice encrypts a message for Bob
// ---------------------------------------------------------------------------

const plaintext = new TextEncoder().encode('Hello Bob, this is confidential.');
const encrypted = encrypt(plaintext, bob.publicKey, alice);

console.log('\nEncrypted nonce :', Buffer.from(encrypted.nonce).toString('base64'));
console.log('Encrypted cipher:', Buffer.from(encrypted.ciphertext).toString('base64'));

// ---------------------------------------------------------------------------
// 3. Bob decrypts the message from Alice
// ---------------------------------------------------------------------------

// decrypt() expects the nonce prepended to the ciphertext
const combined = new Uint8Array(encrypted.nonce.length + encrypted.ciphertext.length);
combined.set(encrypted.nonce, 0);
combined.set(encrypted.ciphertext, encrypted.nonce.length);

const decrypted = decrypt(combined, alice.publicKey, bob);
console.log('\nDecrypted:', new TextDecoder().decode(decrypted));

// ---------------------------------------------------------------------------
// 4. Derive a keypair from an existing 32-byte seed (deterministic)
// ---------------------------------------------------------------------------

const seed = new Uint8Array(32);
seed.fill(0xab); // example seed — use a real secret in production
const derived = deriveEncryptionKeypair(seed);
console.log('\nDerived public key:', Buffer.from(derived.publicKey).toString('hex'));

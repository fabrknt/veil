/**
 * @fabrknt/veil-core/box — Class-based NaCl Box Wrapper Example
 *
 * Shows how to build a convenience class around @fabrknt/veil-core/box primitives,
 * with string encrypt/decrypt helpers and base64 serialization.
 *
 * Extracted from real-world usage in RWA tokenization platforms.
 */
import {
  EncryptionKeypair,
  generateEncryptionKeypair,
  deriveEncryptionKeypair,
  encrypt as veilEncrypt,
  decrypt as veilDecrypt,
} from '@fabrknt/veil-core/box';

// ---------------------------------------------------------------------------
// Wrapper class
// ---------------------------------------------------------------------------

class NaclBox {
  private keypair: EncryptionKeypair;

  constructor(secretKey?: Uint8Array) {
    this.keypair = secretKey
      ? deriveEncryptionKeypair(secretKey)
      : generateEncryptionKeypair();
  }

  getPublicKey(): Uint8Array {
    return this.keypair.publicKey;
  }

  /** Encrypt raw bytes for a recipient. */
  encrypt(
    plaintext: Uint8Array,
    recipientPublicKey: Uint8Array,
  ): { ciphertext: Uint8Array; nonce: Uint8Array; senderPublicKey: Uint8Array } {
    const result = veilEncrypt(plaintext, recipientPublicKey, this.keypair);
    return {
      ciphertext: result.ciphertext,
      nonce: result.nonce,
      senderPublicKey: this.keypair.publicKey,
    };
  }

  /** Encrypt a UTF-8 string. */
  encryptString(message: string, recipientPublicKey: Uint8Array) {
    return this.encrypt(new TextEncoder().encode(message), recipientPublicKey);
  }

  /** Decrypt raw bytes from a sender. */
  decrypt(encrypted: {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    senderPublicKey: Uint8Array;
  }): Uint8Array {
    const combined = new Uint8Array(encrypted.nonce.length + encrypted.ciphertext.length);
    combined.set(encrypted.nonce, 0);
    combined.set(encrypted.ciphertext, encrypted.nonce.length);
    return veilDecrypt(combined, encrypted.senderPublicKey, this.keypair);
  }

  /** Decrypt and return a UTF-8 string. */
  decryptString(encrypted: {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    senderPublicKey: Uint8Array;
  }): string {
    return new TextDecoder().decode(this.decrypt(encrypted));
  }
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

const alice = new NaclBox();
const bob = new NaclBox();

// Alice encrypts a KYC document for Bob
const encrypted = alice.encryptString(
  JSON.stringify({ name: 'Taro Yamada', kycLevel: 2, jurisdiction: 'JP' }),
  bob.getPublicKey(),
);

// Bob decrypts it
const json = bob.decryptString(encrypted);
console.log('Decrypted KYC:', JSON.parse(json));

// Base64 serialization for transport
console.log('\nBase64 nonce:', Buffer.from(encrypted.nonce).toString('base64'));
console.log('Base64 cipher:', Buffer.from(encrypted.ciphertext).toString('base64'));

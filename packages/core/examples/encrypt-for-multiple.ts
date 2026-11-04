/**
 * @fabrknt/veil-core/box — Multi-recipient Encryption Example
 *
 * Demonstrates encrypting a single payload for multiple recipients
 * (e.g. a compliance officer and a counterparty both need to read
 * the same KYC data).
 */
import {
  generateEncryptionKeypair,
  encryptForMultiple,
  decrypt,
} from '@fabrknt/veil-core/box';

// Three parties
const issuer = generateEncryptionKeypair();
const investor = generateEncryptionKeypair();
const complianceOfficer = generateEncryptionKeypair();

// Issuer encrypts confidential terms for both investor and compliance
const terms = new TextEncoder().encode(
  JSON.stringify({
    securityId: 'SEC-2024-001',
    terms: 'Restricted — accredited investors only',
    jurisdiction: 'JP',
  }),
);

const recipients = [investor.publicKey, complianceOfficer.publicKey];
const results = encryptForMultiple(terms, recipients, issuer);

console.log(`Encrypted for ${results.size} recipients\n`);

// Each recipient finds their copy by their own public key (hex) and decrypts it
for (const [label, keypair] of [
  ['Investor', investor],
  ['Compliance Officer', complianceOfficer],
] as const) {
  const copy = results.get(Buffer.from(keypair.publicKey).toString('hex'))!;
  const plaintext = decrypt(copy.bytes, issuer.publicKey, keypair);
  console.log(`${label} decrypted:`, JSON.parse(new TextDecoder().decode(plaintext)));
}

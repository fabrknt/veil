/**
 * Shamir's Secret Sharing implementation
 * Used for M-of-N threshold decryption schemes
 */

import nacl from 'tweetnacl';

// Prime for finite field arithmetic (256-bit prime)
const PRIME = BigInt(
  '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'
);

/**
 * Secret share containing index and value
 */
export interface SecretShare {
  index: number;
  value: Uint8Array;
}

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
  /** Minimum shares required to reconstruct */
  threshold: number;
  /** Total number of shares */
  totalShares: number;
}

/**
 * Generate random coefficients for polynomial
 */
function generateCoefficients(secret: bigint, degree: number): bigint[] {
  const coefficients = [secret];
  for (let i = 1; i <= degree; i++) {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const coef = bytesToBigInt(randomBytes) % PRIME;
    coefficients.push(coef);
  }
  return coefficients;
}

/**
 * Evaluate polynomial at point x
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint): bigint {
  let result = BigInt(0);
  let xPower = BigInt(1);

  for (const coef of coefficients) {
    result = (result + coef * xPower) % PRIME;
    xPower = (xPower * x) % PRIME;
  }

  return result;
}

/**
 * Modular inverse using extended Euclidean algorithm
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [BigInt(1), BigInt(0)];

  while (r !== BigInt(0)) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  return ((old_s % m) + m) % m;
}

/**
 * Lagrange interpolation to reconstruct secret
 */
function lagrangeInterpolate(shares: { x: bigint; y: bigint }[]): bigint {
  let secret = BigInt(0);

  for (let i = 0; i < shares.length; i++) {
    let numerator = BigInt(1);
    let denominator = BigInt(1);

    for (let j = 0; j < shares.length; j++) {
      if (i !== j) {
        numerator = (numerator * (PRIME - shares[j].x)) % PRIME;
        denominator =
          (denominator * ((shares[i].x - shares[j].x + PRIME) % PRIME)) % PRIME;
      }
    }

    const lagrangeCoef =
      (numerator * modInverse(denominator, PRIME)) % PRIME;
    secret = (secret + shares[i].y * lagrangeCoef) % PRIME;
  }

  return secret;
}

/**
 * Convert bytes to BigInt
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (const byte of bytes) {
    result = (result << BigInt(8)) + BigInt(byte);
  }
  return result;
}

/**
 * Convert BigInt to bytes (32 bytes)
 */
function bigIntToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let temp = value;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(temp & BigInt(0xff));
    temp = temp >> BigInt(8);
  }
  return bytes;
}

/**
 * Split a secret into M-of-N shares using Shamir's Secret Sharing
 *
 * @param secret - The secret to split (32 bytes)
 * @param threshold - Minimum shares required to reconstruct (M)
 * @param totalShares - Total number of shares to generate (N)
 * @returns Array of secret shares
 */
export function splitSecret(
  secret: Uint8Array,
  threshold: number,
  totalShares: number
): SecretShare[] {
  if (secret.length !== 32) {
    throw new Error('Secret must be 32 bytes');
  }
  if (!Number.isSafeInteger(threshold) || !Number.isSafeInteger(totalShares)) {
    // A fractional threshold would silently build a lower-degree polynomial.
    throw new Error('Threshold and total shares must be integers');
  }
  if (threshold < 2) {
    throw new Error('Threshold must be at least 2');
  }
  if (totalShares < threshold) {
    throw new Error('Total shares must be >= threshold');
  }
  if (totalShares > 255) {
    throw new Error('Maximum 255 shares supported');
  }

  const secretBigInt = bytesToBigInt(secret);
  if (secretBigInt >= PRIME) {
    // Shares live in the field mod PRIME; a larger value would come back reduced.
    throw new Error('Secret must be less than the field prime');
  }
  const coefficients = generateCoefficients(secretBigInt, threshold - 1);

  const shares: SecretShare[] = [];
  for (let i = 1; i <= totalShares; i++) {
    const x = BigInt(i);
    const y = evaluatePolynomial(coefficients, x);
    shares.push({
      index: i,
      value: bigIntToBytes(y),
    });
  }

  return shares;
}

/**
 * Reject shares that cannot come from splitSecret: indices must be unique integers in 1..255
 * (a repeated index makes the Lagrange denominator zero) and values must be 32 bytes below the
 * field prime.
 */
function validateShares(shares: SecretShare[]): void {
  const seen = new Set<number>();
  for (const share of shares) {
    if (!Number.isInteger(share.index) || share.index < 1 || share.index > 255) {
      throw new Error('Share index must be an integer from 1 to 255');
    }
    if (seen.has(share.index)) {
      throw new Error('Duplicate share index');
    }
    seen.add(share.index);
    if (!(share.value instanceof Uint8Array) || share.value.length !== 32) {
      throw new Error('Share value must be 32 bytes');
    }
    if (bytesToBigInt(share.value) >= PRIME) {
      throw new Error('Share value must be less than the field prime');
    }
  }
}

/**
 * Combine shares to reconstruct the secret
 *
 * @param shares - Array of secret shares (at least threshold shares required)
 * @returns Reconstructed secret (32 bytes)
 */
export function combineShares(shares: SecretShare[]): Uint8Array {
  if (shares.length < 2) {
    throw new Error('At least 2 shares required');
  }
  validateShares(shares);

  const points = shares.map((share) => ({
    x: BigInt(share.index),
    y: bytesToBigInt(share.value),
  }));

  const secretBigInt = lagrangeInterpolate(points);
  return bigIntToBytes(secretBigInt);
}

/**
 * Verify that shares are consistent with one another.
 *
 * Every supplied share is checked: the secret rebuilt from the first threshold shares must
 * match the one rebuilt with each other share swapped in. With exactly threshold shares there
 * is nothing to compare against, so this only checks their format; authenticating such a set
 * needs a commitment from the dealer, which plain Shamir does not provide.
 */
export function verifyShares(
  shares: SecretShare[],
  expectedThreshold: number
): boolean {
  if (shares.length < expectedThreshold) {
    return false;
  }

  try {
    validateShares(shares);
    const base = shares.slice(0, expectedThreshold);
    const reference = combineShares(base);
    const same = (a: Uint8Array) => a.every((byte, i) => byte === reference[i]);

    if (shares.length > expectedThreshold) {
      // Swap each extra share in for the last base share, then rebuild without the first one,
      // so a bad share anywhere in the set changes some result.
      const keep = base.slice(0, expectedThreshold - 1);
      for (const extra of shares.slice(expectedThreshold)) {
        if (!same(combineShares([...keep, extra]))) return false;
      }
      if (!same(combineShares(shares.slice(1, expectedThreshold + 1)))) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Create a threshold encryption scheme
 * Encrypts the data with a random key (NaCl secretbox: XSalsa20-Poly1305), then splits the
 * key using Shamir's. encryptedSecret is a 24-byte nonce followed by the secretbox output
 * (16-byte tag + ciphertext), so it is 40 bytes longer than the data.
 */
export function createThresholdEncryption(
  secret: Uint8Array,
  threshold: number,
  totalShares: number
): {
  encryptedSecret: Uint8Array;
  keyShares: SecretShare[];
} {
  // Generate a random key below the field prime so Shamir reconstructs it exactly
  let encryptionKey: Uint8Array;
  do {
    encryptionKey = nacl.randomBytes(nacl.secretbox.keyLength);
  } while (bytesToBigInt(encryptionKey) >= PRIME);

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const boxed = nacl.secretbox(secret, nonce, encryptionKey);

  const encryptedSecret = new Uint8Array(nonce.length + boxed.length);
  encryptedSecret.set(nonce, 0);
  encryptedSecret.set(boxed, nonce.length);

  // Split the key into shares
  const keyShares = splitSecret(encryptionKey, threshold, totalShares);

  return { encryptedSecret, keyShares };
}

/**
 * Decrypt using threshold shares
 * Throws if the shares do not rebuild the key (e.g. fewer than the threshold) or the
 * ciphertext was modified.
 */
export function decryptWithThreshold(
  encryptedSecret: Uint8Array,
  keyShares: SecretShare[]
): Uint8Array {
  const nonceLength = nacl.secretbox.nonceLength;
  if (encryptedSecret.length < nonceLength + nacl.secretbox.overheadLength) {
    throw new Error('Encrypted data too short');
  }

  // Reconstruct the key
  const encryptionKey = combineShares(keyShares);

  const nonce = encryptedSecret.slice(0, nonceLength);
  const boxed = encryptedSecret.slice(nonceLength);
  const secret = nacl.secretbox.open(boxed, nonce, encryptionKey);
  if (!secret) {
    throw new Error('Decryption failed: not enough valid shares, or the data was modified');
  }

  return secret;
}

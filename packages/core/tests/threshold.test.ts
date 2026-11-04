import {
  splitSecret,
  combineShares,
  verifyShares,
  createThresholdEncryption,
  decryptWithThreshold,
  SecretShare,
} from '../src/threshold';

describe('threshold (Shamir Secret Sharing)', () => {
  const secret32 = new Uint8Array(32);
  secret32.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  // ── splitSecret ─────────────────────────────────────────────────────

  describe('splitSecret', () => {
    it('returns the correct number of shares', () => {
      const shares = splitSecret(secret32, 3, 5);
      expect(shares.length).toBe(5);
    });

    it('each share has a 32-byte value and sequential index', () => {
      const shares = splitSecret(secret32, 2, 4);
      shares.forEach((share, i) => {
        expect(share.value).toBeInstanceOf(Uint8Array);
        expect(share.value.length).toBe(32);
        expect(share.index).toBe(i + 1);
      });
    });

    it('throws for secret not 32 bytes', () => {
      expect(() => splitSecret(new Uint8Array(16), 2, 3)).toThrow('Secret must be 32 bytes');
    });

    it('throws for a secret at or above the field prime', () => {
      expect(() => splitSecret(new Uint8Array(32).fill(0xff), 2, 3)).toThrow(
        'Secret must be less than the field prime'
      );
    });

    it('throws for threshold < 2', () => {
      expect(() => splitSecret(secret32, 1, 3)).toThrow('Threshold must be at least 2');
    });

    it('throws for totalShares < threshold', () => {
      expect(() => splitSecret(secret32, 4, 3)).toThrow('Total shares must be >= threshold');
    });

    it('throws for totalShares > 255', () => {
      expect(() => splitSecret(secret32, 2, 256)).toThrow('Maximum 255 shares supported');
    });
  });

  // ── combineShares ───────────────────────────────────────────────────

  describe('combineShares', () => {
    it('reconstructs the original secret with exactly threshold shares', () => {
      const shares = splitSecret(secret32, 3, 5);
      const thresholdShares = shares.slice(0, 3);
      const recovered = combineShares(thresholdShares);
      expect(Buffer.from(recovered)).toEqual(Buffer.from(secret32));
    });

    it('reconstructs the original secret with all shares', () => {
      const shares = splitSecret(secret32, 3, 5);
      const recovered = combineShares(shares);
      expect(Buffer.from(recovered)).toEqual(Buffer.from(secret32));
    });

    it('reconstructs correctly with non-consecutive shares', () => {
      const shares = splitSecret(secret32, 3, 5);
      const subset = [shares[0], shares[2], shares[4]]; // indices 1, 3, 5
      const recovered = combineShares(subset);
      expect(Buffer.from(recovered)).toEqual(Buffer.from(secret32));
    });

    it('throws "At least 2 shares required" for fewer than 2 shares', () => {
      const shares = splitSecret(secret32, 2, 3);
      expect(() => combineShares([shares[0]])).toThrow('At least 2 shares required');
      expect(() => combineShares([])).toThrow('At least 2 shares required');
    });
  });

  // ── verifyShares ────────────────────────────────────────────────────

  describe('verifyShares', () => {
    it('returns true for valid shares with more than threshold provided', () => {
      const shares = splitSecret(secret32, 3, 5);
      expect(verifyShares(shares, 3)).toBe(true);
    });

    it('returns true when exactly threshold shares are provided', () => {
      const shares = splitSecret(secret32, 2, 4);
      expect(verifyShares(shares.slice(0, 2), 2)).toBe(true);
    });

    it('returns false when fewer shares than threshold are provided', () => {
      const shares = splitSecret(secret32, 3, 5);
      expect(verifyShares(shares.slice(0, 2), 3)).toBe(false);
    });

    it('returns false for tampered shares', () => {
      const shares = splitSecret(secret32, 3, 5);
      const tampered: SecretShare[] = shares.map((s) => ({ ...s, value: new Uint8Array(s.value) }));
      // Flip bits in one share's value
      tampered[0].value[0] ^= 0xff;
      expect(verifyShares(tampered, 3)).toBe(false);
    });
  });

  // ── createThresholdEncryption / decryptWithThreshold ────────────────

  describe('createThresholdEncryption / decryptWithThreshold', () => {
    it('roundtrip: encrypts then decrypts back to original secret', () => {
      const secret = new Uint8Array(32);
      crypto.getRandomValues(secret);

      const { encryptedSecret, keyShares } = createThresholdEncryption(secret, 3, 5);
      expect(encryptedSecret).toBeInstanceOf(Uint8Array);
      // 24-byte nonce + 16-byte Poly1305 tag + ciphertext
      expect(encryptedSecret.length).toBe(24 + 16 + 32);
      expect(keyShares.length).toBe(5);

      const decrypted = decryptWithThreshold(encryptedSecret, keyShares.slice(0, 3));
      expect(Buffer.from(decrypted)).toEqual(Buffer.from(secret));
    });

    it('works with exactly threshold shares', () => {
      const secret = new Uint8Array(32).fill(0xab);
      const { encryptedSecret, keyShares } = createThresholdEncryption(secret, 2, 4);
      const decrypted = decryptWithThreshold(encryptedSecret, keyShares.slice(0, 2));
      expect(Buffer.from(decrypted)).toEqual(Buffer.from(secret));
    });

    it('does not repeat the key stream (equal plaintext blocks give different ciphertext)', () => {
      // With a repeating 32-byte XOR key, two equal 32-byte plaintext blocks encrypt to
      // two equal ciphertext blocks, so an observer learns the plaintext's structure.
      const secret = new Uint8Array(64).fill(0x42);
      const { encryptedSecret } = createThresholdEncryption(secret, 2, 3);
      for (let o = 0; o + 64 <= encryptedSecret.length; o++) {
        const first = Buffer.from(encryptedSecret.slice(o, o + 32));
        const second = Buffer.from(encryptedSecret.slice(o + 32, o + 64));
        expect(first.equals(second)).toBe(false);
      }
    });

    it('rejects a tampered ciphertext', () => {
      const secret = new TextEncoder().encode('pay 100 to alice');
      const { encryptedSecret, keyShares } = createThresholdEncryption(secret, 2, 3);
      const tampered = new Uint8Array(encryptedSecret);
      tampered[tampered.length - 1] ^= 0x01;
      expect(() => decryptWithThreshold(tampered, keyShares.slice(0, 2))).toThrow();
    });

    it('fails with fewer shares than the threshold', () => {
      const secret = new TextEncoder().encode('needs three of five');
      const { encryptedSecret, keyShares } = createThresholdEncryption(secret, 3, 5);
      expect(() => decryptWithThreshold(encryptedSecret, keyShares.slice(0, 2))).toThrow();
    });

    it('round-trips a large payload', () => {
      const secret = new Uint8Array(100_000);
      for (let i = 0; i < secret.length; i += 65536) {
        crypto.getRandomValues(secret.subarray(i, Math.min(i + 65536, secret.length)));
      }
      const { encryptedSecret, keyShares } = createThresholdEncryption(secret, 3, 5);
      const decrypted = decryptWithThreshold(encryptedSecret, keyShares.slice(2, 5));
      expect(Buffer.from(decrypted)).toEqual(Buffer.from(secret));
    });

    it('rejects a ciphertext too short to hold a nonce and tag', () => {
      const { keyShares } = createThresholdEncryption(new Uint8Array(8), 2, 3);
      expect(() => decryptWithThreshold(new Uint8Array(39), keyShares.slice(0, 2))).toThrow();
    });
  });
});

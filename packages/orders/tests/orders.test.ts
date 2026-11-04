import BN from 'bn.js';
import {
  serializeOrderPayload,
  deserializeOrderPayload,
  encryptOrderPayload,
  decryptOrderPayload,
  createEncryptedOrder,
  validateEncryptedPayload,
  generateEncryptionKeypair,
  computePayloadHash,
  createCommittedEncryptedOrder,
  createThresholdEncryptedOrder,
  decryptSolverShare,
  reconstructThresholdOrder,
} from '../src/index';

describe('orders', () => {
  // ── serializeOrderPayload / deserializeOrderPayload ─────────────────

  describe('serializeOrderPayload / deserializeOrderPayload', () => {
    it('roundtrip preserves all fields', () => {
      const payload = {
        minOutputAmount: new BN('1000000000'),
        slippageBps: 50,
        deadline: 1700000000,
      };
      const serialized = serializeOrderPayload(payload);
      const deserialized = deserializeOrderPayload(serialized);
      expect(deserialized.minOutputAmount.toString()).toBe('1000000000');
      expect(deserialized.slippageBps).toBe(50);
      expect(deserialized.deadline).toBe(1700000000);
    });

    it('serialized output is 24 bytes', () => {
      const payload = {
        minOutputAmount: new BN('500'),
        slippageBps: 100,
        deadline: 0,
      };
      const serialized = serializeOrderPayload(payload);
      expect(serialized.length).toBe(24);
    });
  });

  // ── encryptOrderPayload / decryptOrderPayload ───────────────────────

  describe('encryptOrderPayload / decryptOrderPayload', () => {
    const user = generateEncryptionKeypair();
    const solver = generateEncryptionKeypair();

    it('roundtrip preserves minOutputAmount, slippageBps, deadline', () => {
      const payload = {
        minOutputAmount: new BN('999999999'),
        slippageBps: 200,
        deadline: 1710000000,
      };
      const encrypted = encryptOrderPayload(payload, solver.publicKey, user);
      const decrypted = decryptOrderPayload(encrypted.bytes, user.publicKey, solver);
      expect(decrypted.minOutputAmount.toString()).toBe('999999999');
      expect(decrypted.slippageBps).toBe(200);
      expect(decrypted.deadline).toBe(1710000000);
    });

    it('encrypted payload has nonce (24 bytes), ciphertext, and combined bytes', () => {
      const payload = {
        minOutputAmount: new BN('100'),
        slippageBps: 10,
        deadline: 0,
      };
      const encrypted = encryptOrderPayload(payload, solver.publicKey, user);
      expect(encrypted.nonce.length).toBe(24);
      expect(encrypted.ciphertext.length).toBeGreaterThan(0);
      expect(encrypted.bytes.length).toBe(encrypted.nonce.length + encrypted.ciphertext.length);
    });
  });

  // ── createEncryptedOrder ────────────────────────────────────────────

  describe('createEncryptedOrder', () => {
    it('returns a Uint8Array', () => {
      const user = generateEncryptionKeypair();
      const solver = generateEncryptionKeypair();
      const result = createEncryptedOrder(
        '1000000',
        50,
        1700000000,
        solver.publicKey,
        user,
      );
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it('output length is in valid range (64–128 bytes)', () => {
      const user = generateEncryptionKeypair();
      const solver = generateEncryptionKeypair();
      const result = createEncryptedOrder(
        new BN('5000000'),
        100,
        1700000000,
        solver.publicKey,
        user,
      );
      // 24 (nonce) + 16 (overhead) + 24 (payload) = 64
      expect(result.length).toBe(64);
    });
  });

  // ── validateEncryptedPayload ────────────────────────────────────────

  describe('validateEncryptedPayload', () => {
    it('returns true for a valid encrypted order', () => {
      const user = generateEncryptionKeypair();
      const solver = generateEncryptionKeypair();
      const encrypted = createEncryptedOrder(
        '1000000',
        50,
        1700000000,
        solver.publicKey,
        user,
      );
      expect(validateEncryptedPayload(encrypted)).toBe(true);
    });

    it('returns false for too-short bytes', () => {
      expect(validateEncryptedPayload(new Uint8Array(63))).toBe(false);
    });

    it('returns false for too-long bytes', () => {
      expect(validateEncryptedPayload(new Uint8Array(129))).toBe(false);
    });
  });

  // ── computePayloadHash ──────────────────────────────────────────────

  describe('computePayloadHash', () => {
    it('produces deterministic 32-byte hash', () => {
      const payload = {
        minOutputAmount: new BN('1000000'),
        slippageBps: 50,
        deadline: 1700000000,
      };
      const hash1 = computePayloadHash(payload);
      const hash2 = computePayloadHash(payload);
      expect(hash1.length).toBe(32);
      expect(Buffer.from(hash1).toString('hex')).toBe(Buffer.from(hash2).toString('hex'));
    });

    it('different payloads produce different hashes', () => {
      const hash1 = computePayloadHash({
        minOutputAmount: new BN('1000000'),
        slippageBps: 50,
        deadline: 1700000000,
      });
      const hash2 = computePayloadHash({
        minOutputAmount: new BN('2000000'),
        slippageBps: 50,
        deadline: 1700000000,
      });
      expect(Buffer.from(hash1).toString('hex')).not.toBe(Buffer.from(hash2).toString('hex'));
    });
  });

  // ── createCommittedEncryptedOrder ───────────────────────────────────

  describe('createCommittedEncryptedOrder', () => {
    it('returns encryptedBytes, payloadHash, and userPublicKey', () => {
      const user = generateEncryptionKeypair();
      const solver = generateEncryptionKeypair();
      const result = createCommittedEncryptedOrder(
        '1000000',
        50,
        1700000000,
        solver.publicKey,
        user,
      );
      expect(result.encryptedBytes).toBeInstanceOf(Uint8Array);
      expect(result.encryptedBytes.length).toBeGreaterThan(0);
      expect(result.payloadHash).toBeInstanceOf(Uint8Array);
      expect(result.payloadHash.length).toBe(32);
      expect(result.userPublicKey).toBeInstanceOf(Uint8Array);
      expect(result.userPublicKey.length).toBe(32);
    });

    it('commitment hash round-trip: encrypt → decrypt → reserialize → hash matches', () => {
      const user = generateEncryptionKeypair();
      const solver = generateEncryptionKeypair();
      const committed = createCommittedEncryptedOrder(
        '999999999',
        200,
        1710000000,
        solver.publicKey,
        user,
      );

      // Decrypt
      const decrypted = decryptOrderPayload(committed.encryptedBytes, user.publicKey, solver);

      // Recompute hash from decrypted payload
      const recomputedHash = computePayloadHash(decrypted);

      expect(Buffer.from(recomputedHash).toString('hex')).toBe(
        Buffer.from(committed.payloadHash).toString('hex')
      );
    });
  });

  // ── Threshold Encrypted Orders (M-of-N) ────────────────────────────

  describe('threshold encrypted orders', () => {
    it('2-of-3 threshold: encrypt → decrypt shares → reconstruct matches original', () => {
      const user = generateEncryptionKeypair();
      const solver1 = generateEncryptionKeypair();
      const solver2 = generateEncryptionKeypair();
      const solver3 = generateEncryptionKeypair();

      const payload = {
        minOutputAmount: new BN('5000000'),
        slippageBps: 100,
        deadline: 1700000000,
      };

      const thresholdOrder = createThresholdEncryptedOrder(
        payload,
        2,
        [solver1.publicKey, solver2.publicKey, solver3.publicKey],
        user,
      );

      expect(thresholdOrder.threshold).toBe(2);
      expect(thresholdOrder.totalSolvers).toBe(3);
      expect(thresholdOrder.solverShares.length).toBe(3);
      expect(thresholdOrder.payloadHash.length).toBe(32);

      // Each solver decrypts their share
      const share1 = decryptSolverShare(
        thresholdOrder.solverShares[0].encryptedShare,
        user.publicKey,
        solver1,
      );
      const share2 = decryptSolverShare(
        thresholdOrder.solverShares[1].encryptedShare,
        user.publicKey,
        solver2,
      );

      // Reconstruct with 2-of-3 shares
      const reconstructed = reconstructThresholdOrder(
        thresholdOrder.encryptedPayload,
        [share1, share2],
      );

      expect(reconstructed.minOutputAmount.toString()).toBe('5000000');
      expect(reconstructed.slippageBps).toBe(100);
      expect(reconstructed.deadline).toBe(1700000000);

      // With the order's threshold and commitment, the matching bundle still decrypts...
      expect(
        reconstructThresholdOrder(
          thresholdOrder.encryptedPayload,
          [share1, share2],
          thresholdOrder.threshold,
          thresholdOrder.payloadHash,
        ).slippageBps,
      ).toBe(100);
      // ...a substituted commitment is caught, and too few shares are refused.
      const wrongHash = new Uint8Array(thresholdOrder.payloadHash);
      wrongHash[0] ^= 0xff;
      expect(() =>
        reconstructThresholdOrder(thresholdOrder.encryptedPayload, [share1, share2], 2, wrongHash),
      ).toThrow('payloadHash');
      expect(() =>
        reconstructThresholdOrder(thresholdOrder.encryptedPayload, [share1, share2], 3),
      ).toThrow('Need at least 3 shares');
    });

    it('threshold must be at least 2', () => {
      const user = generateEncryptionKeypair();
      const solver1 = generateEncryptionKeypair();
      const payload = {
        minOutputAmount: new BN('1000'),
        slippageBps: 10,
        deadline: 0,
      };
      expect(() =>
        createThresholdEncryptedOrder(payload, 1, [solver1.publicKey], user)
      ).toThrow('Threshold must be at least 2');
    });

    it('needs at least threshold number of solver keys', () => {
      const user = generateEncryptionKeypair();
      const solver1 = generateEncryptionKeypair();
      const payload = {
        minOutputAmount: new BN('1000'),
        slippageBps: 10,
        deadline: 0,
      };
      expect(() =>
        createThresholdEncryptedOrder(payload, 3, [solver1.publicKey], user)
      ).toThrow('Need at least 3 solver keys');
    });
  });
});

const { expect } = require('chai');
const BN = require('bn.js');
const {
  generateEncryptionKeypair,
  serializePerpOrderPayload,
  deserializePerpOrderPayload,
  encryptPerpOrderPayload,
  decryptPerpOrderPayload,
  computePerpPayloadHash,
  createCommittedEncryptedPerpOrder,
  // Spot order functions (existing)
  encryptOrderPayload,
  decryptOrderPayload,
  serializeOrderPayload,
  computePayloadHash,
  createCommittedEncryptedOrder,
} = require('@fabrknt/veil-orders');
const { PERP_ORDER_SCHEMA, SWAP_ORDER_SCHEMA, calculateSchemaSize } = require('@fabrknt/veil-core');
const { createHash } = require('crypto');

type PerpOrderPayload = {
  side: 'long' | 'short';
  orderType: 'limit' | 'market';
  price: any;
  quantity: any;
  maxSlippageBps: number;
  marketId: number;
};

describe('Perp Order Encryption', () => {
  const userKeypair = generateEncryptionKeypair();
  const solverKeypair = generateEncryptionKeypair();

  const sampleOrder: PerpOrderPayload = {
    side: 'short',
    orderType: 'limit',
    price: new BN(150_000_000), // $150
    quantity: new BN(5_000_000), // 5.0
    maxSlippageBps: 30,
    marketId: 0, // SOL
  };

  // ============================================================
  // Schema
  // ============================================================

  describe('schema', () => {
    it('should have correct schema size (26 bytes)', () => {
      expect(calculateSchemaSize(PERP_ORDER_SCHEMA)).to.equal(26);
    });

    it('perp schema should be different from swap schema', () => {
      expect(calculateSchemaSize(PERP_ORDER_SCHEMA)).to.not.equal(calculateSchemaSize(SWAP_ORDER_SCHEMA));
    });

    it('perp schema should have 7 fields', () => {
      expect(PERP_ORDER_SCHEMA.fields).to.have.length(7);
    });
  });

  // ============================================================
  // Serialization
  // ============================================================

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const bytes = serializePerpOrderPayload(sampleOrder);
      expect(bytes.length).to.equal(26);

      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.side).to.equal('short');
      expect(decoded.orderType).to.equal('limit');
      expect(decoded.price.toString()).to.equal('150000000');
      expect(decoded.quantity.toString()).to.equal('5000000');
      expect(decoded.maxSlippageBps).to.equal(30);
      expect(decoded.marketId).to.equal(0);
    });

    it('should handle all market IDs', () => {
      for (const marketId of [0, 1, 2]) {
        const order = { ...sampleOrder, marketId };
        const bytes = serializePerpOrderPayload(order);
        const decoded = deserializePerpOrderPayload(bytes);
        expect(decoded.marketId).to.equal(marketId);
      }
    });

    it('should handle both sides', () => {
      for (const side of ['long', 'short'] as const) {
        const order = { ...sampleOrder, side };
        const bytes = serializePerpOrderPayload(order);
        const decoded = deserializePerpOrderPayload(bytes);
        expect(decoded.side).to.equal(side);
      }
    });

    it('should handle both order types', () => {
      for (const orderType of ['limit', 'market'] as const) {
        const order = { ...sampleOrder, orderType, price: orderType === 'market' ? new BN(0) : sampleOrder.price };
        const bytes = serializePerpOrderPayload(order);
        const decoded = deserializePerpOrderPayload(bytes);
        expect(decoded.orderType).to.equal(orderType);
      }
    });

    it('should handle market orders (price=0)', () => {
      const marketOrder: PerpOrderPayload = { ...sampleOrder, orderType: 'market', price: new BN(0) };
      const bytes = serializePerpOrderPayload(marketOrder);
      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.orderType).to.equal('market');
      expect(decoded.price.toString()).to.equal('0');
    });

    it('should handle zero quantity', () => {
      const order = { ...sampleOrder, quantity: new BN(0) };
      const bytes = serializePerpOrderPayload(order);
      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.quantity.toString()).to.equal('0');
    });

    it('should handle zero slippage', () => {
      const order = { ...sampleOrder, maxSlippageBps: 0 };
      const bytes = serializePerpOrderPayload(order);
      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.maxSlippageBps).to.equal(0);
    });

    it('should handle max slippage (65535 bps)', () => {
      const order = { ...sampleOrder, maxSlippageBps: 65535 };
      const bytes = serializePerpOrderPayload(order);
      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.maxSlippageBps).to.equal(65535);
    });

    it('should handle very large prices', () => {
      const order = { ...sampleOrder, price: new BN('999999999999999') };
      const bytes = serializePerpOrderPayload(order);
      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.price.toString()).to.equal('999999999999999');
    });

    it('should handle very large quantities', () => {
      const order = { ...sampleOrder, quantity: new BN('18446744073709551615') }; // u64 max
      const bytes = serializePerpOrderPayload(order);
      const decoded = deserializePerpOrderPayload(bytes);
      expect(decoded.quantity.toString()).to.equal('18446744073709551615');
    });

    it('should produce different bytes for different orders', () => {
      const order1 = { ...sampleOrder, side: 'long' as const };
      const order2 = { ...sampleOrder, side: 'short' as const };
      const bytes1 = serializePerpOrderPayload(order1);
      const bytes2 = serializePerpOrderPayload(order2);
      expect(Buffer.from(bytes1).toString('hex')).to.not.equal(Buffer.from(bytes2).toString('hex'));
    });
  });

  // ============================================================
  // Encryption / Decryption
  // ============================================================

  describe('encryption', () => {
    it('should encrypt and decrypt correctly', () => {
      const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);
      expect(encrypted.bytes.length).to.be.greaterThan(26);

      const decrypted = decryptPerpOrderPayload(encrypted.bytes, userKeypair.publicKey, solverKeypair);
      expect(decrypted.side).to.equal('short');
      expect(decrypted.orderType).to.equal('limit');
      expect(decrypted.price.toString()).to.equal('150000000');
      expect(decrypted.quantity.toString()).to.equal('5000000');
      expect(decrypted.maxSlippageBps).to.equal(30);
      expect(decrypted.marketId).to.equal(0);
    });

    it('should produce different ciphertexts for same order (random nonce)', () => {
      const enc1 = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);
      const enc2 = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);
      expect(Buffer.from(enc1.bytes).toString('hex')).to.not.equal(Buffer.from(enc2.bytes).toString('hex'));
    });

    it('should fail decryption with wrong solver keypair', () => {
      const wrongKeypair = generateEncryptionKeypair();
      const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);

      expect(() => {
        decryptPerpOrderPayload(encrypted.bytes, userKeypair.publicKey, wrongKeypair);
      }).to.throw('Decryption failed');
    });

    it('should fail decryption with wrong user pubkey', () => {
      const wrongUser = generateEncryptionKeypair();
      const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);

      expect(() => {
        decryptPerpOrderPayload(encrypted.bytes, wrongUser.publicKey, solverKeypair);
      }).to.throw('Decryption failed');
    });

    it('should fail decryption with tampered ciphertext', () => {
      const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);
      // Flip a byte in the middle
      const tampered = new Uint8Array(encrypted.bytes);
      tampered[30] ^= 0xff;

      expect(() => {
        decryptPerpOrderPayload(tampered, userKeypair.publicKey, solverKeypair);
      }).to.throw();
    });

    it('should encrypt long orders correctly', () => {
      const longOrder: PerpOrderPayload = { ...sampleOrder, side: 'long' };
      const encrypted = encryptPerpOrderPayload(longOrder, solverKeypair.publicKey, userKeypair);
      const decrypted = decryptPerpOrderPayload(encrypted.bytes, userKeypair.publicKey, solverKeypair);
      expect(decrypted.side).to.equal('long');
    });

    it('should encrypt all market types correctly', () => {
      for (const marketId of [0, 1, 2]) {
        const order = { ...sampleOrder, marketId };
        const encrypted = encryptPerpOrderPayload(order, solverKeypair.publicKey, userKeypair);
        const decrypted = decryptPerpOrderPayload(encrypted.bytes, userKeypair.publicKey, solverKeypair);
        expect(decrypted.marketId).to.equal(marketId);
      }
    });

    it('should work with different keypair pairs', () => {
      const user2 = generateEncryptionKeypair();
      const solver2 = generateEncryptionKeypair();

      const encrypted = encryptPerpOrderPayload(sampleOrder, solver2.publicKey, user2);
      const decrypted = decryptPerpOrderPayload(encrypted.bytes, user2.publicKey, solver2);
      expect(decrypted.price.toString()).to.equal('150000000');
    });

    it('encrypted output should contain nonce + ciphertext', () => {
      const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);
      // NaCl nonce is 24 bytes, ciphertext = 26 (payload) + 16 (auth tag) = 42
      expect(encrypted.nonce.length).to.equal(24);
      expect(encrypted.ciphertext.length).to.equal(42);
      expect(encrypted.bytes.length).to.equal(66); // 24 + 42
    });
  });

  // ============================================================
  // Commitment Hashing
  // ============================================================

  describe('commitment hashing', () => {
    it('should produce deterministic hashes', () => {
      const hash1 = computePerpPayloadHash(sampleOrder);
      const hash2 = computePerpPayloadHash(sampleOrder);
      expect(Buffer.from(hash1).toString('hex')).to.equal(Buffer.from(hash2).toString('hex'));
    });

    it('should produce 32-byte hash', () => {
      const hash = computePerpPayloadHash(sampleOrder);
      expect(hash.length).to.equal(32);
    });

    it('should produce different hashes for different orders', () => {
      const order2: PerpOrderPayload = { ...sampleOrder, price: new BN(200_000_000) };
      const hash1 = computePerpPayloadHash(sampleOrder);
      const hash2 = computePerpPayloadHash(order2);
      expect(Buffer.from(hash1).toString('hex')).to.not.equal(Buffer.from(hash2).toString('hex'));
    });

    it('should produce different hashes for different sides', () => {
      const longOrder: PerpOrderPayload = { ...sampleOrder, side: 'long' };
      const shortOrder: PerpOrderPayload = { ...sampleOrder, side: 'short' };
      const hash1 = computePerpPayloadHash(longOrder);
      const hash2 = computePerpPayloadHash(shortOrder);
      expect(Buffer.from(hash1).toString('hex')).to.not.equal(Buffer.from(hash2).toString('hex'));
    });

    it('should produce different hashes for different markets', () => {
      const sol: PerpOrderPayload = { ...sampleOrder, marketId: 0 };
      const btc: PerpOrderPayload = { ...sampleOrder, marketId: 1 };
      const hash1 = computePerpPayloadHash(sol);
      const hash2 = computePerpPayloadHash(btc);
      expect(Buffer.from(hash1).toString('hex')).to.not.equal(Buffer.from(hash2).toString('hex'));
    });

    it('should match on-chain hash verification (SHA-256)', () => {
      const serialized = serializePerpOrderPayload(sampleOrder);
      const onChainHash = createHash('sha256').update(serialized).digest();
      const sdkHash = computePerpPayloadHash(sampleOrder);
      expect(Buffer.from(sdkHash).toString('hex')).to.equal(onChainHash.toString('hex'));
    });

    it('should match on-chain hash for long limit order', () => {
      const order: PerpOrderPayload = { side: 'long', orderType: 'limit', price: new BN(100_000_000), quantity: new BN(10_000_000), maxSlippageBps: 50, marketId: 0 };
      const serialized = serializePerpOrderPayload(order);

      // Manually construct what the on-chain program does
      const onChain = Buffer.alloc(26);
      onChain.writeUInt8(0, 0); // long
      onChain.writeUInt8(0, 1); // limit
      onChain.writeBigUInt64LE(100_000_000n, 2);
      onChain.writeBigUInt64LE(10_000_000n, 10);
      onChain.writeUInt16LE(50, 18);
      onChain.writeUInt8(0, 20);

      expect(Buffer.from(serialized).toString('hex')).to.equal(onChain.toString('hex'));

      const sdkHash = computePerpPayloadHash(order);
      const onChainHash = createHash('sha256').update(onChain).digest();
      expect(Buffer.from(sdkHash).toString('hex')).to.equal(onChainHash.toString('hex'));
    });

    it('should match on-chain hash for short market order', () => {
      const order: PerpOrderPayload = { side: 'short', orderType: 'market', price: new BN(0), quantity: new BN(5_000_000), maxSlippageBps: 100, marketId: 2 };
      const serialized = serializePerpOrderPayload(order);

      const onChain = Buffer.alloc(26);
      onChain.writeUInt8(1, 0); // short
      onChain.writeUInt8(1, 1); // market
      onChain.writeBigUInt64LE(0n, 2);
      onChain.writeBigUInt64LE(5_000_000n, 10);
      onChain.writeUInt16LE(100, 18);
      onChain.writeUInt8(2, 20);

      expect(Buffer.from(serialized).toString('hex')).to.equal(onChain.toString('hex'));
    });
  });

  // ============================================================
  // Committed Encrypted Orders
  // ============================================================

  describe('committed encrypted orders', () => {
    it('should create committed encrypted order', () => {
      const committed = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);

      expect(committed.encryptedBytes.length).to.be.greaterThan(0);
      expect(committed.payloadHash.length).to.equal(32);
      expect(committed.userPublicKey.length).to.equal(32);
    });

    it('should decrypt back to original order', () => {
      const committed = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      const decrypted = decryptPerpOrderPayload(committed.encryptedBytes, userKeypair.publicKey, solverKeypair);

      expect(decrypted.side).to.equal('short');
      expect(decrypted.price.toString()).to.equal('150000000');
      expect(decrypted.quantity.toString()).to.equal('5000000');
    });

    it('should have matching hash after decrypt-recompute', () => {
      const committed = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      const decrypted = decryptPerpOrderPayload(committed.encryptedBytes, userKeypair.publicKey, solverKeypair);
      const recomputedHash = computePerpPayloadHash(decrypted);

      expect(Buffer.from(recomputedHash).toString('hex'))
        .to.equal(Buffer.from(committed.payloadHash).toString('hex'));
    });

    it('should return correct user public key', () => {
      const committed = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      expect(Buffer.from(committed.userPublicKey).toString('hex'))
        .to.equal(Buffer.from(userKeypair.publicKey).toString('hex'));
    });

    it('should produce different encrypted bytes each time', () => {
      const c1 = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      const c2 = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      expect(Buffer.from(c1.encryptedBytes).toString('hex'))
        .to.not.equal(Buffer.from(c2.encryptedBytes).toString('hex'));
    });

    it('should produce same hash each time', () => {
      const c1 = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      const c2 = createCommittedEncryptedPerpOrder(sampleOrder, solverKeypair.publicKey, userKeypair);
      expect(Buffer.from(c1.payloadHash).toString('hex'))
        .to.equal(Buffer.from(c2.payloadHash).toString('hex'));
    });
  });

  // ============================================================
  // Keypair Generation
  // ============================================================

  describe('keypair generation', () => {
    it('should generate unique keypairs', () => {
      const kp1 = generateEncryptionKeypair();
      const kp2 = generateEncryptionKeypair();
      expect(Buffer.from(kp1.publicKey).toString('hex'))
        .to.not.equal(Buffer.from(kp2.publicKey).toString('hex'));
    });

    it('should generate 32-byte keys', () => {
      const kp = generateEncryptionKeypair();
      expect(kp.publicKey.length).to.equal(32);
      expect(kp.secretKey.length).to.equal(32);
    });
  });

  // ============================================================
  // Cross-compatibility with spot orders
  // ============================================================

  describe('cross-compatibility', () => {
    it('perp and spot hashes should be different for same-value fields', () => {
      // Even if numeric values are similar, different schemas produce different hashes
      const perpHash = computePerpPayloadHash({
        side: 'long', orderType: 'limit',
        price: new BN(100), quantity: new BN(50),
        maxSlippageBps: 30, marketId: 0,
      });
      const spotHash = computePayloadHash({
        minOutputAmount: new BN(100),
        slippageBps: 50,
        deadline: 30,
      });
      expect(Buffer.from(perpHash).toString('hex'))
        .to.not.equal(Buffer.from(spotHash).toString('hex'));
    });
  });
});

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
} = require('@fabrknt/veil-orders');
const { PERP_ORDER_SCHEMA, calculateSchemaSize } = require('@fabrknt/veil-core');
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

  it('should have correct schema size (26 bytes)', () => {
    const size = calculateSchemaSize(PERP_ORDER_SCHEMA);
    expect(size).to.equal(26);
  });

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

  it('should encrypt and decrypt correctly', () => {
    const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);
    expect(encrypted.bytes.length).to.be.greaterThan(28); // nonce + ciphertext + auth tag

    const decrypted = decryptPerpOrderPayload(encrypted.bytes, userKeypair.publicKey, solverKeypair);
    expect(decrypted.side).to.equal('short');
    expect(decrypted.orderType).to.equal('limit');
    expect(decrypted.price.toString()).to.equal('150000000');
    expect(decrypted.quantity.toString()).to.equal('5000000');
    expect(decrypted.maxSlippageBps).to.equal(30);
    expect(decrypted.marketId).to.equal(0);
  });

  it('should produce deterministic commitment hashes', () => {
    const hash1 = computePerpPayloadHash(sampleOrder);
    const hash2 = computePerpPayloadHash(sampleOrder);
    expect(Buffer.from(hash1).toString('hex')).to.equal(Buffer.from(hash2).toString('hex'));
    expect(hash1.length).to.equal(32);
  });

  it('should match on-chain hash verification', () => {
    // Simulate what reveal_match does on-chain:
    // Serialize decrypted params → SHA-256 → compare
    const serialized = serializePerpOrderPayload(sampleOrder);
    const onChainHash = createHash('sha256').update(serialized).digest();

    const sdkHash = computePerpPayloadHash(sampleOrder);
    expect(Buffer.from(sdkHash).toString('hex')).to.equal(onChainHash.toString('hex'));
  });

  it('should create committed encrypted order', () => {
    const committed = createCommittedEncryptedPerpOrder(
      sampleOrder,
      solverKeypair.publicKey,
      userKeypair,
    );

    expect(committed.encryptedBytes.length).to.be.greaterThan(0);
    expect(committed.payloadHash.length).to.equal(32);
    expect(committed.userPublicKey.length).to.equal(32);

    // Verify decryption matches
    const decrypted = decryptPerpOrderPayload(
      committed.encryptedBytes,
      userKeypair.publicKey,
      solverKeypair,
    );
    expect(decrypted.side).to.equal('short');
    expect(decrypted.price.toString()).to.equal('150000000');

    // Verify hash matches
    const recomputedHash = computePerpPayloadHash(decrypted);
    expect(Buffer.from(recomputedHash).toString('hex'))
      .to.equal(Buffer.from(committed.payloadHash).toString('hex'));
  });

  it('should fail decryption with wrong keypair', () => {
    const wrongKeypair = generateEncryptionKeypair();
    const encrypted = encryptPerpOrderPayload(sampleOrder, solverKeypair.publicKey, userKeypair);

    expect(() => {
      decryptPerpOrderPayload(encrypted.bytes, userKeypair.publicKey, wrongKeypair);
    }).to.throw('Decryption failed');
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

  it('should handle market orders (price=0)', () => {
    const marketOrder: PerpOrderPayload = {
      ...sampleOrder,
      orderType: 'market',
      price: new BN(0),
    };

    const bytes = serializePerpOrderPayload(marketOrder);
    const decoded = deserializePerpOrderPayload(bytes);
    expect(decoded.orderType).to.equal('market');
    expect(decoded.price.toString()).to.equal('0');
  });
});

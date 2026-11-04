# Deprecation Plan

## Sunset Date: 2026-09-01

### Deprecated Endpoints

#### QN-Addon (`@fabrknt/veil-qn-addon`)

| Endpoint | Replacement | Status |
|----------|-------------|--------|
| `POST /v1/encrypt` | Client-side via `@fabrknt/veil-core/box` or `@fabrknt/veil-browser` | Deprecated, rate-limited (10 req/min) |
| `POST /v1/decrypt` | Client-side via `@fabrknt/veil-core/box` or `@fabrknt/veil-browser` | Deprecated, rate-limited (10 req/min) |
| `POST /v1/crypto/encrypt-multiple` | Client-side via `@fabrknt/veil-core/box` | Deprecated, rate-limited (10 req/min) |
| `POST /v1/orders/encrypt` | Client-side via `@fabrknt/veil-core/orders` | Deprecated, rate-limited (10 req/min) |
| `POST /v1/orders/decrypt` | Client-side via `@fabrknt/veil-core/orders` | Deprecated, rate-limited (10 req/min) |

#### Confidential Swap Router Solver

| Endpoint | Replacement | Status |
|----------|-------------|--------|
| `POST /api/register-encryption-pubkey` | On-chain `userEncryptionPubkey` in `submitOrder` | Deprecated |

### Timeline

| Date | Action |
|------|--------|
| 2026-03-11 | Deprecation headers and logging active |
| 2026-06-01 | Warning emails to remaining users (if applicable) |
| 2026-07-01 | Reduce rate limits to 5 req/min |
| 2026-08-01 | Return 410 Gone for new callers, existing callers get 1 req/min |
| 2026-09-01 | Remove endpoints entirely |

### Migration Guide

**For encryption/decryption:**
```typescript
// Before (server-side via QN-Addon)
const res = await fetch('/v1/encrypt', { body: JSON.stringify({ message, recipientPublicKey }) });

// After (client-side)
import { VeilClient } from '@fabrknt/veil-browser';
const client = VeilClient.create();
const encrypted = client.encrypt(message, recipientPublicKey);
```

**For order encryption:**
```typescript
// Before (server-side via QN-Addon)
const res = await fetch('/v1/orders/encrypt', { body: JSON.stringify({ minOutputAmount, ... }) });

// After (client-side)
import { createEncryptedOrder } from '@fabrknt/veil-core/orders';
const order = createEncryptedOrder(minOutputAmount, slippageBps, deadline, solverPubkey, keypair);
```

**For solver pubkey registration:**
```typescript
// Before (off-chain API)
await fetch('/api/register-encryption-pubkey', { body: JSON.stringify({ pubkey }) });

// After (on-chain in submitOrder)
// The userEncryptionPubkey is now passed as an argument to submitOrder
await program.methods.submitOrder(orderId, inputAmount, encryptedPayload, payloadHash, userEncryptionPubkey)...
```

### Monitoring

Deprecated endpoint usage is logged with:
- Endpoint path
- QN instance ID
- Days remaining until sunset

Review logs weekly to track migration progress.

# ShadowLaunch Architecture

## Overview

ShadowLaunch is a Next.js 14 application that provides privacy-preserving token purchases on Pump.fun. It leverages the Veil privacy suite's `@fabrknt/veil-core` package for shielded transfers and ephemeral wallet management.

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         ShadowLaunch App                           │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │   Next.js    │  │   React      │  │   Solana Wallet          │ │
│  │   App Router │  │   Hooks      │  │   Adapter                │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘ │
│         │                 │                      │                │
│         ▼                 ▼                      ▼                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Shadow Mode Context                       │  │
│  │              (Standard vs Privacy Mode)                      │  │
│  └─────────────────────────┬───────────────────────────────────┘  │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                   │
│         ▼                  ▼                  ▼                   │
│  ┌────────────┐    ┌────────────┐    ┌────────────────┐          │
│  │ Ephemeral  │    │  Shielded  │    │   Pump.fun     │          │
│  │  Wallet    │    │  Transfer  │    │   Client       │          │
│  │  Manager   │    │  (Privacy) │    │   (API)        │          │
│  └─────┬──────┘    └─────┬──────┘    └───────┬────────┘          │
│        │                 │                   │                    │
└────────┼─────────────────┼───────────────────┼────────────────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    @fabrknt/veil-core                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  NaCl Box   │  │   Privacy   │  │    ZK Compression       │  │
│  │  Encryption │  │    Cash     │  │   (Light Protocol)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                 │                   │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Solana Blockchain                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Main      │  │   Privacy   │  │      Pump.fun           │  │
│  │   Wallet    │  │    Pool     │  │   Bonding Curve         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Landing page (/)
│   ├── launch/
│   │   └── page.tsx             # Token browser (/launch)
│   └── token/
│       └── [mint]/
│           └── page.tsx         # Token detail (/token/:mint)
│
├── components/
│   ├── providers/
│   │   └── solana-provider.tsx  # Wallet adapter context
│   ├── wallet/
│   │   └── connect-button.tsx   # Wallet connection UI
│   └── ui/                      # Reusable components
│       ├── button.tsx
│       ├── input.tsx
│       ├── badge.tsx
│       └── ...
│
├── hooks/
│   ├── use-shadow-mode.tsx      # Privacy mode state management
│   ├── use-ephemeral-wallet.ts  # Ephemeral wallet lifecycle
│   └── use-pumpfun-tokens.ts    # Token data fetching
│
└── lib/
    ├── shadow/                  # Core privacy logic
    ├── pumpfun/                 # Pump.fun integration
    └── utils/                   # Helpers
```

### State Management

ShadowLaunch uses React Context for global state:

```typescript
// Shadow Mode Context
interface ShadowModeContextValue {
  mode: "standard" | "shadow";
  setMode: (mode: ShadowMode) => void;
  toggleMode: () => void;
  isShielding: boolean;
  isShadowMode: boolean;
}

// Ephemeral Wallet Hook
interface EphemeralWalletState {
  wallet: EphemeralWallet | null;
  balance: number;
  createWallet: (label?: string) => EphemeralWallet;
  clearWallet: () => void;
}
```

## Data Flow

### Standard Purchase Flow

```
User clicks "Buy" (Standard Mode)
        │
        ▼
┌───────────────────┐
│ Wallet signs tx   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Direct purchase   │
│ on Pump.fun       │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Tokens in wallet  │
│ (LINKED to you)   │
└───────────────────┘
```

### Shadow Purchase Flow

```
User clicks "Shadow Buy" (Shadow Mode)
        │
        ▼
┌───────────────────┐
│ Create ephemeral  │
│ wallet (Keypair)  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Shield SOL from   │
│ main wallet       │
│ (Privacy Cash)    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Unshield to       │
│ ephemeral wallet  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Purchase token    │
│ with ephemeral    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Tokens in         │
│ ephemeral wallet  │
│ (NO LINK to you)  │
└───────────────────┘
```

## Key Modules

### Shadow Module (`src/lib/shadow/`)

```typescript
// ephemeral.ts - Wallet generation
export function createEphemeralWallet(label?: string): EphemeralWallet {
  const keypair = Keypair.generate();
  return { keypair, publicKey: keypair.publicKey, createdAt: Date.now(), label };
}

// shadow-purchase.ts - Privacy flow orchestration
export async function executeShadowPurchase(params: ShadowPurchaseParams): Promise<ShadowPurchaseResult> {
  // 1. Create ephemeral wallet
  // 2. Shield SOL via Privacy Cash
  // 3. Unshield to ephemeral
  // 4. Purchase token
}
```

### Pump.fun Module (`src/lib/pumpfun/`)

```typescript
// client.ts - API integration
export async function getTrendingTokens(): Promise<PumpFunToken[]>
export async function getToken(mint: string): Promise<PumpFunToken>
export async function purchaseToken(...): Promise<PurchaseResult>

// bonding-curve.ts - Price calculations
export function calculatePurchaseAmount(token, solAmount): PurchaseCalculation
export function getBondingCurveState(token): BondingCurveState
```

## Integration with @fabrknt/veil-core

ShadowLaunch imports privacy primitives from the monorepo's shared package:

```typescript
import { shieldTokens, unshieldTokens } from "@fabrknt/veil-core/solana/shielded";
```

This provides:
- **Shielded Transfers**: Privacy Cash SDK wrapper for shield/unshield operations
- **ZK Compression**: Light Protocol integration for cost reduction
- **NaCl Encryption**: Curve25519-XSalsa20-Poly1305 for secure data

## Security Considerations

### Ephemeral Key Management

- Keys are generated client-side using `Keypair.generate()`
- No seed phrases - keys exist only in memory
- Keys should be exported before page refresh or explicitly discarded

### Privacy Guarantees

- Main wallet → Privacy Pool: Link exists but destination unknown
- Privacy Pool → Ephemeral: No public link (shielded)
- Ephemeral → Token: Public but not linked to main wallet

### Threat Model

See [PRIVACY.md](./PRIVACY.md) for detailed threat analysis.

## Performance Considerations

### RPC Optimization

- Uses Helius RPC for reliable mainnet access
- Token data cached in React state with manual refresh
- Bonding curve calculations done client-side

### Bundle Size

Key dependencies and their impact:
- `@solana/web3.js`: ~500KB (tree-shakeable)
- `@solana/wallet-adapter-*`: ~200KB (multiple wallets)
- `next`: Framework overhead, optimized for production

## Future Architecture

### Planned Improvements

1. **Relayer Service**: Server-side unshielding for better UX
2. **Batch Operations**: Multiple ephemeral wallets in single shield
3. **Persistent Encrypted Storage**: Secure local storage for ephemeral keys
4. **Mobile Support**: React Native companion app

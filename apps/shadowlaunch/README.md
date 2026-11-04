# ShadowLaunch

**Privacy-first token purchases on Pump.fun**

ShadowLaunch breaks the on-chain link between your wallet and your Pump.fun purchases. Accumulate without being tracked. Trade without being front-run.

## Powered By

<table>
  <tr>
    <td align="center" width="200">
      <a href="https://quicknode.com">
        <strong>QuickNode</strong><br/>
        High-Performance RPC
      </a>
    </td>
    <td align="center" width="200">
      <a href="https://helius.dev">
        <strong>Helius</strong><br/>
        Enhanced Solana APIs
      </a>
    </td>
    <td align="center" width="200">
      <a href="https://lightprotocol.com">
        <strong>Light Protocol</strong><br/>
        ZK Compression
      </a>
    </td>
  </tr>
</table>

## Features

- **Shadow Mode**: Toggle between standard and private purchases
- **Ephemeral Wallets**: Each purchase uses a fresh wallet with no history
- **Shielded Transfers**: Funds route through privacy pool, breaking the link
- **Same Speed**: Privacy doesn't mean slow - transactions confirm in seconds
- **Token Browser**: Browse trending and new tokens on Pump.fun
- **Real-time Data**: Live bonding curve calculations and graduation progress

## How Shadow Mode Works

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Main Wallet   │ ──▶  │  Privacy Pool   │ ──▶  │Ephemeral Wallet │
│   (Your SOL)    │      │  (Shielded)     │      │  (Fresh Keys)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Pump.fun      │
                                                  │   Purchase      │
                                                  └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Tokens arrive  │
                                                  │  NO LINK to you │
                                                  └─────────────────┘
```

1. **Connect Wallet** - Connect your main Phantom or Solflare wallet
2. **Shield Funds** - SOL moves to privacy pool, breaking the on-chain link
3. **Ephemeral Purchase** - Fresh wallet buys tokens from Pump.fun
4. **Unlinked Tokens** - Tokens arrive in ephemeral wallet with no trace to you

## Quick Start

### Prerequisites

- Node.js 18+
- Yarn (workspace managed by monorepo root)
- RPC endpoint from [QuickNode](https://quicknode.com) (recommended) or [Helius](https://helius.dev)

### Setup

1. Install dependencies from monorepo root:
```bash
cd /path/to/veil
yarn install
```

2. Create environment file:
```bash
cd apps/shadowlaunch
cp .env.example .env
```

3. Add your RPC endpoint to `.env`:

**Option A: QuickNode (Recommended)**
```env
NEXT_PUBLIC_QUICKNODE_RPC_URL=https://your-endpoint.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

**Option B: Helius**
```env
NEXT_PUBLIC_HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

4. Start the development server:
```bash
yarn dev
```

5. Open http://localhost:3000

## Project Structure

```
apps/shadowlaunch/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # Landing page
│   │   ├── launch/page.tsx     # Token browser
│   │   └── token/[mint]/       # Token detail & purchase
│   ├── components/
│   │   ├── providers/          # Solana wallet provider
│   │   ├── ui/                 # Reusable UI components
│   │   ├── wallet/             # Wallet connection
│   │   └── intel/              # Terminal-style components
│   ├── hooks/
│   │   ├── use-shadow-mode.tsx # Privacy mode state
│   │   ├── use-ephemeral-wallet.ts
│   │   └── use-pumpfun-tokens.ts
│   └── lib/
│       ├── shadow/             # Shadow purchase logic
│       │   ├── ephemeral.ts    # Ephemeral wallet generation
│       │   └── shadow-purchase.ts
│       ├── pumpfun/            # Pump.fun integration
│       │   ├── client.ts       # API client
│       │   ├── bonding-curve.ts
│       │   └── types.ts
│       └── utils/              # Formatting utilities
├── .env.example
├── package.json
└── tailwind.config.ts
```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@fabrknt/veil-core` | Shielded transfers, ZK compression |
| `@solana/web3.js` | Solana blockchain interaction |
| `@solana/wallet-adapter-*` | Wallet connection (Phantom, Solflare, etc.) |
| `next` | React framework with App Router |
| `tailwindcss` | Styling |

## RPC Providers

ShadowLaunch supports multiple RPC providers for maximum flexibility and reliability:

| Provider | Environment Variable | Features |
|----------|---------------------|----------|
| **[QuickNode](https://quicknode.com)** | `NEXT_PUBLIC_QUICKNODE_RPC_URL` | High-performance, global edge network, excellent uptime |
| **[Helius](https://helius.dev)** | `NEXT_PUBLIC_HELIUS_RPC_URL` | Enhanced APIs, webhooks, DAS support |
| **Custom** | `NEXT_PUBLIC_SOLANA_RPC_URL` | Any Solana RPC endpoint |

We recommend **QuickNode** for production deployments due to their exceptional performance and reliability on Solana.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_QUICKNODE_RPC_URL` | QuickNode RPC endpoint (recommended) | No* |
| `NEXT_PUBLIC_HELIUS_RPC_URL` | Helius RPC endpoint | No* |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Alternative RPC endpoint | No* |
| `NEXT_PUBLIC_PUMPFUN_API_URL` | Pump.fun API (defaults to official) | No |

*At least one RPC endpoint is required for mainnet operation.

## Scripts

```bash
yarn dev      # Start development server
yarn build    # Build for production
yarn start    # Start production server
yarn lint     # Run ESLint
```

## Privacy Model

ShadowLaunch provides **transaction unlinkability** through:

1. **Ephemeral Addresses**: Generated fresh for each purchase using `Keypair.generate()`. No seed phrase, no pattern, no history.

2. **Shielded Transfer** (not yet real): calls `@fabrknt/veil-core/solana/shielded`, which is currently a placeholder that returns a fake signature and moves no funds. Until it is implemented, purchases go through the ephemeral wallet only and are **linkable** on-chain.

3. **No Persistent State**: Ephemeral wallets exist only for the purchase. Private keys are held in memory and can be exported or discarded.

See [PRIVACY.md](./PRIVACY.md) for detailed privacy guarantees and threat model.

## Fees

| Mode | Estimated Fees |
|------|----------------|
| Standard | ~0.000005 SOL (transaction fee only) |
| Shadow | ~0.003 SOL (shield + unshield + transaction) |

Shadow mode costs more due to the privacy pool operations, but provides transaction unlinkability.

## Roadmap

- [ ] Implement actual Privacy Cash SDK integration
- [ ] Build Pump.fun purchase instruction
- [ ] Add ephemeral wallet export (JSON/QR)
- [ ] Batch purchases across multiple tokens
- [ ] Token holding dashboard
- [ ] Mobile-responsive design improvements

## Built For

**Pump.fun "Build In Public Global Hackathon" 2026**

$3M in funding, 12 winners, $250k per project.

## Acknowledgments

Special thanks to our infrastructure partners:

- **[QuickNode](https://quicknode.com)** - For providing high-performance Solana RPC infrastructure
- **[Helius](https://helius.dev)** - For enhanced Solana APIs and developer tools
- **[Light Protocol](https://lightprotocol.com)** - For ZK compression technology

## License

MIT

## Links

- [Pump.fun](https://pump.fun)
- [Veil Privacy Suite](https://github.com/fabrknt/veil)
- [QuickNode](https://quicknode.com)
- [Helius](https://helius.dev)
- [Light Protocol](https://lightprotocol.com)

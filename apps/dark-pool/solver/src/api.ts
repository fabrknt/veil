import express from 'express';
import type { DarkPoolSolver } from './index';
import type { DarkPoolSolverConfig } from './config';

/**
 * REST API for the dark pool solver.
 */
export function startApi(solver: DarkPoolSolver, config: DarkPoolSolverConfig): void {
  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  /**
   * GET /solver-pubkey
   */
  app.get('/solver-pubkey', (_req, res) => {
    const pubkey = solver.getEncryptionPubkey();
    res.json({
      encryptionPubkey: Buffer.from(pubkey).toString('base64'),
      encryptionPubkeyHex: Buffer.from(pubkey).toString('hex'),
    });
  });

  /**
   * GET /orders/:commitmentId/status
   */
  app.get('/orders/:commitmentId/status', (_req, res) => {
    res.json({ status: 'pending', message: 'On-chain query not yet implemented' });
  });

  /**
   * GET /markets
   */
  app.get('/markets', (_req, res) => {
    res.json({
      markets: [
        { id: 0, symbol: 'SOL-PERP', venues: ['drift', 'jupiter', 'phoenix'] },
        { id: 1, symbol: 'BTC-PERP', venues: ['drift', 'jupiter'] },
        { id: 2, symbol: 'ETH-PERP', venues: ['drift', 'jupiter'] },
      ],
    });
  });

  /**
   * GET /health
   */
  app.get('/health', (_req, res) => {
    const matcher = solver.getMatcher();
    const router = solver.getRouter();
    const stats = router ? router.getStats() : null;

    res.json({
      status: 'ok',
      totalOrders: matcher.getTotalOrders(),
      books: {
        'SOL-PERP': matcher.getDepth(0),
        'BTC-PERP': matcher.getDepth(1),
        'ETH-PERP': matcher.getDepth(2),
      },
      settlement: stats ? {
        internalMatches: stats.internalMatches,
        venueSettlements: stats.venueSettlements,
        internalVolume: stats.internalVolume.toString(),
        venueVolume: stats.venueVolume.toString(),
        feeSavedUsd: stats.feeSavedUsd.toFixed(2),
      } : null,
    });
  });

  /**
   * GET /fees
   * Fee comparison: dark pool internal matching vs public venue execution.
   * Shows the cost advantage of internal netting.
   */
  app.get('/fees', (_req, res) => {
    const router = solver.getRouter();
    if (!router) {
      res.json({ error: 'Router not initialized' });
      return;
    }

    const comparison = router.getFeeComparison();
    const stats = router.getStats();

    res.json({
      darkPool: {
        feeBps: comparison.darkPoolFeeBps,
        description: 'Orders matched internally — no venue fees, no slippage, no MEV',
      },
      venues: comparison.venues.map(v => ({
        name: v.name,
        takerFeeBps: v.takerBps,
        makerFeeBps: v.makerBps,
        savingsVsDarkPool: v.savingsVsDarkPool + ' bps per trade',
      })),
      additionalSavings: {
        slippage: comparison.estimatedSlippageSaved,
        mev: comparison.estimatedMevSaved,
        total: '7-20 bps per internally matched trade',
      },
      stats: {
        internalMatches: stats.internalMatches,
        venueSettlements: stats.venueSettlements,
        totalFeeSavedUsd: stats.feeSavedUsd.toFixed(2),
        nettingRate: stats.internalMatches + stats.venueSettlements > 0
          ? ((stats.internalMatches / (stats.internalMatches + stats.venueSettlements)) * 100).toFixed(1) + '%'
          : '0%',
      },
    });
  });

  app.listen(config.apiPort, () => {
    console.log(`[api] Dark pool solver API listening on port ${config.apiPort}`);
  });
}

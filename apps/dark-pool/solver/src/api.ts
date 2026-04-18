import express from 'express';
import type { DarkPoolSolver } from './index';
import type { DarkPoolSolverConfig } from './config';

/**
 * REST API for the dark pool solver.
 * Adapted from confidential-swap-router/solver/src/api.ts
 */
export function startApi(solver: DarkPoolSolver, config: DarkPoolSolverConfig): void {
  const app = express();
  app.use(express.json());

  // CORS
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  /**
   * GET /solver-pubkey
   * Returns the solver's NaCl encryption public key.
   * Clients use this to encrypt order payloads before submission.
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
   * Query the status of a commitment.
   */
  app.get('/orders/:commitmentId/status', (_req, res) => {
    // In production: query on-chain PerpOrderCommitment by ID
    res.json({ status: 'pending', message: 'On-chain query not yet implemented' });
  });

  /**
   * GET /markets
   * List supported markets and their venue configurations.
   */
  app.get('/markets', (_req, res) => {
    res.json({
      markets: [
        { id: 0, symbol: 'SOL-PERP', venues: ['drift', 'jupiter'] },
        { id: 1, symbol: 'BTC-PERP', venues: ['drift', 'jupiter'] },
        { id: 2, symbol: 'ETH-PERP', venues: ['drift', 'jupiter'] },
      ],
    });
  });

  /**
   * GET /health
   * Solver health check with book depth stats.
   */
  app.get('/health', (_req, res) => {
    const matcher = solver.getMatcher();
    res.json({
      status: 'ok',
      totalOrders: matcher.getTotalOrders(),
      books: {
        'SOL-PERP': matcher.getDepth(0),
        'BTC-PERP': matcher.getDepth(1),
        'ETH-PERP': matcher.getDepth(2),
      },
    });
  });

  app.listen(config.apiPort, () => {
    console.log(`[api] Dark pool solver API listening on port ${config.apiPort}`);
  });
}

import { Router, Request, Response } from 'express';
import * as ordersService from '../services/orders-service';
import { decodeBase64 } from '../utils/validation';

const router: Router = Router();

const SUNSET_DATE = '2026-09-01';
const SUNSET_MS = new Date(SUNSET_DATE).getTime();

function logDeprecatedAccess(endpoint: string, req: Request): void {
  const daysRemaining = Math.ceil((SUNSET_MS - Date.now()) / (1000 * 60 * 60 * 24));
  const instanceId = req.headers['x-instance-id'] || 'unknown';
  console.warn(
    `[DEPRECATED] ${endpoint} called by instance=${instanceId} — ${daysRemaining} days until sunset (${SUNSET_DATE})`
  );
}

router.post('/v1/orders/encrypt', (req: Request, res: Response) => {
  logDeprecatedAccess('POST /v1/orders/encrypt', req);
  try {
    const { minOutputAmount, slippageBps, deadline, solverPublicKey, userSecretKey, userPublicKey } = req.body;

    if (!minOutputAmount || typeof slippageBps !== 'number' || typeof deadline !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Required fields: minOutputAmount (string), slippageBps (number), deadline (number)',
      });
      return;
    }
    if (!solverPublicKey || !userSecretKey || !userPublicKey) {
      res.status(400).json({
        success: false,
        error: 'Required fields: solverPublicKey, userSecretKey, userPublicKey (all base64)',
      });
      return;
    }

    const solverPk = decodeBase64(solverPublicKey);
    const userSk = decodeBase64(userSecretKey);
    const userPk = decodeBase64(userPublicKey);

    if (!solverPk || !userSk || !userPk) {
      res.status(400).json({ success: false, error: 'solverPublicKey, userSecretKey, userPublicKey must be valid base64' });
      return;
    }

    const result = ordersService.encryptOrder(
      { minOutputAmount: String(minOutputAmount), slippageBps, deadline },
      solverPk,
      { publicKey: userPk, secretKey: userSk },
    );

    res.set('Deprecation', 'true');
    res.set('Sunset', '2026-09-01');
    res.json({
      success: true,
      nonce: {
        base64: Buffer.from(result.nonce).toString('base64'),
        hex: Buffer.from(result.nonce).toString('hex'),
      },
      ciphertext: {
        base64: Buffer.from(result.ciphertext).toString('base64'),
        hex: Buffer.from(result.ciphertext).toString('hex'),
      },
      bytes: {
        base64: Buffer.from(result.bytes).toString('base64'),
        hex: Buffer.from(result.bytes).toString('hex'),
      },
      _deprecated: {
        warning: 'This endpoint accepts secret keys over HTTP and will be removed in a future version. Perform order encryption client-side using @fabrknt/veil-orders or @fabrknt/veil-browser instead.',
        sunset: '2026-09-01',
        alternative: '@fabrknt/veil-orders createCommittedEncryptedOrder() or @fabrknt/veil-browser VeilClient.encryptOrder()',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/v1/orders/decrypt', (req: Request, res: Response) => {
  logDeprecatedAccess('POST /v1/orders/decrypt', req);
  try {
    const { bytes, userPublicKey, solverSecretKey, solverPublicKey } = req.body;

    if (!bytes || !userPublicKey || !solverSecretKey || !solverPublicKey) {
      res.status(400).json({
        success: false,
        error: 'Required fields: bytes, userPublicKey, solverSecretKey, solverPublicKey (all base64)',
      });
      return;
    }

    const bytesArr = decodeBase64(bytes);
    const userPk = decodeBase64(userPublicKey);
    const solverSk = decodeBase64(solverSecretKey);
    const solverPk = decodeBase64(solverPublicKey);

    if (!bytesArr || !userPk || !solverSk || !solverPk) {
      res.status(400).json({ success: false, error: 'All fields must be valid base64' });
      return;
    }

    const payload = ordersService.decryptOrder(
      bytesArr,
      userPk,
      { publicKey: solverPk, secretKey: solverSk },
    );

    res.set('Deprecation', 'true');
    res.set('Sunset', '2026-09-01');
    res.json({
      success: true,
      payload,
      _deprecated: {
        warning: 'This endpoint accepts secret keys over HTTP and will be removed in a future version. Perform order decryption in the solver\'s own infrastructure, not via a cloud API.',
        sunset: '2026-09-01',
        alternative: '@fabrknt/veil-orders decryptOrderPayload() locally',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/v1/orders/validate', (req: Request, res: Response) => {
  try {
    const { bytes } = req.body;

    if (!bytes || typeof bytes !== 'string') {
      res.status(400).json({ success: false, error: 'bytes is required (base64 string of encrypted order)' });
      return;
    }

    const bytesArray = decodeBase64(bytes);
    if (!bytesArray) {
      res.status(400).json({ success: false, error: 'bytes must be valid base64' });
      return;
    }

    const valid = ordersService.validateOrder(bytesArray);

    res.json({ success: true, valid, byteLength: bytesArray.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

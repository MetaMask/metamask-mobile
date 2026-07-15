import { Router } from 'express';
import { asyncHandler } from '../util/async.ts';
import { getUser } from '../store/users.ts';

export const readinessRouter = Router();

/**
 * GET /predict/v1/kalshi/account/readiness?externalUserId=...
 *
 * Maps the local user state to canonical PredictAccountReadiness.
 * Readiness == "ready" requires the per-user PEM to exist (KYC approved and
 * key minted). Anything else is "setup_required" or "setup_pending".
 */
readinessRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const externalUserId = String(req.query.externalUserId ?? '');
    if (!externalUserId) {
      res.status(400).json({
        error: { code: 'INVALID_PARAMETERS', message: 'externalUserId required' },
      });
      return;
    }
    const user = getUser(externalUserId);
    if (!user) {
      res.json({
        venueId: 'kalshi',
        ownerAddress: externalUserId,
        canTrade: false,
        status: 'setup_required',
        blockers: [{ code: 'account_setup_required', action: 'complete_setup' }],
      });
      return;
    }
    if (user.apiKey) {
      res.json({
        venueId: 'kalshi',
        ownerAddress: externalUserId,
        canTrade: true,
        status: 'ready',
      });
      return;
    }
    if (user.setupStep === 'kyc') {
      res.json({
        venueId: 'kalshi',
        ownerAddress: externalUserId,
        canTrade: false,
        status: 'setup_pending',
        blockers: [{ code: 'kyc_pending', action: 'retry' }],
      });
      return;
    }
    res.json({
      venueId: 'kalshi',
      ownerAddress: externalUserId,
      canTrade: false,
      status: 'setup_required',
      blockers: [{ code: 'account_setup_required', action: 'complete_setup' }],
    });
  }),
);

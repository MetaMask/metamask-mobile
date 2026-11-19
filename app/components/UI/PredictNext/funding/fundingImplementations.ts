import type { PredictImplementation } from '../implementation/types';
import type { PredictFundingAction } from './types';

/**
 * The funding flows this client can run, per implementation. A Venue's catalog
 * `actions` says what the Venue supports; this says what the app has code for.
 * Both must hold before a funding entry point appears, so a catalog that lists
 * `deposit` ahead of the client flow still shows nothing.
 *
 * `legacy` runs today's Polymarket deposit and withdrawal. `next` runs the
 * Kalshi deposit (PRED-1161), which stays off until the `predictConfig` flag
 * `kalshiDepositsEnabled` turns it on: `resolvePredictFunding` treats the
 * flow as not implemented while the flag is off. It also runs Withdraw
 * (PRED-1163). Withdraw has no rollout flag; the Venue catalog's `actions`
 * decide whether the entry point shows.
 */
export const PREDICT_FUNDING_IMPLEMENTATIONS: Readonly<
  Record<PredictImplementation, readonly PredictFundingAction[]>
> = {
  legacy: ['deposit', 'withdraw'],
  next: ['deposit', 'withdraw'],
};

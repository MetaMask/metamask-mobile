import type { PredictImplementation } from '../implementation/types';
import type { PredictFundingAction } from './types';

/**
 * The funding flows this client can run, per implementation. A Venue's catalog
 * `actions` says what the Venue supports; this says what the app has code for.
 * Both must hold before a funding entry point appears, so a catalog that lists
 * `deposit` ahead of the client flow still shows nothing.
 *
 * `legacy` runs today's Polymarket deposit and withdrawal. `next` runs the
 * Kalshi deposit (PRED-1494) and Withdraw (PRED-1163) whenever the Venue's
 * catalog `actions` list them.
 */
export const PREDICT_FUNDING_IMPLEMENTATIONS: Readonly<
  Record<PredictImplementation, readonly PredictFundingAction[]>
> = {
  legacy: ['deposit', 'withdraw'],
  next: ['deposit', 'withdraw'],
};

import type { PredictImplementation } from '../implementation/types';
import type { PredictFundingAction } from './types';

/**
 * The funding flows this client can run, per implementation. A descriptor
 * says what a Venue supports; this says what the app has code for. Both must
 * hold before a funding entry point appears, so a descriptor that lists
 * `deposit` ahead of the client flow still shows nothing.
 *
 * `legacy` runs today's Polymarket deposit and withdrawal. `next` runs the
 * Kalshi deposit (PRED-1161), which stays off until the Venue's catalog
 * descriptor lists `deposit` (see `KALSHI_STATIC_VENUE_CATALOG` and
 * `PRED-1403`). PRED-1163 adds withdraw.
 */
export const PREDICT_FUNDING_IMPLEMENTATIONS: Readonly<
  Record<PredictImplementation, readonly PredictFundingAction[]>
> = {
  legacy: ['deposit', 'withdraw'],
  next: ['deposit'],
};

import type { PredictImplementation } from '../implementation/types';
import type { PredictFundingAction } from './types';

/**
 * The funding flows this client can run, per implementation. A descriptor
 * says what a Venue supports; this says what the app has code for. Both must
 * hold before a funding entry point appears, so a descriptor that lists
 * `deposit` ahead of the client flow still shows nothing.
 *
 * `legacy` runs today's Polymarket deposit and withdrawal. `next` runs
 * Withdraw (PRED-1163) through `PredictFundingService`; it has no deposit
 * until PRED-1161 ships one.
 */
export const PREDICT_FUNDING_IMPLEMENTATIONS: Readonly<
  Record<PredictImplementation, readonly PredictFundingAction[]>
> = {
  legacy: ['deposit', 'withdraw'],
  next: ['withdraw'],
};

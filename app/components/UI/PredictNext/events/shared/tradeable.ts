import type { PredictMarket, PredictOutcome } from '../../types';

/**
 * Whether an Outcome can start the Order flow right now. A Market must be
 * active and the Outcome must have an Ask Price; a missing Ask Price means no
 * current buy quote, not a zero price.
 */
export const isOutcomeTradeable = (
  market: PredictMarket,
  outcome: PredictOutcome,
): boolean => market.status === 'active' && outcome.askPrice !== undefined;

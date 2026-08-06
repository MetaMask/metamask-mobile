import type { PredictBuyAttempt } from '../../types';

export const predictBuyAttemptRef: {
  current: PredictBuyAttempt | undefined;
} = { current: undefined };

export const predictBuyHasRetryableFailureRef = { current: false };

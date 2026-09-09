/** Sentry `feature` tag for PredictNext traces. Distinct from legacy Predict. */
export const PREDICT_NEXT_FEATURE_NAME = 'PredictNext' as const;

export const PREDICT_MARKET_TYPES = {
  SPREAD: 'spread',
  TOTAL: 'total',
} as const;

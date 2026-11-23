/** Sentry `feature` tag for PredictNext traces. Distinct from legacy Predict. */
export const PREDICT_NEXT_FEATURE_NAME = 'PredictNext' as const;

export const PREDICT_MARKET_TYPES = {
  SPREAD: 'spread',
  TOTAL: 'total',
  TEAM_TOTAL: 'team_total',
  /** An "at least N" ladder: each line reads "N+", with Yes and No. */
  THRESHOLD: 'threshold',
} as const;

/** Event screen layout keys PredictNext reads; the backend documents the full set. */
export const PREDICT_MARKET_LAYOUT_KEYS = {
  MONEYLINE_SECTION: 'moneyline',
  FULL_GAME_SUBGROUP: 'full_game',
} as const;

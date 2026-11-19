/**
 * The Active Venue's Predict portfolio value in USD, for a caller that adds it
 * to a wallet total. A value is present only while `ready`. `unavailable`
 * means there is no value to show, either because Predict is unavailable or
 * because the Active Venue's implementation does not supply one yet. It
 * never means zero.
 */
export type PredictPortfolioValue =
  | { status: 'ready'; valueUsd: number }
  | { status: 'unavailable' | 'loading' | 'error'; valueUsd?: undefined };

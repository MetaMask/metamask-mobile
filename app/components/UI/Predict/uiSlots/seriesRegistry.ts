import { BTC_UP_OR_DOWN_5M_SERIES } from '../constants/btcUpDown5mSeries';

/** Series a remote assignment may reference, keyed by its stable remote id. */
export const PREDICT_HOMEPAGE_SERIES_REGISTRY = {
  'btc-up-or-down-5m': BTC_UP_OR_DOWN_5M_SERIES,
} as const;

export type PredictHomepageSeriesId =
  keyof typeof PREDICT_HOMEPAGE_SERIES_REGISTRY;

export const isPredictHomepageSeriesId = (
  value: unknown,
): value is PredictHomepageSeriesId =>
  typeof value === 'string' &&
  Object.hasOwn(PREDICT_HOMEPAGE_SERIES_REGISTRY, value);

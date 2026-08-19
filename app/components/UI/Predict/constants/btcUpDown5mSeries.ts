import type { PredictSeries } from '../types';

/** Polymarket Gamma `series_id` for the BTC 5-minute up/down series. */
export const BTC_UP_DOWN_5M_SERIES_ID = '10684';

export const BTC_UP_OR_DOWN_5M_SERIES: PredictSeries = {
  id: BTC_UP_DOWN_5M_SERIES_ID,
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down',
  recurrence: '5m',
};

import type { PredictSeries } from '../types';

/**
 * Temporary kill switch while the shared BTC up/down data hook lives on
 * `predict/crypto-updown-feed-card`. Remove this flag when that branch is
 * merged and the BTC row is ready to render from the shared hook.
 */
export const SHOW_BTC_UP_DOWN_5M_ROW = false;

/** Polymarket Gamma `series_id` for the BTC 5-minute up/down series. */
export const BTC_UP_DOWN_5M_SERIES_ID = '10684';

export const BTC_UP_OR_DOWN_5M_SERIES: PredictSeries = {
  id: BTC_UP_DOWN_5M_SERIES_ID,
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down',
  recurrence: '5m',
};

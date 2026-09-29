import type { PredictSeries } from '../types';
import { BTC_UP_OR_DOWN_5M_SERIES } from './btcUpDown5mSeries';

export { BTC_UP_OR_DOWN_5M_SERIES } from './btcUpDown5mSeries';

/** Polymarket Gamma `series_id` for the ETH 5-minute up/down series. */
export const ETH_UP_DOWN_5M_SERIES_ID = '10683';

/** Polymarket Gamma `series_id` for the BTC 15-minute up/down series. */
export const BTC_UP_DOWN_15M_SERIES_ID = '10192';

export const ETH_UP_OR_DOWN_5M_SERIES: PredictSeries = {
  id: ETH_UP_DOWN_5M_SERIES_ID,
  slug: 'eth-up-or-down-5m',
  title: 'ETH Up or Down',
  recurrence: '5m',
};

export const BTC_UP_OR_DOWN_15M_SERIES: PredictSeries = {
  id: BTC_UP_DOWN_15M_SERIES_ID,
  slug: 'btc-up-or-down-15m',
  title: 'BTC Up or Down',
  recurrence: '15m',
};

/**
 * Crypto Up/Down series shown in the Live Now rail, in display order.
 * Interleaved one-per-two-live by `interleaveLiveNowMarkets` (capped at 3).
 */
export const LIVE_NOW_CRYPTO_SERIES: PredictSeries[] = [
  BTC_UP_OR_DOWN_5M_SERIES,
  ETH_UP_OR_DOWN_5M_SERIES,
  BTC_UP_OR_DOWN_15M_SERIES,
];

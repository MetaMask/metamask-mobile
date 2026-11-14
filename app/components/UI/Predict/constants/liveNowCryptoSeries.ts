import type { PredictSeries } from '../types';
import { BTC_UP_OR_DOWN_5M_SERIES } from './btcUpDown5mSeries';

export { BTC_UP_OR_DOWN_5M_SERIES } from './btcUpDown5mSeries';

/** Polymarket Gamma `series_id` for the ETH 5-minute up/down series. */
export const ETH_UP_DOWN_5M_SERIES_ID = '10683';

/** Polymarket Gamma `series_id` for the BTC 15-minute up/down series. */
export const BTC_UP_DOWN_15M_SERIES_ID = '10192';

/** Polymarket Gamma `series_id` for the Gold (XAU) 15-minute up/down series. */
export const GOLD_UP_DOWN_15M_SERIES_ID = '12967';

/** Polymarket Gamma `series_id` for the Silver (XAG) 15-minute up/down series. */
export const SILVER_UP_DOWN_15M_SERIES_ID = '12968';

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

export const GOLD_UP_OR_DOWN_15M_SERIES: PredictSeries = {
  id: GOLD_UP_DOWN_15M_SERIES_ID,
  slug: 'gold-up-or-down-15m',
  title: 'Gold Up or Down 15m',
  recurrence: '15m',
};

export const SILVER_UP_OR_DOWN_15M_SERIES: PredictSeries = {
  id: SILVER_UP_DOWN_15M_SERIES_ID,
  slug: 'silver-up-or-down-15m',
  title: 'Silver Up or Down 15m',
  recurrence: '15m',
};

/**
 * Crypto Up/Down series shown in the Live Now rail, in display order.
 * Interleaved one-per-two-live by `interleaveLiveNowMarkets` (capped at 5).
 * Gold and Silver have no markets during the daily break, weekends and
 * holidays: the rail keeps the last ended window for up to 45 minutes, then
 * drops them until trading reopens.
 */
export const LIVE_NOW_CRYPTO_SERIES: PredictSeries[] = [
  BTC_UP_OR_DOWN_5M_SERIES,
  ETH_UP_OR_DOWN_5M_SERIES,
  BTC_UP_OR_DOWN_15M_SERIES,
  GOLD_UP_OR_DOWN_15M_SERIES,
  SILVER_UP_OR_DOWN_15M_SERIES,
];

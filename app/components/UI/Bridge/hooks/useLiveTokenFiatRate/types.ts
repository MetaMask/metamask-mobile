/**
 * Candle aggregation buckets served by the `market-data.v1` channel. Bars are
 * pushed every 5s whatever the interval, so this only sets the bucket size.
 */
export type LiveTokenFiatRateInterval =
  | '1m'
  | '5m'
  | '15m'
  | '1h'
  | '4h'
  | '1d'
  | '1w';

export interface UseLiveTokenFiatRateOptions {
  /**
   * Candle bucket to subscribe to.
   */
  interval?: LiveTokenFiatRateInterval;
  /**
   * Time period sent to the `/latest` REST endpoint that backs the stream when
   * the socket is down, stale, or missing the asset.
   */
  timePeriod?: string;
  /**
   * When false no subscription is opened and the polled Redux rate is returned,
   * so a screen can keep the socket to the window it actually prices in.
   */
  enabled?: boolean;
}

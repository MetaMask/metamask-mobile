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
   * Update interval.
   */
  interval?: LiveTokenFiatRateInterval;
  /**
   * Delay before subscribing.
   */
  subscriptionDebounceMs?: number;
  /**
   * Stalness check, to automatically discard channel connections.
   */
  stalenessCheckIntervalMs?: number;
  /**
   * Silence after which the live price is dropped in favour of the Redux rate.
   */
  stalenessThresholdMs?: number;
}

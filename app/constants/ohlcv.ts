/** Candlestick WebSocket namespace. Production serves `ohlcv.v1`. */
export const OHLCV_SUBSCRIPTION_NAMESPACE = 'ohlcv.v1';

/**
 * Channel name `OHLCVService` emits for one subscription.
 * Shape: `ohlcv.v1.<assetId>.<interval>.<currency>`.
 *
 * @param assetId - CAIP-19 asset id.
 * @param interval - Candle bucket, such as `1m` or `15m`.
 * @param currency - Fiat code, such as `usd`.
 * @returns The WebSocket channel name.
 */
export function buildOhlcvChannel(
  assetId: string,
  interval: string,
  currency: string,
): string {
  return `${OHLCV_SUBSCRIPTION_NAMESPACE}.${assetId}.${interval}.${currency}`;
}

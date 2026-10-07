import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { Hex, CaipAssetType } from '@metamask/utils';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import type { OHLCVBar } from '../../Charts/AdvancedChart/AdvancedChart.types';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import type { TokenI } from '../../Tokens/types';
import type { RootState } from '../../../../reducers';

/** Lookback (in seconds) for each Performance cell. */
const FIVE_MINUTES_SECONDS = 5 * 60;
const FOUR_HOURS_SECONDS = 4 * 60 * 60;

/**
 * Interval used when pulling candles for the short-window cells. The spot-prices
 * API does not publish 5m / 4h percentages, so those cells are derived from
 * 1-minute OHLCV candles. `1d` is the smallest time period that covers a full
 * 4h lookback (plus the 5m cell).
 */
export const PERFORMANCE_CANDLE_INTERVAL = '1m';
export const PERFORMANCE_CANDLE_TIME_PERIOD = '1d';

/** Percent change values rendered by the Performance section. Null → gray dash. */
export interface TokenPerformance {
  fiveMinute: number | null;
  oneHour: number | null;
  fourHour: number | null;
  twentyFourHour: number | null;
}

export interface UseTokenPerformanceParams {
  token: TokenI;
  /** CAIP-19 asset id. Candles are skipped when absent. */
  assetId: CaipAssetType | null;
  currentCurrency: string;
}

const toFiniteOrNull = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Percent change over the last `lookbackSeconds` of 1-minute candles.
 * Reference price is the latest candle at or before the cutoff, so both prices
 * always come from the same series even when the feed lags `Date.now()`.
 */
export const computeCandlePercentChange = (
  candles: OHLCVBar[],
  lookbackSeconds: number,
): number | null => {
  if (candles.length < 2) {
    return null;
  }

  // Defensive: do not assume the API returns bars in ascending order.
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const latest = sorted[sorted.length - 1];
  const cutoff = latest.time - lookbackSeconds;

  let reference: OHLCVBar | undefined;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].time <= cutoff) {
      reference = sorted[i];
      break;
    }
  }

  if (!reference || reference.close <= 0 || latest.close <= 0) {
    return null;
  }

  return ((latest.close - reference.close) / reference.close) * 100;
};

/**
 * Performance percentages for the V1 Overview tab.
 *
 * - 1h / 24h: pre-computed by the spot-prices API (`TokenRatesController` market data).
 * - 5m / 4h: not published by spot-prices — derived from OHLCV 1-minute candles.
 *
 * Every cell degrades to `null` (rendered as a gray dash) when its source is
 * missing — unsupported asset, no candle coverage, or non-finite values.
 */
export const useTokenPerformance = ({
  token,
  assetId,
  currentCurrency,
}: UseTokenPerformanceParams): TokenPerformance => {
  const marketData = useSelector((state: RootState) => {
    const chainId = token.chainId as Hex | undefined;
    const address = token.address as Hex | undefined;
    if (!chainId || !address) {
      return undefined;
    }
    return selectTokenMarketData(state)?.[chainId]?.[address];
  });

  const { ohlcvData } = useOHLCVChart({
    assetId: assetId ?? '',
    timePeriod: PERFORMANCE_CANDLE_TIME_PERIOD,
    interval: PERFORMANCE_CANDLE_INTERVAL,
    vsCurrency: currentCurrency,
  });

  return useMemo(
    () => ({
      fiveMinute: computeCandlePercentChange(ohlcvData, FIVE_MINUTES_SECONDS),
      oneHour: toFiniteOrNull(marketData?.pricePercentChange1h),
      fourHour: computeCandlePercentChange(ohlcvData, FOUR_HOURS_SECONDS),
      twentyFourHour: toFiniteOrNull(marketData?.pricePercentChange1d),
    }),
    [
      marketData?.pricePercentChange1h,
      marketData?.pricePercentChange1d,
      ohlcvData,
    ],
  );
};

export default useTokenPerformance;

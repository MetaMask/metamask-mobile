import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CandlePeriod, TimeDuration } from '@metamask/perps-controller';
import {
  INTERVAL_MS,
  usePerpsAdvancedChartAdapter,
  type UsePerpsAdvancedChartAdapterResult,
} from '../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter';
import type {
  OHLCVBar,
  FetchOlderBarsRequest,
  FetchOlderBarsResponse,
} from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';

export interface UseSocialPerpsChartAdapterOptions {
  symbol: string;
  interval: CandlePeriod;
  visibleCandleCount: number;
  paginationDuration?: TimeDuration;
}

/**
 * Social Leaderboard wrapper around `usePerpsAdvancedChartAdapter`.
 *
 * Adds Social Trading behavior on top of the shared Perps chart adapter
 * without leaking those concerns into prod Perps:
 * - Accumulates older bars from `handleFetchOlderBarsRequest` so React-side
 * ohlcvData includes expanded history for tap-to-focus.
 * - Stabilises ohlcvSeriesKey and viewport during interval transitions so
 * the WebView does not briefly frame old bars with the new interval spacing.
 *
 * Base Perps behavior is unchanged; the shared adapter continues to expose
 * exactly the semantics described in its own docblock.
 */
export function useSocialPerpsChartAdapter({
  symbol,
  interval,
  visibleCandleCount,
  paginationDuration,
}: UseSocialPerpsChartAdapterOptions): UsePerpsAdvancedChartAdapterResult {
  const base = usePerpsAdvancedChartAdapter({
    symbol,
    interval,
    visibleCandleCount,
    paginationDuration,
  });

  /**
   * Older bars accumulated via pagination for the current (symbol, interval).
   * Cleared when either dimension changes, or when the base adapter wipes its
   * series (cache invalidation / empty candle payload).
   */
  const [historicalBars, setHistoricalBars] = useState<OHLCVBar[]>([]);
  const historyGenerationRef = useRef(0);

  const clearHistoricalBars = () => {
    historyGenerationRef.current += 1;
    setHistoricalBars([]);
  };

  useEffect(() => {
    clearHistoricalBars();
  }, [symbol, interval]);

  useEffect(() => {
    if (base.ohlcvData.length === 0) {
      clearHistoricalBars();
    }
  }, [base.ohlcvData]);

  /**
   * Interval whose bars are actually on screen. Only advances to the newly
   * requested `interval` once base ohlcvData has changed (i.e. new bars for
   * the new interval have arrived). Prevents viewport math from mixing old
   * bars with a new intervalMs during interval refresh.
   */
  const [appliedInterval, setAppliedInterval] =
    useState<CandlePeriod>(interval);
  const lastSeenOhlcvRef = useRef(base.ohlcvData);
  useEffect(() => {
    if (
      base.ohlcvData !== lastSeenOhlcvRef.current &&
      base.ohlcvData.length > 0
    ) {
      lastSeenOhlcvRef.current = base.ohlcvData;
      setAppliedInterval(interval);
    }
  }, [base.ohlcvData, interval]);

  /**
   * Merge accumulated older bars with the base adapter's ohlcvData.
   * Deduplicates by `time` and returns bars sorted ascending by time.
   */
  const ohlcvData = useMemo<OHLCVBar[]>(() => {
    if (historicalBars.length === 0) return base.ohlcvData;
    const byTime = new Map<number, OHLCVBar>();
    for (const bar of historicalBars) byTime.set(bar.time, bar);
    for (const bar of base.ohlcvData) byTime.set(bar.time, bar);
    return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
  }, [historicalBars, base.ohlcvData]);

  /**
   * Hold the base callback in a ref so this wrapper's `handleFetchOlderBarsRequest`
   * keeps a stable identity across renders. The base adapter returns a new
   * object every render, so depending on `base` (or `base.handleFetchOlderBarsRequest`)
   * here would retrigger any consumer effect that lists this callback in its
   * deps on every unrelated re-render (e.g. realtime candle ticks), which for
   * `TraderPerpAdvancedChart` would cause repeat pagination while a trade
   * focus is still waiting on older history.
   */
  const baseFetchOlderBarsRef = useRef(base.handleFetchOlderBarsRequest);
  baseFetchOlderBarsRef.current = base.handleFetchOlderBarsRequest;

  const handleFetchOlderBarsRequest = useCallback(
    async (req: FetchOlderBarsRequest): Promise<FetchOlderBarsResponse> => {
      const generation = historyGenerationRef.current;
      const response = await baseFetchOlderBarsRef.current(req);
      if (
        historyGenerationRef.current === generation &&
        response.bars.length > 0
      ) {
        setHistoricalBars((prev) => {
          if (prev.length === 0) return response.bars;
          const byTime = new Map<number, OHLCVBar>();
          for (const bar of prev) byTime.set(bar.time, bar);
          for (const bar of response.bars) byTime.set(bar.time, bar);
          return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
        });
      }
      return response;
    },
    [],
  );

  const ohlcvSeriesKey = useMemo(() => {
    // Preserve the base adapter's cache-generation suffix so consumers still
    // rebind on cache invalidation, but replace the interval segment with
    // `appliedInterval` to keep the key stable during interval transitions.
    const parts = base.ohlcvSeriesKey.split('|');
    parts[1] = appliedInterval as unknown as string;
    return parts.join('|');
  }, [base.ohlcvSeriesKey, appliedInterval]);

  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;
  const intervalMs = INTERVAL_MS[appliedInterval as unknown as string];
  const visibleToMs = lastBarTime;
  const visibleFromMs = useMemo(() => {
    if (lastBarTime == null || intervalMs == null) return undefined;
    return lastBarTime - intervalMs * visibleCandleCount;
  }, [lastBarTime, intervalMs, visibleCandleCount]);

  const latestBar = base.realtimeBar ?? ohlcvData[ohlcvData.length - 1];

  return {
    ohlcvData,
    realtimeBar: base.realtimeBar,
    latestBar,
    ohlcvSeriesKey,
    visibleFromMs,
    visibleToMs,
    isLoading: base.isLoading,
    handleFetchOlderBarsRequest,
  };
}

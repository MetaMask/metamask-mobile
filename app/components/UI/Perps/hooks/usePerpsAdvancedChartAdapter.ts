import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
} from '@metamask/perps-controller';
import { usePerpsStream } from '../providers/PerpsStreamManager';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  OHLCVBar,
  FetchOlderBarsRequest,
  FetchOlderBarsResponse,
} from '../../Charts/AdvancedChart/AdvancedChart.types';

/** Maps Perps CandlePeriod strings to milliseconds for visibleFromMs calculation. */
export const INTERVAL_MS: Partial<Record<string, number>> = {
  '1m': 60_000,
  '3m': 3 * 60_000,
  '5m': 5 * 60_000,
  '15m': 15 * 60_000,
  '30m': 30 * 60_000,
  '1h': 60 * 60_000,
  '2h': 2 * 60 * 60_000,
  '4h': 4 * 60 * 60_000,
  '8h': 8 * 60 * 60_000,
  '12h': 12 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '3d': 3 * 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
};

export const PREWARM_CANDLE_PERIODS = [
  CandlePeriod.OneMinute,
  CandlePeriod.ThreeMinutes,
  CandlePeriod.FiveMinutes,
  CandlePeriod.FifteenMinutes,
  CandlePeriod.OneHour,
  CandlePeriod.FourHours,
  CandlePeriod.OneDay,
  CandlePeriod.OneWeek,
] as const;

/**
 * Converts Perps CandleData candles (string-typed OHLCV) to OHLCVBar[].
 * Drops any bar whose numeric fields are non-finite after parsing.
 * Exported for unit testing.
 */
export function convertCandlesToOHLCVBars(
  candles: CandleData['candles'],
): OHLCVBar[] {
  return candles.reduce<OHLCVBar[]>((acc, c) => {
    const open = Number(c.open);
    const high = Number(c.high);
    const low = Number(c.low);
    const close = Number(c.close);
    const volume = Number(c.volume ?? 0);
    if (
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close) ||
      !Number.isFinite(volume)
    ) {
      return acc;
    }
    acc.push({ time: c.time, open, high, low, close, volume });
    return acc;
  }, []);
}

export interface UsePerpsAdvancedChartAdapterOptions {
  symbol: string;
  interval: CandlePeriod;
  visibleCandleCount: number;
  paginationDuration?: TimeDuration;
}

export interface UsePerpsAdvancedChartAdapterResult {
  ohlcvData: OHLCVBar[];
  realtimeBar: OHLCVBar | undefined;
  latestBar: OHLCVBar | undefined;
  ohlcvSeriesKey: string;
  visibleFromMs: number | undefined;
  visibleToMs: number | undefined;
  isLoading: boolean;
  handleFetchOlderBarsRequest: (
    req: FetchOlderBarsRequest,
  ) => Promise<FetchOlderBarsResponse>;
}

/**
 * Adapter hook that bridges the Perps CandleStreamChannel to the shared AdvancedChart.
 *
 * Correctly follows the Advanced Charts split:
 * - Full ohlcvData is set only on first data, symbol change, or interval change.
 * - realtimeBar is set only when the latest candle tick changes (OHLC or new candle).
 * - Historical older bars are fetched via handleFetchOlderBarsRequest (RN-backed path).
 */
export function usePerpsAdvancedChartAdapter({
  symbol,
  interval,
  visibleCandleCount,
  paginationDuration = TimeDuration.OneWeek,
}: UsePerpsAdvancedChartAdapterOptions): UsePerpsAdvancedChartAdapterResult {
  const stream = usePerpsStream();

  const [ohlcvData, setOhlcvData] = useState<OHLCVBar[]>([]);
  const [realtimeBar, setRealtimeBar] = useState<OHLCVBar | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);

  /** Always reflects the most recently received CandleData (unthrottled). */
  const latestCandleDataRef = useRef<CandleData | null>(null);
  /** Last bar emitted — used to detect ticks vs full loads. */
  const prevLastBarRef = useRef<OHLCVBar | null>(null);
  /** Cleared once the first delivery (or an error) lands, so the skeleton never hangs. */
  const hasReceivedFirstUpdateRef = useRef(false);
  /** True once this chart has rendered at least one valid candle batch. */
  const hasLoadedBarsRef = useRef(false);
  const previousSymbolRef = useRef<string | null>(null);

  useEffect(() => {
    if (!symbol || typeof stream.candles.prewarmCandles !== 'function') {
      return;
    }

    PREWARM_CANDLE_PERIODS.forEach((period) => {
      stream.candles
        .prewarmCandles(symbol, period, TimeDuration.OneWeek)
        .catch((error: unknown) => {
          DevLogger.log('usePerpsAdvancedChartAdapter: prewarm failed', {
            symbol,
            interval: period as string,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    });
  }, [symbol, stream]);

  useEffect(() => {
    const isIntervalRefresh =
      previousSymbolRef.current === symbol && hasLoadedBarsRef.current;
    previousSymbolRef.current = symbol;

    // Reset on symbol change; keep the existing chart visible during interval refresh.
    setIsLoading(!isIntervalRefresh);
    if (!isIntervalRefresh) {
      setOhlcvData([]);
      hasLoadedBarsRef.current = false;
    }
    setRealtimeBar(undefined);
    prevLastBarRef.current = null;
    latestCandleDataRef.current = null;
    hasReceivedFirstUpdateRef.current = false;

    const unsubscribe = stream.candles.subscribe({
      symbol,
      interval,
      duration: TimeDuration.OneWeek,
      callback: (candleData: CandleData) => {
        // Reject stale deliveries from a previous symbol/interval subscription.
        if (
          candleData.symbol !== symbol ||
          candleData.interval !== (interval as string)
        ) {
          return;
        }

        latestCandleDataRef.current = candleData;

        const converted = convertCandlesToOHLCVBars(candleData.candles);

        // Clear the skeleton on the first delivery for this subscription, even if the
        // frame is empty (matches usePerpsLiveCandles). Otherwise an empty initial frame
        // leaves the loading overlay up indefinitely.
        if (!hasReceivedFirstUpdateRef.current) {
          hasReceivedFirstUpdateRef.current = true;
          setIsLoading(false);
        }

        if (converted.length === 0) return;

        const lastBar = converted[converted.length - 1];
        const prev = prevLastBarRef.current;

        if (prev === null) {
          // First data for this symbol+interval — send full dataset.
          setOhlcvData(converted);
          hasLoadedBarsRef.current = true;
          // realtimeBar stays undefined; AdvancedChart uses ohlcvData for initial render.
        } else if (
          lastBar.time !== prev.time ||
          lastBar.close !== prev.close ||
          lastBar.high !== prev.high ||
          lastBar.low !== prev.low ||
          lastBar.volume !== prev.volume
        ) {
          // Tick update: only the last candle changed — emit realtimeBar only.
          // Do NOT update ohlcvData; that would cause a full WebView data replacement.
          setRealtimeBar(lastBar);
        }
        // If nothing changed (e.g. throttle burst with same values), skip update.

        prevLastBarRef.current = lastBar;
      },
      onError: (err: Error) => {
        // Surface the error by clearing the skeleton so the chart never hangs on a
        // subscription failure (e.g. a cold first load before the WS is established).
        // A transient candle error should not tear down the WebView chart, so we do
        // not trigger the Lightweight fallback here.
        setIsLoading(false);
        DevLogger.log(
          'usePerpsAdvancedChartAdapter: candle subscription error',
          { symbol, interval: interval as string, error: err?.message },
        );
      },
    });

    return unsubscribe;
  }, [symbol, interval, stream]);

  const ohlcvSeriesKey = useMemo(
    () => `${symbol}|${interval}`,
    [symbol, interval],
  );

  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;
  const intervalMs = INTERVAL_MS[interval as string];

  const visibleToMs = lastBarTime;
  const visibleFromMs = useMemo(() => {
    if (lastBarTime == null || intervalMs == null) return undefined;
    return lastBarTime - intervalMs * visibleCandleCount;
  }, [lastBarTime, intervalMs, visibleCandleCount]);

  const handleFetchOlderBarsRequest = useCallback(
    async (req: FetchOlderBarsRequest): Promise<FetchOlderBarsResponse> => {
      try {
        await stream.candles.fetchHistoricalCandles(
          symbol,
          interval,
          paginationDuration,
        );
        // fetchHistoricalCandles notifies subscribers synchronously before resolving,
        // so latestCandleDataRef.current is up to date after the await.
        const current = latestCandleDataRef.current;
        if (!current) {
          throw new Error('no candle data after fetch');
        }
        const allBars = convertCandlesToOHLCVBars(current.candles);
        const olderBars = allBars.filter(
          (b) => b.time < req.oldestLoadedTimeMs,
        );
        return {
          requestId: req.requestId,
          seriesGeneration: req.seriesGeneration,
          bars: olderBars,
          noData: olderBars.length === 0,
        };
      } catch (err) {
        return {
          requestId: req.requestId,
          seriesGeneration: req.seriesGeneration,
          bars: [],
          noData: true,
          error: String(err),
        };
      }
    },
    [symbol, interval, paginationDuration, stream],
  );

  const latestBar = realtimeBar ?? ohlcvData[ohlcvData.length - 1];

  return {
    ohlcvData,
    realtimeBar,
    latestBar,
    ohlcvSeriesKey,
    visibleFromMs,
    visibleToMs,
    isLoading,
    handleFetchOlderBarsRequest,
  };
}

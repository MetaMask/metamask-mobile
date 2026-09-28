import type { Trade } from '@metamask/social-controllers';
import {
  CandlePeriod,
  TimeDuration,
  type CandlePeriod as CandlePeriodType,
} from '@metamask/perps-controller';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  CHART_DATA_THRESHOLD,
  TOKEN_OVERVIEW_CHART_HEIGHT,
} from '../../../../UI/AssetOverview/Price/tokenOverviewChart.constants';
import AdvancedChart from '../../../../UI/Charts/AdvancedChart/AdvancedChart';
import {
  ChartType,
  type AdvancedChartRef,
  type CrosshairData,
  type FetchOlderBarsRequest,
  type IndicatorType,
  type OHLCVBar,
  type TradeMarker,
} from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';
import {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../../../UI/Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../../../UI/Charts/AdvancedChart/useOHLCVChart';
import { PERPS_CHART_CONFIG } from '../../../../UI/Perps/constants/chartConfig';
import { INTERVAL_MS } from '../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter';
import { useSocialPerpsChartAdapter } from '../hooks/useSocialPerpsChartAdapter';
import { getPerpsVolumeColors } from '../../../../UI/Perps/utils/chartColors';
import { useTheme } from '../../../../../util/theme';
import { tradeTimestampToMs } from '../../utils/tradeTimestamp';
import type { TimePeriod } from '../useTraderPositionData';
import TraderPriceChart from './TraderPriceChart';

const EMPTY_INDICATORS: IndicatorType[] = [];
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const VISIBLE_CANDLE_COUNT = PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT;

const TRADE_FOCUS_PERIOD_ORDER: readonly TimePeriod[] = [
  '1H',
  '1D',
  '1W',
  '1M',
  'All',
];

const TRADE_FOCUS_SPAN_MS: Record<TimePeriod, number> = {
  '1H': HOUR_MS,
  '1D': DAY_MS,
  '1W': 7 * DAY_MS,
  '1M': MONTH_MS,
  All: 365 * DAY_MS,
};

/**
 * Maps the Social Trading period selector (which includes `All`) onto the
 * AdvancedChart's OHLCV time ranges. `All` collapses to `1Y` — the widest
 * range the OHLCV feed exposes.
 */
const SOCIAL_PERIOD_TO_TIME_RANGE: Record<TimePeriod, TimeRange> = {
  '1H': '1H',
  '1D': '1D',
  '1W': '1W',
  '1M': '1M',
  All: '1Y',
};

/**
 * Social Trading data is entirely USD-denominated (cost basis, PnL, market cap,
 * and per-trade `usdCost`). Trade markers anchor to the USD close-price line
 * (with `usdCost / tokenAmount` as a USD fallback), so the OHLCV candles MUST be
 * fetched in USD too — otherwise the price axis (e.g. JPY) and the markers use
 * different scales and the circles render off-screen. We intentionally ignore
 * the user's display currency here, unlike Token Details.
 */
const CHART_VS_CURRENCY = 'usd';

export function getTradeFocusSpanMs(period: TimePeriod): number {
  return TRADE_FOCUS_SPAN_MS[period];
}

export function getPerpTradeFocusSpanMs(
  candlePeriod: CandlePeriodType,
  visibleCandleCount: number = VISIBLE_CANDLE_COUNT,
): number {
  const intervalMs = INTERVAL_MS[candlePeriod as string];
  if (!intervalMs) return TRADE_FOCUS_SPAN_MS['1D'];
  return intervalMs * visibleCandleCount;
}

/** Coarser candle periods used when the current interval has no history for a trade. */
const PERP_FOCUS_CANDLE_PERIOD_ORDER: readonly CandlePeriodType[] = [
  CandlePeriod.OneMinute,
  CandlePeriod.ThreeMinutes,
  CandlePeriod.FiveMinutes,
  CandlePeriod.FifteenMinutes,
  CandlePeriod.OneHour,
  CandlePeriod.FourHours,
  CandlePeriod.OneDay,
  CandlePeriod.OneWeek,
  CandlePeriod.OneMonth,
];

export function getNextWiderPerpCandlePeriod(
  candlePeriod: CandlePeriodType,
): CandlePeriodType | null {
  const currentMs = INTERVAL_MS[candlePeriod as string] ?? 0;
  return (
    PERP_FOCUS_CANDLE_PERIOD_ORDER.find((period) => {
      const periodMs = INTERVAL_MS[period as string];
      return periodMs != null && periodMs > currentMs;
    }) ?? null
  );
}

export function getRecommendedTradeFocusPeriod(
  timestamp: number,
  _isPerp: boolean,
  nowMs: number = Date.now(),
): TimePeriod {
  const tradeTime = tradeTimestampToMs(timestamp);
  const ageMs = Number.isFinite(tradeTime)
    ? Math.max(0, nowMs - tradeTime)
    : Number.POSITIVE_INFINITY;

  if (ageMs <= HOUR_MS) return '1H';
  if (ageMs <= DAY_MS) return '1D';
  if (ageMs <= 7 * DAY_MS) return '1W';
  return ageMs <= MONTH_MS ? '1M' : 'All';
}

function getNextWiderTradeFocusPeriod(period: TimePeriod): TimePeriod | null {
  const index = TRADE_FOCUS_PERIOD_ORDER.indexOf(period);
  return index >= 0 ? (TRADE_FOCUS_PERIOD_ORDER[index + 1] ?? null) : null;
}

function getFallbackTradeFocusPeriod(
  currentPeriod: TimePeriod,
): TimePeriod | null {
  if (currentPeriod === 'All') return null;
  return getNextWiderTradeFocusPeriod(currentPeriod);
}

/**
 * Builds {@link TradeMarker}s (open/close circles) from trades.
 *
 * No price is set — the WebView snaps each marker's Y onto the rendered
 * close-price line via its own `interpolateCloseAlongLineAtTimeMs`. Markers
 * whose candle hasn't loaded yet are skipped and drawn once pagination brings
 * that range in. Trades with a zero token amount are dropped.
 */
export function mapTradesToAdvancedMarkers(
  trades: readonly Trade[],
): TradeMarker[] {
  const markers: TradeMarker[] = [];
  for (const trade of trades) {
    if (!trade.tokenAmount) continue;
    markers.push({
      time: tradeTimestampToMs(trade.timestamp),
      intent: trade.intent,
      id: trade.transactionHash,
    });
  }
  return markers;
}

function getMarkerTimeRange(markers: readonly TradeMarker[]): {
  min: number;
  max: number;
  center: number;
} | null {
  if (!markers.length) return null;

  let min = Infinity;
  let max = -Infinity;

  for (const marker of markers) {
    if (!Number.isFinite(marker.time)) continue;
    min = Math.min(min, marker.time);
    max = Math.max(max, marker.time);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return {
    min,
    max,
    center: (min + max) / 2,
  };
}

function ohlcvDataCoversMarkerRange(
  ohlcvData: readonly OHLCVBar[],
  markerRange: { min: number; max: number },
): boolean {
  const firstBarTime = ohlcvData[0]?.time;
  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;
  return Boolean(
    firstBarTime != null &&
      lastBarTime != null &&
      markerRange.min >= firstBarTime &&
      markerRange.max <= lastBarTime,
  );
}

function isSpotPeriodLoaded(spot: ReturnType<typeof useOHLCVChart>): boolean {
  return !spot.isLoading && !spot.error;
}

function ohlcvBarsToTokenPrices(bars: readonly OHLCVBar[]): TokenPrice[] {
  return bars.map((bar) => [String(bar.time), bar.close]);
}

function getBarsInVisibleWindow(
  ohlcvData: readonly OHLCVBar[],
  visibleFromMs: number | undefined,
): readonly OHLCVBar[] {
  if (!ohlcvData.length) return ohlcvData;
  if (visibleFromMs == null) return ohlcvData;
  return ohlcvData.filter((bar) => bar.time >= visibleFromMs);
}

function getVisibleWindowComparePrice(
  ohlcvData: readonly OHLCVBar[],
  visibleFromMs: number | undefined,
): number | null {
  const windowBars = getBarsInVisibleWindow(ohlcvData, visibleFromMs);
  if (!windowBars.length) return null;
  return windowBars[0].close;
}

function buildPerpOlderBarsRequest({
  perpSymbol,
  selectedCandlePeriod,
  focusNonce,
  tradeTimeMs,
  oldestLoadedTimeMs,
}: {
  perpSymbol: string;
  selectedCandlePeriod: CandlePeriodType;
  focusNonce: number;
  tradeTimeMs: number;
  oldestLoadedTimeMs: number;
}): FetchOlderBarsRequest {
  return {
    requestId: `focus-${focusNonce}`,
    seriesGeneration: focusNonce,
    symbol: perpSymbol,
    resolution: selectedCandlePeriod,
    fromSec: Math.floor(tradeTimeMs / 1000),
    toSec: Math.floor(oldestLoadedTimeMs / 1000),
    oldestLoadedTimeMs,
  };
}

function computeViewportRange({
  ohlcvData,
  durationMs,
  allTradeTimeRange,
  framingMarkers,
  canPaginateOlder,
}: {
  ohlcvData: readonly OHLCVBar[];
  durationMs: number;
  allTradeTimeRange: { min: number; max: number } | null;
  framingMarkers: readonly TradeMarker[];
  canPaginateOlder: boolean;
}): { visibleFromMs: number | undefined; visibleToMs: number | undefined } {
  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;
  if (lastBarTime == null || !ohlcvData.length) {
    return { visibleFromMs: undefined, visibleToMs: undefined };
  }

  const firstBarTime = ohlcvData[0].time;
  let from: number;
  let to: number;

  if (allTradeTimeRange) {
    const { min: minT, max: maxT } = allTradeTimeRange;
    const pad = Math.max(maxT - minT, durationMs * 0.5) * 0.2;
    from = minT - pad;
    to = maxT + pad;
  } else if (framingMarkers.length) {
    const times = framingMarkers.map((m) => m.time);
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const pad = Math.max(maxT - minT, durationMs * 0.5) * 0.2;
    from = minT - pad;
    to = maxT + pad;
    if (to - from < durationMs) {
      const center = (from + to) / 2;
      from = center - durationMs / 2;
      to = center + durationMs / 2;
    }
  } else {
    to = lastBarTime;
    from = lastBarTime - durationMs;
  }

  return {
    visibleFromMs:
      allTradeTimeRange && canPaginateOlder
        ? from
        : Math.max(from, firstBarTime),
    visibleToMs: Math.min(to, lastBarTime),
  };
}

/**
 * A request to slide the chart to a trade and pulse its marker. `timestamp` is
 * the trade's timestamp (seconds or ms — normalized here); `id` is its
 * `transactionHash` (matches the marker id); `nonce` changes on every tap so
 * re-tapping the same trade re-centers and re-pulses it.
 */
export interface TradeFocusRequest {
  id: string;
  timestamp: number;
  nonce: number;
  spanMs: number;
}

export interface PerpMetrics {
  percentChange: number | undefined;
  currentPrice: number | undefined;
}

export interface TraderAdvancedChartProps {
  /**
   * CAIP-19 asset id for the spot token (drives the spot OHLCV feed). Omitted for
   * Hyperliquid perps, which have no CAIP id — set {@link TraderAdvancedChartProps.isPerp}
   * instead and the chart renders from the perps stream adapter.
   */
  assetId?: string;
  /** Hyperliquid perp position — chart data comes from the perps stream adapter. */
  isPerp?: boolean;
  /** Raw Hyperliquid perp symbol from the position (may include HIP-3 prefix). */
  perpSymbol?: string;
  /** Active perp candle period (perps only). */
  selectedCandlePeriod?: CandlePeriodType;
  /** Social Trading period selection (`1H`..`All`) — spot only. */
  activeTimePeriod: TimePeriod;
  /** Allow automatic period widening when the current interval lacks trade-date candles. */
  shouldAutoRequestTimePeriod?: boolean;
  /** Line vs candlestick rendering. */
  chartType: ChartType;
  /** Trades to render as open/close circles. */
  trades: readonly Trade[];
  /** When set, the chart slides to center this trade's time (see {@link TradeFocusRequest}). */
  focusRequest?: TradeFocusRequest;
  /** Request a wider period when the focused trade is older than loaded chart data (spot). */
  onRequestTimePeriod?: (period: TimePeriod) => void;
  /** Request a coarser candle period when the focused trade has no history on the current interval (perps). */
  onRequestCandlePeriod?: (period: CandlePeriodType) => void;
  /**
   * Price history for the spot fallback chart when OHLCV coverage is sparse.
   * Unused on the perp primary path (derived from adapter data on fallback).
   */
  historicalPrices: TokenPrice[];
  priceDiff: number;
  isPricesLoading: boolean;
  /** Scrub handler for the fallback (legacy) chart. */
  onChartIndexChange: (index: number) => void;
  /**
   * Reports the % change at the crosshair point (vs the visible-range start)
   * while scrubbing the TradingView chart, or null when the crosshair leaves.
   */
  onScrubPercentChange?: (percent: number | null) => void;
  /** Publishes header % change and latest price for perp positions. */
  onPerpMetricsChange?: (metrics: PerpMetrics) => void;
  /** Fired when the user taps a trade circle on the chart (the marker's trade id). */
  onTradeMarkerPress?: (id: string) => void;
  /**
   * Reports whether the AdvancedChart (which honors `chartType`) is the
   * active surface. False when this component falls back to TraderPriceChart.
   */
  onSupportsChartTypeChange?: (supported: boolean) => void;
  chartHeight?: number;
  /**
   * When true, the chart surface stops capturing touches so drags fall through to
   * the scrolling list behind a pinned-overlay chart (Trader Position layout).
   */
  scrollPassthrough?: boolean;
}

type SharedChartProps = Pick<
  TraderAdvancedChartProps,
  | 'trades'
  | 'focusRequest'
  | 'chartType'
  | 'onChartIndexChange'
  | 'onScrubPercentChange'
  | 'onTradeMarkerPress'
  | 'onSupportsChartTypeChange'
  | 'chartHeight'
  | 'scrollPassthrough'
>;

function useNotifyChartTypeSupported(
  supported: boolean,
  onSupportsChartTypeChange?: (supported: boolean) => void,
) {
  useLayoutEffect(() => {
    onSupportsChartTypeChange?.(supported);
  }, [supported, onSupportsChartTypeChange]);
}

const TraderPerpAdvancedChart = ({
  perpSymbol,
  selectedCandlePeriod,
  trades,
  focusRequest,
  chartType,
  onChartIndexChange,
  onScrubPercentChange,
  onPerpMetricsChange,
  onRequestCandlePeriod,
  onTradeMarkerPress,
  onSupportsChartTypeChange,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
  scrollPassthrough = false,
}: SharedChartProps & {
  perpSymbol: string;
  selectedCandlePeriod: CandlePeriodType;
  onPerpMetricsChange?: (metrics: PerpMetrics) => void;
  onRequestCandlePeriod?: (period: CandlePeriodType) => void;
}) => {
  const { colors } = useTheme();
  const vsCurrency = CHART_VS_CURRENCY;
  const chartRef = useRef<AdvancedChartRef>(null);
  const handledFocusNonceRef = useRef<number | null>(null);
  const paginationInFlightRef = useRef(false);
  const historyLayoutPendingRef = useRef(false);
  const focusRequestRef = useRef(focusRequest);
  focusRequestRef.current = focusRequest;
  const selectedCandlePeriodRef = useRef(selectedCandlePeriod);
  selectedCandlePeriodRef.current = selectedCandlePeriod;
  const [paginationEpoch, setPaginationEpoch] = useState(0);
  const pendingFocusAfterSettleRef = useRef<{
    tradeTime: number;
    request: TradeFocusRequest;
  } | null>(null);

  const volumeColors = useMemo(() => getPerpsVolumeColors(colors), [colors]);

  const {
    ohlcvData,
    realtimeBar,
    latestBar,
    ohlcvSeriesKey,
    visibleFromMs,
    visibleToMs,
    isLoading: chartLoading,
    handleFetchOlderBarsRequest,
  } = useSocialPerpsChartAdapter({
    symbol: perpSymbol,
    interval: selectedCandlePeriod,
    visibleCandleCount: VISIBLE_CANDLE_COUNT,
    paginationDuration: TimeDuration.YearToDate,
  });

  const webViewInstanceKey = `perp|${perpSymbol}|${vsCurrency}`;

  const [hasChartBeenRevealed, setHasChartBeenRevealed] = useState(false);
  useEffect(() => {
    setHasChartBeenRevealed(false);
  }, [webViewInstanceKey]);
  const handleSkeletonHidden = useCallback(() => {
    setHasChartBeenRevealed(true);
  }, []);

  const tradeMarkers = useMemo(
    () => mapTradesToAdvancedMarkers(trades),
    [trades],
  );

  const visibleWindowBars = useMemo(
    () => getBarsInVisibleWindow(ohlcvData, visibleFromMs),
    [ohlcvData, visibleFromMs],
  );

  const comparePrice = useMemo(
    () => getVisibleWindowComparePrice(ohlcvData, visibleFromMs),
    [ohlcvData, visibleFromMs],
  );

  const handleCrosshairMove = useCallback(
    (data: CrosshairData | null) => {
      if (!onScrubPercentChange) return;
      if (!data || comparePrice == null || comparePrice === 0) {
        onScrubPercentChange(null);
        return;
      }
      onScrubPercentChange(((data.close - comparePrice) / comparePrice) * 100);
    },
    [onScrubPercentChange, comparePrice],
  );

  useEffect(() => {
    if (!onPerpMetricsChange) return;
    const lastClose = latestBar?.close;
    if (visibleWindowBars.length < 2) {
      onPerpMetricsChange({
        percentChange: undefined,
        currentPrice: lastClose,
      });
      return;
    }
    const firstClose = visibleWindowBars[0].close;
    const percentChange =
      firstClose !== 0 && lastClose != null
        ? ((lastClose - firstClose) / firstClose) * 100
        : undefined;
    onPerpMetricsChange({ percentChange, currentPrice: lastClose });
  }, [visibleWindowBars, latestBar, onPerpMetricsChange]);

  const fallbackPrices = useMemo(
    () => ohlcvBarsToTokenPrices(visibleWindowBars),
    [visibleWindowBars],
  );
  const fallbackPriceDiff = useMemo(() => {
    if (fallbackPrices.length < 2) return 0;
    return fallbackPrices[fallbackPrices.length - 1][1] - fallbackPrices[0][1];
  }, [fallbackPrices]);

  const shouldFallback =
    !chartLoading &&
    (ohlcvData.length < CHART_DATA_THRESHOLD || ohlcvData.length === 0);

  useNotifyChartTypeSupported(!shouldFallback, onSupportsChartTypeChange);

  const focusTradeOnChart = useCallback(
    (tradeTime: number, request: TradeFocusRequest): boolean => {
      const chart = chartRef.current;
      if (!chart) return false;
      chart.focusTime(tradeTime, {
        spanMs: request.spanMs ?? getPerpTradeFocusSpanMs(selectedCandlePeriod),
      });
      chart.pulseTradeMarker(request.id);
      handledFocusNonceRef.current = request.nonce;
      return true;
    },
    [selectedCandlePeriod],
  );

  const handleChartLayoutSettled = useCallback(() => {
    historyLayoutPendingRef.current = false;
    const pending = pendingFocusAfterSettleRef.current;
    if (!pending) return;
    if (focusRequest?.nonce !== pending.request.nonce) {
      pendingFocusAfterSettleRef.current = null;
      return;
    }
    if (focusTradeOnChart(pending.tradeTime, pending.request)) {
      pendingFocusAfterSettleRef.current = null;
    }
  }, [focusRequest, focusTradeOnChart]);

  useEffect(() => {
    if (!focusRequest || chartLoading || shouldFallback) return;
    if (handledFocusNonceRef.current === focusRequest.nonce) return;
    if (!ohlcvSeriesKey.includes(`|${selectedCandlePeriod}`)) return;

    const tradeTime = tradeTimestampToMs(focusRequest.timestamp);
    const firstBarTime = ohlcvData[0]?.time;
    const latestBarTime = ohlcvData[ohlcvData.length - 1]?.time;

    if (
      !Number.isFinite(tradeTime) ||
      firstBarTime == null ||
      latestBarTime == null
    ) {
      return;
    }

    if (tradeTime >= firstBarTime && tradeTime <= latestBarTime) {
      if (
        pendingFocusAfterSettleRef.current?.request.nonce === focusRequest.nonce
      ) {
        return;
      }
      if (historyLayoutPendingRef.current) {
        pendingFocusAfterSettleRef.current = {
          tradeTime,
          request: focusRequest,
        };
        return;
      }
      focusTradeOnChart(tradeTime, focusRequest);
      return;
    }

    if (tradeTime < firstBarTime) {
      if (paginationInFlightRef.current) {
        return;
      }
      paginationInFlightRef.current = true;
      const requestedNonce = focusRequest.nonce;
      const requestedPeriod = selectedCandlePeriod;
      handleFetchOlderBarsRequest(
        buildPerpOlderBarsRequest({
          perpSymbol,
          selectedCandlePeriod: requestedPeriod,
          focusNonce: requestedNonce,
          tradeTimeMs: tradeTime,
          oldestLoadedTimeMs: firstBarTime,
        }),
      )
        .then((response) => {
          // Period changes invalidate this fetch entirely. A newer focus nonce
          // on the same period still needs the layout-settle gate: SET_OHLCV_DATA
          // from prepended bars would otherwise race focusTime.
          if (selectedCandlePeriodRef.current !== requestedPeriod) {
            return;
          }
          if (!response.noData) {
            historyLayoutPendingRef.current = true;
          }
          if (focusRequestRef.current?.nonce !== requestedNonce) {
            return;
          }
          if (response.error) {
            handledFocusNonceRef.current = requestedNonce;
            return;
          }
          if (response.noData) {
            const widerPeriod = getNextWiderPerpCandlePeriod(requestedPeriod);
            if (widerPeriod && onRequestCandlePeriod) {
              onRequestCandlePeriod(widerPeriod);
              return;
            }
            handledFocusNonceRef.current = requestedNonce;
            return;
          }
          const expandedFirstTime = Math.min(
            firstBarTime,
            ...response.bars.map((bar) => bar.time),
          );
          if (tradeTime >= expandedFirstTime && tradeTime <= latestBarTime) {
            pendingFocusAfterSettleRef.current = {
              tradeTime,
              request: focusRequest,
            };
          }
        })
        .finally(() => {
          paginationInFlightRef.current = false;
          const latestNonce = focusRequestRef.current?.nonce;
          if (
            latestNonce != null &&
            latestNonce !== requestedNonce &&
            handledFocusNonceRef.current !== latestNonce
          ) {
            setPaginationEpoch((epoch) => epoch + 1);
          }
        });
      return;
    }

    handledFocusNonceRef.current = focusRequest.nonce;
  }, [
    chartLoading,
    focusRequest,
    focusTradeOnChart,
    handleFetchOlderBarsRequest,
    ohlcvData,
    ohlcvSeriesKey,
    onRequestCandlePeriod,
    paginationEpoch,
    perpSymbol,
    selectedCandlePeriod,
    shouldFallback,
  ]);

  const showVolume = chartType === ChartType.Candles;

  if (shouldFallback) {
    return (
      <TraderPriceChart
        prices={fallbackPrices}
        priceDiff={fallbackPriceDiff}
        isLoading={chartLoading}
        onChartIndexChange={onChartIndexChange}
        trades={trades}
        chartHeight={chartHeight}
        scrollPassthrough={scrollPassthrough}
      />
    );
  }

  return (
    <View style={{ height: chartHeight }} testID="trader-advanced-chart">
      <AdvancedChart
        ref={chartRef}
        scrollPassthrough={scrollPassthrough}
        ohlcvData={ohlcvData}
        ohlcvSeriesKey={ohlcvSeriesKey}
        webViewInstanceKey={webViewInstanceKey}
        realtimeBar={realtimeBar}
        height={chartHeight}
        chartType={chartType}
        showVolume={showVolume}
        hidePaneSeparator={showVolume}
        volumeOverlay={false}
        gridLineColorOverride={colors.border.muted}
        volumeSuccessColorOverride={volumeColors.success}
        volumeErrorColorOverride={volumeColors.error}
        indicators={EMPTY_INDICATORS}
        isLoading={!hasChartBeenRevealed && chartLoading}
        onSkeletonHidden={handleSkeletonHidden}
        onChartLayoutSettled={handleChartLayoutSettled}
        rnBackedPagination={{ enabled: true }}
        onFetchOlderBarsRequest={handleFetchOlderBarsRequest}
        visibleFromMs={visibleFromMs}
        visibleToMs={visibleToMs}
        tradeMarkers={tradeMarkers}
        onCrosshairMove={handleCrosshairMove}
        onTradeMarkerPress={onTradeMarkerPress}
      />
    </View>
  );
};

const TraderSpotAdvancedChart = ({
  assetId,
  activeTimePeriod,
  shouldAutoRequestTimePeriod = false,
  trades,
  focusRequest,
  onRequestTimePeriod,
  historicalPrices,
  priceDiff,
  isPricesLoading,
  chartType,
  onChartIndexChange,
  onScrubPercentChange,
  onTradeMarkerPress,
  onSupportsChartTypeChange,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
  scrollPassthrough = false,
}: SharedChartProps &
  Pick<
    TraderAdvancedChartProps,
    | 'assetId'
    | 'activeTimePeriod'
    | 'shouldAutoRequestTimePeriod'
    | 'onRequestTimePeriod'
    | 'historicalPrices'
    | 'priceDiff'
    | 'isPricesLoading'
  >) => {
  const vsCurrency = CHART_VS_CURRENCY;
  const chartRef = useRef<AdvancedChartRef>(null);
  const handledFocusNonceRef = useRef<number | null>(null);

  const timeRange = SOCIAL_PERIOD_TO_TIME_RANGE[activeTimePeriod];
  const config = TIME_RANGE_CONFIGS[timeRange];
  const hourConfig = TIME_RANGE_CONFIGS[SOCIAL_PERIOD_TO_TIME_RANGE['1H']];
  const dayConfig = TIME_RANGE_CONFIGS[SOCIAL_PERIOD_TO_TIME_RANGE['1D']];
  const weekConfig = TIME_RANGE_CONFIGS[SOCIAL_PERIOD_TO_TIME_RANGE['1W']];
  const monthConfig = TIME_RANGE_CONFIGS[SOCIAL_PERIOD_TO_TIME_RANGE['1M']];
  const allConfig = TIME_RANGE_CONFIGS[SOCIAL_PERIOD_TO_TIME_RANGE.All];

  const spotAssetId = assetId ?? '';
  const hourSpot = useOHLCVChart({
    assetId: spotAssetId,
    timePeriod: hourConfig.timePeriod,
    interval: hourConfig.interval,
    vsCurrency,
  });
  const daySpot = useOHLCVChart({
    assetId: spotAssetId,
    timePeriod: dayConfig.timePeriod,
    interval: dayConfig.interval,
    vsCurrency,
  });
  const weekSpot = useOHLCVChart({
    assetId: spotAssetId,
    timePeriod: weekConfig.timePeriod,
    interval: weekConfig.interval,
    vsCurrency,
  });
  const monthSpot = useOHLCVChart({
    assetId: spotAssetId,
    timePeriod: monthConfig.timePeriod,
    interval: monthConfig.interval,
    vsCurrency,
  });
  const allSpot = useOHLCVChart({
    assetId: spotAssetId,
    timePeriod: allConfig.timePeriod,
    interval: allConfig.interval,
    vsCurrency,
  });
  const spotByPeriod = useMemo(
    () => ({
      '1H': hourSpot,
      '1D': daySpot,
      '1W': weekSpot,
      '1M': monthSpot,
      All: allSpot,
    }),
    [hourSpot, daySpot, weekSpot, monthSpot, allSpot],
  );
  const spot = spotByPeriod[activeTimePeriod];

  const ohlcvData = spot.ohlcvData;
  const chartLoading = spot.isLoading;
  const chartError = spot.error;
  const hasEmptyData = spot.hasEmptyData;

  const ohlcvSeriesKey = `${assetId}|${config.timePeriod}|${config.interval ?? ''}|${vsCurrency}`;
  const webViewInstanceKey = `${assetId ?? 'spot'}|${vsCurrency}`;

  const [hasChartBeenRevealed, setHasChartBeenRevealed] = useState(false);
  useEffect(() => {
    setHasChartBeenRevealed(false);
  }, [webViewInstanceKey]);
  const handleSkeletonHidden = useCallback(() => {
    setHasChartBeenRevealed(true);
  }, []);

  const ohlcvPagination = useMemo(
    () => ({
      nextCursor: spot.nextCursor,
      hasMore: spot.hasMore,
      assetId: assetId ?? '',
      vsCurrency,
    }),
    [spot.nextCursor, spot.hasMore, assetId, vsCurrency],
  );

  const tradeMarkers = useMemo(
    () => mapTradesToAdvancedMarkers(trades),
    [trades],
  );
  const allTradeTimeRange = useMemo(
    () => getMarkerTimeRange(tradeMarkers),
    [tradeMarkers],
  );

  useEffect(() => {
    if (
      !shouldAutoRequestTimePeriod ||
      !onRequestTimePeriod ||
      !allTradeTimeRange
    ) {
      return;
    }

    const activeSpot = spotByPeriod[activeTimePeriod];
    if (!isSpotPeriodLoaded(activeSpot)) return;

    if (ohlcvDataCoversMarkerRange(activeSpot.ohlcvData, allTradeTimeRange)) {
      return;
    }

    const activeIndex = TRADE_FOCUS_PERIOD_ORDER.indexOf(activeTimePeriod);
    if (activeIndex < 0) return;

    for (const period of TRADE_FOCUS_PERIOD_ORDER.slice(activeIndex + 1)) {
      const candidateSpot = spotByPeriod[period];

      if (!isSpotPeriodLoaded(candidateSpot)) {
        return;
      }

      if (
        ohlcvDataCoversMarkerRange(candidateSpot.ohlcvData, allTradeTimeRange)
      ) {
        onRequestTimePeriod(period);
        return;
      }
    }
  }, [
    activeTimePeriod,
    allTradeTimeRange,
    onRequestTimePeriod,
    shouldAutoRequestTimePeriod,
    spotByPeriod,
  ]);

  const framingMarkers = useMemo(() => {
    if (!ohlcvData.length) return tradeMarkers;
    const firstTime = ohlcvData[0].time;
    const lastTime = ohlcvData[ohlcvData.length - 1].time;
    return tradeMarkers.filter(
      (m) => m.time >= firstTime && m.time <= lastTime,
    );
  }, [tradeMarkers, ohlcvData]);

  const { visibleFromMs, visibleToMs } = useMemo(
    () =>
      computeViewportRange({
        ohlcvData,
        durationMs: config.durationMs,
        allTradeTimeRange,
        framingMarkers,
        canPaginateOlder: Boolean(ohlcvPagination.hasMore),
      }),
    [
      ohlcvData,
      config.durationMs,
      allTradeTimeRange,
      framingMarkers,
      ohlcvPagination.hasMore,
    ],
  );

  const comparePrice = useMemo(() => {
    if (!ohlcvData.length || visibleFromMs == null) return null;
    return (ohlcvData.find((c) => c.time >= visibleFromMs) ?? ohlcvData[0])
      .close;
  }, [ohlcvData, visibleFromMs]);

  const handleCrosshairMove = useCallback(
    (data: CrosshairData | null) => {
      if (!onScrubPercentChange) return;
      if (!data || comparePrice == null || comparePrice === 0) {
        onScrubPercentChange(null);
        return;
      }
      onScrubPercentChange(((data.close - comparePrice) / comparePrice) * 100);
    },
    [onScrubPercentChange, comparePrice],
  );

  const shouldFallback =
    !chartLoading &&
    (ohlcvData.length < CHART_DATA_THRESHOLD || hasEmptyData || !!chartError);

  useNotifyChartTypeSupported(!shouldFallback, onSupportsChartTypeChange);

  useEffect(() => {
    if (!focusRequest || chartLoading || shouldFallback) return;
    if (handledFocusNonceRef.current === focusRequest.nonce) return;

    const tradeTime = tradeTimestampToMs(focusRequest.timestamp);
    const firstBarTime = ohlcvData[0]?.time;
    const latestBarTime = ohlcvData[ohlcvData.length - 1]?.time;

    if (
      !Number.isFinite(tradeTime) ||
      firstBarTime == null ||
      latestBarTime == null
    ) {
      return;
    }

    if (tradeTime >= firstBarTime && tradeTime <= latestBarTime) {
      const chart = chartRef.current;
      if (!chart) return;
      chart.focusTime(tradeTime, {
        spanMs: focusRequest.spanMs ?? getTradeFocusSpanMs(activeTimePeriod),
      });
      chart.pulseTradeMarker(focusRequest.id);
      handledFocusNonceRef.current = focusRequest.nonce;
      return;
    }

    if (tradeTime < firstBarTime) {
      const fallbackPeriod = getFallbackTradeFocusPeriod(activeTimePeriod);
      if (fallbackPeriod && onRequestTimePeriod) {
        onRequestTimePeriod(fallbackPeriod);
        return;
      }
    }

    handledFocusNonceRef.current = focusRequest.nonce;
  }, [
    activeTimePeriod,
    chartLoading,
    focusRequest,
    ohlcvData,
    onRequestTimePeriod,
    shouldFallback,
  ]);

  if (shouldFallback) {
    return (
      <TraderPriceChart
        prices={historicalPrices}
        priceDiff={priceDiff}
        isLoading={isPricesLoading}
        onChartIndexChange={onChartIndexChange}
        trades={trades}
        chartHeight={chartHeight}
        scrollPassthrough={scrollPassthrough}
      />
    );
  }

  return (
    <View style={{ height: chartHeight }} testID="trader-advanced-chart">
      <AdvancedChart
        ref={chartRef}
        slbMode
        scrollPassthrough={scrollPassthrough}
        ohlcvData={ohlcvData}
        ohlcvSeriesKey={ohlcvSeriesKey}
        webViewInstanceKey={webViewInstanceKey}
        height={chartHeight}
        chartType={chartType}
        showVolume={false}
        indicators={EMPTY_INDICATORS}
        isLoading={!hasChartBeenRevealed && chartLoading}
        onSkeletonHidden={handleSkeletonHidden}
        ohlcvPagination={ohlcvPagination}
        visibleFromMs={visibleFromMs}
        visibleToMs={visibleToMs}
        tradeMarkers={tradeMarkers}
        onCrosshairMove={handleCrosshairMove}
        onTradeMarkerPress={onTradeMarkerPress}
      />
    </View>
  );
};

/**
 * Position chart for the Social Trading trader position page, backed by the same
 * TradingView AdvancedChart used on Token Details. Spot positions use the price-API
 * OHLCV feed; perp positions use the perps stream adapter. Renders open/close
 * trade circles via the `tradeMarkers` prop. Falls back to the legacy SVG
 * {@link TraderPriceChart} when there is insufficient chart coverage.
 */
const TraderAdvancedChart = (props: TraderAdvancedChartProps) => {
  if (props.isPerp && props.perpSymbol && props.selectedCandlePeriod) {
    return (
      <TraderPerpAdvancedChart
        perpSymbol={props.perpSymbol}
        selectedCandlePeriod={props.selectedCandlePeriod}
        trades={props.trades}
        focusRequest={props.focusRequest}
        onRequestCandlePeriod={props.onRequestCandlePeriod}
        chartType={props.chartType}
        onChartIndexChange={props.onChartIndexChange}
        onScrubPercentChange={props.onScrubPercentChange}
        onPerpMetricsChange={props.onPerpMetricsChange}
        onTradeMarkerPress={props.onTradeMarkerPress}
        onSupportsChartTypeChange={props.onSupportsChartTypeChange}
        chartHeight={props.chartHeight}
        scrollPassthrough={props.scrollPassthrough}
      />
    );
  }

  return <TraderSpotAdvancedChart {...props} />;
};

export default TraderAdvancedChart;

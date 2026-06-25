import type { Trade } from '@metamask/social-controllers';
import React, {
  useCallback,
  useEffect,
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
  type IndicatorType,
  type OHLCVBar,
  type TradeMarker,
} from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';
import {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../../../UI/Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../../../UI/Charts/AdvancedChart/useOHLCVChart';
import type { TimePeriod } from '../useTraderPositionData';
import TraderPriceChart from './TraderPriceChart';

const EMPTY_INDICATORS: IndicatorType[] = [];
/** Stable empty-bar reference so the spot path doesn't churn the perp memo. */
const EMPTY_OHLCV: OHLCVBar[] = [];
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;

const TRADE_FOCUS_PERIOD_ORDER: readonly TimePeriod[] = ['1M', 'All'];

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

/** Normalize a trade timestamp: treat values < 1e12 as seconds → convert to ms. */
const normalizeTs = (ts: number) => (ts > 0 && ts < 1e12 ? ts * 1000 : ts);

export function getTradeFocusSpanMs(period: TimePeriod): number {
  return TRADE_FOCUS_SPAN_MS[period];
}

export function getRecommendedTradeFocusPeriod(
  timestamp: number,
  _isPerp: boolean,
  nowMs: number = Date.now(),
): TimePeriod {
  const tradeTime = normalizeTs(timestamp);
  const ageMs = Number.isFinite(tradeTime)
    ? Math.max(0, nowMs - tradeTime)
    : Number.POSITIVE_INFINITY;

  return ageMs <= MONTH_MS ? '1M' : 'All';
}

function getNextWiderTradeFocusPeriod(period: TimePeriod): TimePeriod | null {
  const index = TRADE_FOCUS_PERIOD_ORDER.indexOf(period);
  return index >= 0 ? (TRADE_FOCUS_PERIOD_ORDER[index + 1] ?? null) : null;
}

function getFallbackTradeFocusPeriod(
  currentPeriod: TimePeriod,
  timestamp: number,
  isPerp: boolean,
): TimePeriod | null {
  if (currentPeriod === 'All') return null;

  const recommendedPeriod = getRecommendedTradeFocusPeriod(timestamp, isPerp);
  if (currentPeriod === recommendedPeriod) {
    return getNextWiderTradeFocusPeriod(currentPeriod);
  }

  return recommendedPeriod;
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
      time: normalizeTs(trade.timestamp),
      intent: trade.intent,
      id: trade.transactionHash,
    });
  }
  return markers;
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
  timePeriod: TimePeriod;
  spanMs: number;
}

export interface TraderAdvancedChartProps {
  /**
   * CAIP-19 asset id for the spot token (drives the spot OHLCV feed). Omitted for
   * Hyperliquid perps, which have no CAIP id — set {@link TraderAdvancedChartProps.isPerp}
   * instead and the chart renders from `historicalPrices`.
   */
  assetId?: string;
  /**
   * Hyperliquid perp position. Perps have no spot OHLCV feed, so the chart renders
   * the already-fetched `historicalPrices` line series (from the candleSnapshot
   * endpoint) instead of fetching via the price API.
   */
  isPerp?: boolean;
  /** Social Trading period selection (`1H`..`All`). */
  activeTimePeriod: TimePeriod;
  /** Trades to render as open/close circles. */
  trades: readonly Trade[];
  /** When set, the chart slides to center this trade's time (see {@link TradeFocusRequest}). */
  focusRequest?: TradeFocusRequest;
  /** Request a wider period when the target trade is older than loaded chart data. */
  onRequestTimePeriod?: (period: TimePeriod) => void;
  /**
   * Price history. For perps this is the live chart series (Hyperliquid); for spot
   * it is the fallback used when the OHLCV feed has insufficient coverage.
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
  /** Fired when the user taps a trade circle on the chart (the marker's trade id). */
  onTradeMarkerPress?: (id: string) => void;
  chartHeight?: number;
  /**
   * When true, the chart surface stops capturing touches so drags fall through to
   * the scrolling list behind a pinned-overlay chart (Trader Position layout).
   */
  scrollPassthrough?: boolean;
}

/**
 * Position chart for the Social Trading trader position page, backed by the same
 * TradingView AdvancedChart used on Token Details. Handles both spot (price-API
 * OHLCV, keyed by `assetId`) and Hyperliquid perp positions (`isPerp`, rendered
 * from the `historicalPrices` line series). Renders open/close trade circles via
 * the `tradeMarkers` prop. Falls back to the legacy SVG {@link TraderPriceChart}
 * when there is insufficient chart coverage.
 */
const TraderAdvancedChart = ({
  assetId,
  isPerp = false,
  activeTimePeriod,
  trades,
  focusRequest,
  onRequestTimePeriod,
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
  onScrubPercentChange,
  onTradeMarkerPress,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
  scrollPassthrough = false,
}: TraderAdvancedChartProps) => {
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

  // Spot: OHLCV from the MetaMask price API. A no-op (no fetch) when there is no
  // assetId — i.e. for perps, which supply their series via `historicalPrices`.
  //
  // ONE warm hook per period (each holds its own period's data permanently, since
  // useOHLCVChart is a single-series hook). Pre-fetching every period up front
  // means an interval tap is an instant in-memory swap with no network round-trip
  // — without this, switching to a not-yet-loaded period briefly shows the stale
  // previous period's data until the new fetch lands (a visible flash). Cost: up
  // to 5 concurrent OHLCV requests on mount instead of 3.
  const spotAssetId = !isPerp ? (assetId ?? '') : '';
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
  const spot =
    activeTimePeriod === '1H'
      ? hourSpot
      : activeTimePeriod === '1D'
        ? daySpot
        : activeTimePeriod === '1W'
          ? weekSpot
          : activeTimePeriod === '1M'
            ? monthSpot
            : allSpot;

  // Perps (Hyperliquid) have no CAIP asset id and no spot OHLCV feed; their price
  // history is already fetched as a line series (`historicalPrices`, from the
  // candleSnapshot endpoint). Render it on the same chart by treating each close
  // as a flat OHLC bar — this is a line chart, so only `close` is plotted.
  const perpOhlcvData = useMemo<OHLCVBar[]>(() => {
    if (!isPerp) return EMPTY_OHLCV;
    return historicalPrices.map(([time, price]) => ({
      time: Number(time),
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 0,
    }));
  }, [isPerp, historicalPrices]);

  const ohlcvData = isPerp ? perpOhlcvData : spot.ohlcvData;
  const chartLoading = isPerp ? isPricesLoading : spot.isLoading;
  const chartError = isPerp ? null : spot.error;
  const hasEmptyData = isPerp ? perpOhlcvData.length === 0 : spot.hasEmptyData;

  // Series key changes on data identity so a period switch (or fresh data) forces
  // a full re-send + reframe. Perps key off the loaded series; spot off its params.
  const ohlcvSeriesKey = isPerp
    ? `perp|${activeTimePeriod}|${perpOhlcvData.length}|${
        perpOhlcvData[perpOhlcvData.length - 1]?.time ?? ''
      }`
    : `${assetId}|${config.timePeriod}|${config.interval ?? ''}|${vsCurrency}`;

  // Stable WebView identity for the lifetime of this position. Because it does
  // NOT include the period/interval, the WebView is NOT remounted on an interval
  // tap — `AdvancedChart` hot-reloads the new OHLCV in place (stale-while-
  // revalidate) instead of cold-booting TradingView and flashing the skeleton.
  // The asset is fixed per mounted position and `vsCurrency` is constant, so this
  // is effectively constant; it changes only if the chart is reused for another
  // asset, which then re-runs the initial-load skeleton flow (see below).
  const webViewInstanceKey = `${assetId ?? 'perp'}|${vsCurrency}`;

  // First-reveal gate: once the chart has painted, interval taps must not re-show
  // the skeleton. Reset when the WebView instance changes (new asset) so a genuine
  // fresh load still shows it.
  const [hasChartBeenRevealed, setHasChartBeenRevealed] = useState(false);
  useEffect(() => {
    setHasChartBeenRevealed(false);
  }, [webViewInstanceKey]);
  const handleSkeletonHidden = useCallback(() => {
    setHasChartBeenRevealed(true);
  }, []);

  // Perps have no paginated history feed (the price API doesn't serve them).
  const ohlcvPagination = useMemo(
    () =>
      isPerp
        ? undefined
        : {
            nextCursor: spot.nextCursor,
            hasMore: spot.hasMore,
            assetId: assetId ?? '',
            vsCurrency,
          },
    [isPerp, spot.nextCursor, spot.hasMore, assetId, vsCurrency],
  );

  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;

  // ALL trades become markers. The WebView draws each one as its candle enters
  // the loaded range (draw-on-pan): older trades appear when you scroll back and
  // their history paginates in, rather than being dropped up front. The WebView
  // also re-snaps each marker's Y onto the line using its own paginating candles.
  const tradeMarkers = useMemo(
    () => mapTradesToAdvancedMarkers(trades),
    [trades],
  );

  // Subset within the currently-loaded window — used ONLY to frame the initial
  // viewport (below). Framing must not span the full trade history, or the period
  // buttons would zoom out to weeks/months on a token with many trades.
  const framingMarkers = useMemo(() => {
    if (!ohlcvData.length) return tradeMarkers;
    const firstTime = ohlcvData[0].time;
    const lastTime = ohlcvData[ohlcvData.length - 1].time;
    return tradeMarkers.filter(
      (m) => m.time >= firstTime && m.time <= lastTime,
    );
  }, [tradeMarkers, ohlcvData]);

  // Visible viewport. Unlike Token Details (which always shows the trailing
  // `durationMs`), a position chart must FRAME THE TRADES: a closed position may
  // have traded weeks before the feed's last candle, so a trailing window would
  // push the markers off-screen to the left. We center the trades and enforce a
  // minimum span of `durationMs` so a tight entry/exit isn't over-zoomed, then
  // clamp to the loaded data range. With no markers we keep the trailing window.
  const { visibleFromMs, visibleToMs } = useMemo(() => {
    if (lastBarTime == null || !ohlcvData.length) {
      return { visibleFromMs: undefined, visibleToMs: undefined };
    }
    const firstBarTime = ohlcvData[0].time;
    let from: number;
    let to: number;

    if (framingMarkers.length) {
      const times = framingMarkers.map((m) => m.time);
      const minT = Math.min(...times);
      const maxT = Math.max(...times);
      const pad = Math.max(maxT - minT, config.durationMs * 0.5) * 0.2;
      from = minT - pad;
      to = maxT + pad;
      // Enforce a minimum visible span so clustered trades keep context.
      if (to - from < config.durationMs) {
        const center = (from + to) / 2;
        from = center - config.durationMs / 2;
        to = center + config.durationMs / 2;
      }
    } else {
      to = lastBarTime;
      from = lastBarTime - config.durationMs;
    }

    return {
      visibleFromMs: Math.max(from, firstBarTime),
      visibleToMs: Math.min(to, lastBarTime),
    };
  }, [lastBarTime, ohlcvData, framingMarkers, config.durationMs]);

  // Reference price for crosshair % change: the first bar inside the window.
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

  // Mirror the Token Details fallback condition: if the OHLCV feed is empty or
  // too sparse, fall back to the legacy line chart (which fetches its own
  // historical prices) so coverage never regresses.
  const shouldFallback =
    !chartLoading &&
    (ohlcvData.length < CHART_DATA_THRESHOLD || hasEmptyData || !!chartError);

  // Slide the chart to center a tapped trade only after the current period's
  // loaded bars actually contain the target time. If not, ask the parent to
  // fallback to the month/all focus ranges and re-check after reload.
  useEffect(() => {
    if (!focusRequest || chartLoading || shouldFallback) return;
    if (activeTimePeriod !== focusRequest.timePeriod) return;
    if (handledFocusNonceRef.current === focusRequest.nonce) return;

    const tradeTime = normalizeTs(focusRequest.timestamp);
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
      const fallbackPeriod = getFallbackTradeFocusPeriod(
        activeTimePeriod,
        focusRequest.timestamp,
        isPerp,
      );
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
    isPerp,
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
        scrollPassthrough={scrollPassthrough}
        ohlcvData={ohlcvData}
        ohlcvSeriesKey={ohlcvSeriesKey}
        webViewInstanceKey={webViewInstanceKey}
        height={chartHeight}
        chartType={ChartType.Line}
        showVolume={false}
        indicators={EMPTY_INDICATORS}
        // Use TradingView's built-in price labels, last-price line and line-end
        // marker. The custom DOM/drawing equivalents are being removed (see #32322),
        // so opt out of all of them explicitly.
        lineChrome={{
          useCustomPriceLabels: false,
          useCustomDashedLastPriceLine: false,
          useCustomLineEndMarker: false,
        }}
        // Gate to first reveal: after the chart has painted once, a background
        // refetch on an interval tap keeps the (stale) chart visible instead of
        // re-showing the skeleton.
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

export default TraderAdvancedChart;

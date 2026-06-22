import type { Trade } from '@metamask/social-controllers';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import { advancedChartLineChromePresets } from '../../../../UI/Charts/AdvancedChart/advancedChartLineChrome.presets';
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

/**
 * Linear-interpolated `close` along the OHLCV line at `timeMs`, mirroring the
 * WebView's `interpolateCloseAlongLineAtTimeMs`. Returns `null` when the data is
 * empty or can't yield a finite value. Times outside the data clamp to the first
 * / last close.
 */
function lineCloseAtTime(
  ohlcvData: readonly OHLCVBar[],
  timeMs: number,
): number | null {
  if (!ohlcvData.length || !Number.isFinite(timeMs)) return null;
  const first = ohlcvData[0];
  const last = ohlcvData[ohlcvData.length - 1];
  if (timeMs <= first.time)
    return Number.isFinite(first.close) ? first.close : null;
  if (timeMs >= last.time)
    return Number.isFinite(last.close) ? last.close : null;
  for (let i = 0; i < ohlcvData.length - 1; i++) {
    const t0 = ohlcvData[i].time;
    const t1 = ohlcvData[i + 1].time;
    if (timeMs >= t0 && timeMs <= t1) {
      const a = ohlcvData[i].close;
      const b = ohlcvData[i + 1].close;
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      if (t1 === t0) return a;
      return a + ((b - a) * (timeMs - t0)) / (t1 - t0);
    }
  }
  return null;
}

/**
 * Builds {@link TradeMarker}s (open/close circles) from spot trades.
 *
 * Each marker is anchored on the chart's price line — its Y is the interpolated
 * `close` of `ohlcvData` at the trade's timestamp (see {@link lineCloseAtTime}) —
 * so the circle sits ON the line, matching the legacy SVG chart and the design.
 *
 * The raw execution price (`|usdCost| / |tokenAmount|`) is only a fallback for
 * trades outside the loaded data window: it includes fees, slippage and price
 * impact, so it floats above/below the close-price line and the circle reads as
 * misplaced. Absolute values are required because sells carry a negative
 * `usdCost`/`tokenAmount` (see {@link TradeRow}, which normalizes with
 * `Math.abs`); a signed division would yield a negative price and drop the exit
 * marker. Trades with a zero token amount or non-finite price are dropped.
 */
export function mapTradesToAdvancedMarkers(
  trades: readonly Trade[],
  ohlcvData: readonly OHLCVBar[] = [],
): TradeMarker[] {
  const markers: TradeMarker[] = [];
  for (const trade of trades) {
    if (!trade.tokenAmount) continue;
    const executionPrice =
      Math.abs(trade.usdCost) / Math.abs(trade.tokenAmount);
    if (!Number.isFinite(executionPrice) || executionPrice <= 0) continue;
    const time = normalizeTs(trade.timestamp);
    const linePrice = lineCloseAtTime(ohlcvData, time);
    markers.push({
      time,
      price: linePrice != null && linePrice > 0 ? linePrice : executionPrice,
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
  chartHeight?: number;
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
  historicalPrices,
  priceDiff,
  isPricesLoading,
  onChartIndexChange,
  onScrubPercentChange,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
}: TraderAdvancedChartProps) => {
  const vsCurrency = CHART_VS_CURRENCY;
  const chartRef = useRef<AdvancedChartRef>(null);

  // Slide the chart to center a tapped trade and pulse its marker.
  // `focusRequest.nonce` changes on every tap so re-tapping re-centers/re-pulses.
  useEffect(() => {
    if (!focusRequest) return;
    chartRef.current?.focusTime(normalizeTs(focusRequest.timestamp));
    chartRef.current?.pulseTradeMarker(focusRequest.id);
  }, [focusRequest]);

  const timeRange = SOCIAL_PERIOD_TO_TIME_RANGE[activeTimePeriod];
  const config = TIME_RANGE_CONFIGS[timeRange];

  // Spot: OHLCV from the MetaMask price API. A no-op (no fetch) when there is no
  // assetId — i.e. for perps, which supply their series via `historicalPrices`.
  const spot = useOHLCVChart({
    assetId: assetId ?? '',
    timePeriod: config.timePeriod,
    interval: config.interval,
    vsCurrency,
  });

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
    () => mapTradesToAdvancedMarkers(trades, ohlcvData),
    [trades, ohlcvData],
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

  if (shouldFallback) {
    return (
      <TraderPriceChart
        prices={historicalPrices}
        priceDiff={priceDiff}
        isLoading={isPricesLoading}
        onChartIndexChange={onChartIndexChange}
        trades={trades}
        chartHeight={chartHeight}
      />
    );
  }

  return (
    <View style={{ height: chartHeight }} testID="trader-advanced-chart">
      <AdvancedChart
        ref={chartRef}
        ohlcvData={ohlcvData}
        ohlcvSeriesKey={ohlcvSeriesKey}
        height={chartHeight}
        chartType={ChartType.Line}
        showVolume={false}
        indicators={EMPTY_INDICATORS}
        lineChrome={advancedChartLineChromePresets.tokenOverview}
        isLoading={chartLoading}
        ohlcvPagination={ohlcvPagination}
        visibleFromMs={visibleFromMs}
        visibleToMs={visibleToMs}
        tradeMarkers={tradeMarkers}
        onCrosshairMove={handleCrosshairMove}
      />
    </View>
  );
};

export default TraderAdvancedChart;

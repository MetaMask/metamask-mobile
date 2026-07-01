import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CandlePeriod,
  CandleData,
  TimeDuration,
} from '@metamask/perps-controller';
import AdvancedChart from '../../../Charts/AdvancedChart/AdvancedChart';
import {
  ChartType,
  type CrosshairData,
  type PositionLines,
  type PositionLineColors,
  type ChartRangeSettlePayload,
} from '../../../Charts/AdvancedChart/AdvancedChart.types';
import { useTheme } from '../../../../../util/theme';
import type { Colors } from '../../../../../util/theme/models';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  type TraceValue,
} from '../../../../../util/trace';
import { playImpact, ImpactMoment } from '../../../../../util/haptics';
import { usePerpsAdvancedChartAdapter } from '../../hooks/usePerpsAdvancedChartAdapter';
import TradingViewChart, {
  type OhlcData,
  type TPSLLines,
} from '../TradingViewChart/TradingViewChart';
import { getPerpsVolumeColors } from '../../utils/chartColors';
import performance from 'react-native-performance';

export interface PerpsAdvancedChartProps {
  symbol: string;
  interval: CandlePeriod;
  visibleCandleCount: number;
  height: number;
  tpslLines?: TPSLLines;
  /** Signed position size string; used to derive long/short side for position lines. */
  positionSize?: string;
  onCrosshairDataChange?: (data: OhlcData | null) => void;
  onLatestPriceChange?: (price: number | undefined) => void;
  onError?: (error: string) => void;
  onSkeletonHidden?: (payload?: ChartRangeSettlePayload) => void;
  /** Fallback candle data for the Lightweight chart if AdvancedChart fails this mount. */
  fallbackCandleData: CandleData | null;
  /** Fallback fetch-more-history for the Lightweight chart fallback. */
  fallbackFetchMoreHistory?: () => void;
  /** Duration used for RN-backed older-bar pagination. */
  paginationDuration?: TimeDuration;
}

/**
 * Maps Perps TPSLLines (string-typed) to shared AdvancedChart PositionLines (numeric).
 * Returns undefined if there is no entry price (no open position overlay).
 * Exported for unit testing.
 */
export function mapTpslToPositionLines(
  tpslLines: TPSLLines | undefined,
  positionSize: string | undefined,
): PositionLines | undefined {
  if (!tpslLines?.entryPrice) return undefined;
  let side: PositionLines['side'] = 'long';
  if (positionSize !== undefined && Number.parseFloat(positionSize) < 0) {
    side = 'short';
  }

  const entry = Number.parseFloat(tpslLines.entryPrice);
  if (!Number.isFinite(entry)) return undefined;

  const result: PositionLines = {
    side,
    entryPrice: entry,
  };

  const takeProfitPrice = tpslLines.takeProfitPrice
    ? Number.parseFloat(tpslLines.takeProfitPrice)
    : undefined;
  if (Number.isFinite(takeProfitPrice)) {
    result.takeProfitPrice = takeProfitPrice;
  }

  const stopLossPrice = tpslLines.stopLossPrice
    ? Number.parseFloat(tpslLines.stopLossPrice)
    : undefined;
  if (Number.isFinite(stopLossPrice)) {
    result.stopLossPrice = stopLossPrice;
  }

  const liquidationPrice = tpslLines.liquidationPrice
    ? Number.parseFloat(tpslLines.liquidationPrice)
    : undefined;
  if (Number.isFinite(liquidationPrice)) {
    result.liquidationPrice = liquidationPrice;
  }

  return result;
}

/**
 * Resolves the four position-line colors from the MetaMask theme.
 * Uses the same tokens as the existing Lightweight chart
 * (TradingViewChartTemplate) for visual parity. Exported for unit testing.
 */
export function getPerpsPositionLineColors(colors: Colors): PositionLineColors {
  return {
    currentPrice: colors.text.default,
    entry: colors.text.alternative,
    takeProfit: colors.success.default,
    stopLoss: colors.warning.default,
    liquidation: colors.error.default,
  };
}

type PerpsChartTransitionType = 'initial_load' | 'interval_change';

function getPerpsChartVisibilityTrace(
  previousSeriesKey: string | null,
  nextSeriesKey: string,
): {
  name: TraceName;
  op: TraceOperation;
  transition: PerpsChartTransitionType;
} {
  if (previousSeriesKey === null) {
    return {
      name: TraceName.PerpsAdvancedChartInitialVisible,
      op: TraceOperation.PerpsAdvancedChart,
      transition: 'initial_load',
    };
  }
  const [prevSymbol, prevInterval] = previousSeriesKey.split('|');
  const [nextSymbol, nextInterval] = nextSeriesKey.split('|');
  if (prevSymbol === nextSymbol && prevInterval !== nextInterval) {
    return {
      name: TraceName.PerpsAdvancedChartIntervalVisible,
      op: TraceOperation.PerpsAdvancedChartInterval,
      transition: 'interval_change',
    };
  }
  return {
    name: TraceName.PerpsAdvancedChartInitialVisible,
    op: TraceOperation.PerpsAdvancedChart,
    transition: 'initial_load',
  };
}

/**
 * Thin adapter component that wraps the shared AdvancedChart for Perps.
 *
 * Handles data conversion (CandleStreamChannel → AdvancedChart props),
 * crosshair → OhlcData mapping, haptic feedback, Sentry traces,
 * position-line mapping, and per-mount fallback to TradingViewChart on error.
 */
const PerpsAdvancedChart: React.FC<PerpsAdvancedChartProps> = ({
  symbol,
  interval,
  visibleCandleCount,
  height,
  tpslLines,
  positionSize,
  onCrosshairDataChange,
  onLatestPriceChange,
  onError,
  onSkeletonHidden,
  fallbackCandleData,
  fallbackFetchMoreHistory,
  paginationDuration,
}) => {
  const {
    ohlcvData,
    realtimeBar,
    latestBar,
    ohlcvSeriesKey,
    visibleFromMs,
    visibleToMs,
    isLoading,
    handleFetchOlderBarsRequest,
  } = usePerpsAdvancedChartAdapter({
    symbol,
    interval,
    visibleCandleCount,
    paginationDuration,
  });

  // Per-mount error fallback: once errored, stay on Lightweight until unmount.
  const [hasFailed, setHasFailed] = useState(false);

  const { colors } = useTheme();

  const tpslEntryPrice = tpslLines?.entryPrice;
  const tpslTakeProfitPrice = tpslLines?.takeProfitPrice;
  const tpslStopLossPrice = tpslLines?.stopLossPrice;
  const tpslLiquidationPrice = tpslLines?.liquidationPrice;

  const positionLines = useMemo(
    () =>
      mapTpslToPositionLines(
        {
          entryPrice: tpslEntryPrice,
          takeProfitPrice: tpslTakeProfitPrice,
          stopLossPrice: tpslStopLossPrice,
          liquidationPrice: tpslLiquidationPrice,
        },
        positionSize,
      ),
    [
      tpslEntryPrice,
      tpslTakeProfitPrice,
      tpslStopLossPrice,
      tpslLiquidationPrice,
      positionSize,
    ],
  );

  const positionLineColors = useMemo(
    () => getPerpsPositionLineColors(colors),
    [colors],
  );

  const volumeColors = useMemo(() => getPerpsVolumeColors(colors), [colors]);
  const webViewInstanceKey = useMemo(() => `${symbol}|perps`, [symbol]);

  useEffect(() => {
    onLatestPriceChange?.(
      latestBar && Number.isFinite(latestBar.close)
        ? latestBar.close
        : undefined,
    );
  }, [latestBar, onLatestPriceChange]);

  // ---- Crosshair + haptics ----

  const prevOhlcRef = useRef<OhlcData | null>(null);

  const handleCrosshairMove = useCallback(
    (data: CrosshairData | null) => {
      if (!data) {
        onCrosshairDataChange?.(null);
        return;
      }
      const ohlc: OhlcData = {
        time: data.time,
        open: String(data.open),
        high: String(data.high),
        low: String(data.low),
        close: String(data.close),
        ...(data.volume !== undefined ? { volume: String(data.volume) } : {}),
      };
      const prev = prevOhlcRef.current;
      if (
        !prev ||
        prev.open !== ohlc.open ||
        prev.high !== ohlc.high ||
        prev.low !== ohlc.low ||
        prev.close !== ohlc.close ||
        prev.volume !== ohlc.volume
      ) {
        playImpact(ImpactMoment.ChartCrosshair);
      }
      prevOhlcRef.current = ohlc;
      onCrosshairDataChange?.(ohlc);
    },
    [onCrosshairDataChange],
  );

  // ---- Sentry traces ----

  const visibilityTraceStartedRef = useRef<string | null>(null);
  const activeVisibilityTraceRef = useRef<{
    seriesKey: string;
    traceName: TraceName;
    startedAt: number;
    transition: PerpsChartTransitionType;
  } | null>(null);

  useEffect(() => {
    const previousSeriesKey = visibilityTraceStartedRef.current;
    if (previousSeriesKey === ohlcvSeriesKey) return;

    // Supersede any open trace for the previous series.
    if (previousSeriesKey !== null) {
      const open = activeVisibilityTraceRef.current;
      if (open?.seriesKey === previousSeriesKey) {
        endTrace({
          name: open.traceName,
          id: previousSeriesKey,
          data: { superseded: true },
        });
        activeVisibilityTraceRef.current = null;
      }
    }

    const { name, op, transition } = getPerpsChartVisibilityTrace(
      previousSeriesKey,
      ohlcvSeriesKey,
    );

    visibilityTraceStartedRef.current = ohlcvSeriesKey;
    activeVisibilityTraceRef.current = {
      seriesKey: ohlcvSeriesKey,
      traceName: name,
      startedAt: performance.now(),
      transition,
    };

    trace({
      name,
      op,
      id: ohlcvSeriesKey,
      data: { symbol, interval: interval as string, surface: 'market_detail' },
    });
  }, [ohlcvSeriesKey, symbol, interval]);

  useEffect(
    () => () => {
      const open = activeVisibilityTraceRef.current;
      if (open) {
        endTrace({
          name: open.traceName,
          id: open.seriesKey,
          data: { unmounted: true },
        });
        activeVisibilityTraceRef.current = null;
        visibilityTraceStartedRef.current = null;
      }
    },
    [],
  );

  const handleSkeletonHidden = useCallback(
    (payload?: ChartRangeSettlePayload) => {
      const open = activeVisibilityTraceRef.current;
      if (open) {
        const completedAt = performance.now();
        const totalVisibleMs = completedAt - open.startedAt;
        const data: Record<string, TraceValue> = {
          symbol,
          interval: interval as string,
          surface: 'market_detail',
          transition: open.transition,
          totalVisibleMs,
          ...(payload
            ? Object.fromEntries(
                Object.entries(payload).filter(
                  ([, v]) =>
                    typeof v === 'number' ||
                    typeof v === 'string' ||
                    typeof v === 'boolean',
                ),
              )
            : {}),
        };
        endTrace({ name: open.traceName, id: open.seriesKey, data });
        activeVisibilityTraceRef.current = null;
      }
      onSkeletonHidden?.(payload);
    },
    [symbol, interval, onSkeletonHidden],
  );

  // ---- Error fallback ----

  const handleError = useCallback(
    (error: string) => {
      setHasFailed(true);
      const open = activeVisibilityTraceRef.current;
      if (open) {
        endTrace({
          name: open.traceName,
          id: open.seriesKey,
          data: {
            fallbackToLightweight: true,
            errorMessage: error.slice(0, 200),
          },
        });
        activeVisibilityTraceRef.current = null;
      }
      onError?.(error);
    },
    [onError],
  );

  if (hasFailed) {
    return (
      <TradingViewChart
        candleData={fallbackCandleData}
        height={height}
        visibleCandleCount={visibleCandleCount}
        tpslLines={tpslLines}
        symbol={symbol}
        onNeedMoreHistory={fallbackFetchMoreHistory}
        onOhlcDataChange={onCrosshairDataChange}
        showOverlay={false}
        coloredVolume
      />
    );
  }

  return (
    <AdvancedChart
      ohlcvData={ohlcvData}
      ohlcvSeriesKey={ohlcvSeriesKey}
      webViewInstanceKey={webViewInstanceKey}
      realtimeBar={realtimeBar}
      height={height}
      chartType={ChartType.Candles}
      showVolume
      volumeOverlay={false}
      hidePaneSeparator
      gridLineColorOverride={colors.border.muted}
      isLoading={isLoading}
      positionLines={positionLines}
      positionLineColors={positionLineColors}
      rnBackedPagination={{ enabled: true }}
      onFetchOlderBarsRequest={handleFetchOlderBarsRequest}
      onCrosshairMove={handleCrosshairMove}
      onError={handleError}
      onSkeletonHidden={handleSkeletonHidden}
      visibleFromMs={visibleFromMs}
      visibleToMs={visibleToMs}
      currentPriceLineColorOverride={positionLineColors.currentPrice}
      volumeSuccessColorOverride={volumeColors.success}
      volumeErrorColorOverride={volumeColors.error}
    />
  );
};

export default PerpsAdvancedChart;

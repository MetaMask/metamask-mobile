import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { toDateFormat } from '../../../../util/date';
import styleSheet from './Price.styles';
import {
  CHART_DATA_THRESHOLD,
  isTokenOverviewChartInterval,
  TOKEN_OVERVIEW_CHART_HEIGHT as BASE_CHART_HEIGHT,
} from './tokenOverviewChart.constants';
import { TokenI } from '../../Tokens/types';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { normalizeTokenAddress } from '../../Bridge/utils/tokenUtils';
import AdvancedChart from '../../Charts/AdvancedChart/AdvancedChart';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { advancedChartLineChromePresets } from '../../Charts/AdvancedChart/advancedChartLineChrome.presets';
import {
  ChartType,
  type ChartInteractedPayload,
  type CrosshairData,
  type IndicatorType,
} from '../../Charts/AdvancedChart/AdvancedChart.types';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
  type OHLCVTimePeriod,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import { useOHLCVRealtime } from '../../Charts/AdvancedChart/useOHLCVRealtime';
import { OHLCVBar } from '../../Charts/AdvancedChart/OHLCVBar/OHLCVBar';
import IndicatorBar from '../../Charts/AdvancedChart/IndicatorBar';
import IntervalBar from '../../Charts/AdvancedChart/IntervalBar';

import { createMAPickerNavDetails } from '../../Charts/AdvancedChart/MAPickerSheet';
import { getTokenDetailsLegendOverlay } from '../../Charts/AdvancedChart/indicatorColors';
import { useNavigation } from '@react-navigation/native';
import { Box, TextColor } from '@metamask/design-system-react-native';
import { useTheme, LIGHT_MODE_SUCCESS_GREEN } from '../../../../util/theme';
import { AMBIENT_NEGATIVE_COLOR } from '../../TokenDetails/components/abTestConfig';
import { AppThemeKey } from '../../../../util/theme/models';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { useTokenChartPreferences } from './hooks/useTokenChartPreferences';
import type {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import PriceLegacy from './Price.legacy';
import { TokenPriceTitleHub } from './TokenPriceTitleHub';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectTokenDetailsOhlcvWsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsOhlcvWsIntegration';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';

/**
 * Maps UI time-range selections to the WebSocket candle interval used by
 * OHLCVService. These match the default intervals the REST OHLCV API returns
 * for each timePeriod.
 */
const WS_INTERVAL_BY_TIME_RANGE: Record<TimeRange, string> = {
  '1H': '1m',
  '1D': '15m',
  '1W': '1h',
  '1M': '1d',
  '1Y': '1d',
};

/**
 * Maps each candle interval to the API timePeriod that returns enough history.
 * Without this, e.g. interval=1d + timePeriod=1d returns only ~1 bar.
 */
const INTERVAL_TO_TIME_PERIOD: Record<string, OHLCVTimePeriod> = {
  '1m': '1d',
  '5m': '1d',
  '15m': '1d',
  '1h': '1w',
  '1d': '1m',
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1H': 'asset_overview.chart_time_period.1h',
  '1D': 'asset_overview.chart_time_period.1d',
  '1W': 'asset_overview.chart_time_period.1w',
  '1M': 'asset_overview.chart_time_period.1m',
  '1Y': 'asset_overview.chart_time_period.1y',
};

/** Maps {@link ohlcvSeriesKey} transitions to Sentry trace name/op (dashboards filter by name or op). */
function getAdvancedChartVisibilityTraceRequest(
  previousSeriesKey: string | null,
  nextSeriesKey: string,
): { name: TraceName; op: TraceOperation } {
  if (previousSeriesKey === null) {
    return {
      name: TraceName.TokenOverviewAdvancedChartInitialVisible,
      op: TraceOperation.TokenOverviewAdvancedChart,
    };
  }
  const prev = previousSeriesKey.split('|');
  const next = nextSeriesKey.split('|');
  if (prev.length >= 4 && next.length >= 4) {
    const sameAsset = prev[0] === next[0];
    const sameCurrency = prev[prev.length - 1] === next[next.length - 1];
    const rangeChanged = prev[1] !== next[1] || prev[2] !== next[2];
    if (sameAsset && sameCurrency && rangeChanged) {
      return {
        name: TraceName.TokenOverviewAdvancedChartTimeRangeVisible,
        op: TraceOperation.TokenOverviewAdvancedChartTimeRange,
      };
    }
  }
  return {
    name: TraceName.TokenOverviewAdvancedChartInitialVisible,
    op: TraceOperation.TokenOverviewAdvancedChart,
  };
}

const getChangePercentColor = (
  displayDiff: number | null,
): TextColor | undefined => {
  if (displayDiff === null) return undefined;
  if (displayDiff > 0) return TextColor.SuccessDefault;
  if (displayDiff < 0) return TextColor.ErrorDefault;
  return TextColor.TextAlternative;
};

export interface PriceAdvancedProps {
  asset: TokenI;
  currentPrice: number;
  currentCurrency: string;
  /** From parent (`Price`); used when falling back to {@link PriceLegacy}. */
  priceDiff: number;
  /** From parent (`Price`); used when falling back to {@link PriceLegacy}. */
  comparePrice: number;
  isLoading: boolean;
  /** From parent (`Price`); forwarded to {@link PriceLegacy} on fallback only — AdvancedChart uses OHLCV. */
  prices?: TokenPrice[];
  timePeriod?: TimePeriod;
  chartNavigationButtons?: TimePeriod[];
  setTimePeriod?: (period: TimePeriod) => void;
  onPriceDirectionChange?: (isPositive: boolean) => void;
  useAmbientColor?: boolean;
  hasInsufficientCoverage?: boolean;
}

const PriceAdvanced = ({
  asset,
  currentPrice,
  currentCurrency,
  priceDiff,
  comparePrice,
  isLoading,
  prices = [],
  timePeriod = '1d',
  chartNavigationButtons = [],
  setTimePeriod,
  onPriceDirectionChange,
  useAmbientColor = false,
  hasInsufficientCoverage = false,
}: PriceAdvancedProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const {
    chartType,
    chartInterval: persistedChartInterval,
    indicators: persistedIndicators,
    setChartType,
    setChartInterval,
    setIndicators,
  } = useTokenChartPreferences();
  const isOhlcvWsEnabled = useSelector(selectTokenDetailsOhlcvWsEnabled);
  const isTechnicalIndicatorsEnabled = useSelector(
    selectTokenDetailsTechnicalIndicatorsEnabled,
  );
  /** `null` = WebView init pending; `false` = chart ready; `true` = init failed → legacy fallback. */
  const [chartInitFailed, setChartInitFailed] = useState<boolean | null>(null);
  /** True after the chart skeleton has been hidden once this WebView session. */
  const [hasChartBeenRevealed, setHasChartBeenRevealed] = useState(false);
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(
    null,
  );

  // Define activeIndicators early so it's available in all callbacks
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    () => new Set(persistedIndicators),
  );

  const handleCrosshairMove = useCallback(
    (data: CrosshairData | null) => setCrosshairData(data),
    [],
  );

  const handleChartInteracted = useCallback(
    (payload: ChartInteractedPayload) => {
      const properties: Record<string, unknown> = {
        interaction_type: payload.interaction_type,
        chart_type: chartType === ChartType.Candles ? 'candlestick' : 'line',
      };

      // Add indicators_active when feature flag is enabled
      if (isTechnicalIndicatorsEnabled) {
        properties.indicators_active = [...activeIndicators];
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
          .addProperties(properties)
          .build(),
      );
    },
    [
      createEventBuilder,
      trackEvent,
      chartType,
      isTechnicalIndicatorsEnabled,
      activeIndicators,
    ],
  );

  const handleChartTradingViewClicked = useCallback(() => {
    const properties: Record<string, unknown> = {
      interaction_type: 'tradingview_clicked',
      chart_type: chartType === ChartType.Candles ? 'candlestick' : 'line',
    };

    // Add indicators_active when feature flag is enabled
    if (isTechnicalIndicatorsEnabled) {
      properties.indicators_active = [...activeIndicators];
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
        .addProperties(properties)
        .build(),
    );
  }, [
    createEventBuilder,
    trackEvent,
    chartType,
    isTechnicalIndicatorsEnabled,
    activeIndicators,
  ]);

  // Sync activeIndicators to Redux for persistence
  useEffect(() => {
    setIndicators([...activeIndicators]);
  }, [activeIndicators, setIndicators]);

  const isMAIndicator = useCallback((name: string) => /^MA\d+$/.test(name), []);

  const indicatorsArray = useMemo(
    () =>
      ([...activeIndicators] as IndicatorType[]).filter(
        (i) => i !== 'Volume' && !isMAIndicator(i),
      ),
    [activeIndicators, isMAIndicator],
  );

  const selectedMAs = useMemo(
    () => [...activeIndicators].filter((name) => isMAIndicator(name)),
    [activeIndicators, isMAIndicator],
  );

  const handleChartTypeSelect = useCallback(
    (next: ChartType) => {
      if (next === chartType) return;
      if (next !== ChartType.Candles) {
        setCrosshairData(null);
      }

      const properties: Record<string, unknown> = {
        interaction_type: 'chart_type_changed',
        chart_type: next === ChartType.Candles ? 'candlestick' : 'line',
      };

      // Add indicators_active when feature flag is enabled
      if (isTechnicalIndicatorsEnabled) {
        properties.indicators_active = [...activeIndicators];
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
          .addProperties(properties)
          .build(),
      );
      setChartType(next);
    },
    [
      chartType,
      createEventBuilder,
      trackEvent,
      setChartType,
      isTechnicalIndicatorsEnabled,
      activeIndicators,
    ],
  );

  const toggleChartType = useCallback(() => {
    const next =
      chartType === ChartType.Candles ? ChartType.Line : ChartType.Candles;
    handleChartTypeSelect(next);
  }, [chartType, handleChartTypeSelect]);

  const handleTimeRangeSelect = useCallback(
    (range: TimeRange) => {
      if (range === timeRange) {
        return;
      }
      // Clear crosshair data when changing timeframes to reset price/percentage display
      setCrosshairData(null);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
          .addProperties({
            interaction_type: 'timeframe_changed',
            chart_timeframe: range,
            chart_type:
              chartType === ChartType.Candles ? 'candlestick' : 'line',
          })
          .build(),
      );
      setTimeRange(range);
    },
    [createEventBuilder, timeRange, trackEvent, chartType],
  );

  const assetId = useMemo(() => {
    // Normalize Polygon's native token address (0x...001010) to zero address
    // before formatting to CAIP-19 assetId. formatAddressToAssetId will convert
    // zero address to proper SLIP-44 format (e.g., eip155:137/slip44:966 for Polygon)
    const normalizedAddress = normalizeTokenAddress(
      asset.address,
      asset.chainId as Hex,
    );

    try {
      return (
        formatAddressToAssetId(normalizedAddress, asset.chainId as Hex) ?? ''
      );
    } catch {
      // formatAddressToAssetId can throw for chains not supported by XChain Swaps/Bridge
      // (e.g., Linea Sepolia, custom networks). Fall back to empty string
      return '';
    }
  }, [asset.address, asset.chainId]);
  const config = TIME_RANGE_CONFIGS[timeRange];
  const wsInterval = WS_INTERVAL_BY_TIME_RANGE[timeRange];

  const resolveDisplayInterval = useCallback(
    (interval: string | undefined | null) => {
      const normalised = interval?.toLowerCase();
      if (isTokenOverviewChartInterval(normalised)) {
        return normalised.toUpperCase();
      }
      return wsInterval.toUpperCase();
    },
    [wsInterval],
  );

  const [displayInterval, setDisplayInterval] = useState(() =>
    isTechnicalIndicatorsEnabled
      ? resolveDisplayInterval(persistedChartInterval)
      : wsInterval.toUpperCase(),
  );

  useEffect(() => {
    if (isTechnicalIndicatorsEnabled) {
      setDisplayInterval(resolveDisplayInterval(persistedChartInterval));
      return;
    }
    setDisplayInterval(wsInterval.toUpperCase());
  }, [
    isTechnicalIndicatorsEnabled,
    persistedChartInterval,
    resolveDisplayInterval,
    wsInterval,
  ]);

  const chartInterval = displayInterval.toLowerCase();

  const effectiveTimePeriod = isTechnicalIndicatorsEnabled
    ? INTERVAL_TO_TIME_PERIOD[chartInterval]
    : config.timePeriod;

  const effectiveInterval = isTechnicalIndicatorsEnabled
    ? chartInterval
    : config.interval;

  /**
   * Used to make sure changing time range always sends a full SET_OHLCV_DATA
   */
  const ohlcvSeriesKey = useMemo(
    () =>
      `${assetId}|${effectiveTimePeriod}|${effectiveInterval}|${currentCurrency}`,
    [assetId, effectiveTimePeriod, effectiveInterval, currentCurrency],
  );

  /** Stable per-asset session key — time-range switches must not reset chart init state. */
  const chartWebViewSessionKey = useMemo(
    () => `${assetId}|${currentCurrency}`,
    [assetId, currentCurrency],
  );

  const assetIdRef = useRef(assetId);
  assetIdRef.current = assetId;

  const visibilityTraceStartedRef = useRef<string | null>(null);
  /** Matches pending manual trace so {@link endTrace} uses the same `TraceName` as {@link trace}. */
  const activeVisibilityTraceRef = useRef<{
    seriesKey: string;
    traceName: TraceName;
  } | null>(null);

  const completeVisibilityTrace = useCallback(() => {
    const open = activeVisibilityTraceRef.current;
    if (!open || open.seriesKey !== visibilityTraceStartedRef.current) {
      return;
    }
    endTrace({
      name: open.traceName,
      id: open.seriesKey,
    });
    activeVisibilityTraceRef.current = null;
  }, []);

  const handleAdvancedChartSkeletonHidden = useCallback(() => {
    const isInitialReveal = !hasChartBeenRevealed;
    setHasChartBeenRevealed(true);
    setChartInitFailed(false);
    // Technical-indicators path: skeleton hides once; interval refreshes complete via layout settled.
    if (!isTechnicalIndicatorsEnabled || isInitialReveal) {
      completeVisibilityTrace();
    }
  }, [
    hasChartBeenRevealed,
    isTechnicalIndicatorsEnabled,
    completeVisibilityTrace,
  ]);

  const handleAdvancedChartLayoutSettled = useCallback(() => {
    if (!isTechnicalIndicatorsEnabled || !hasChartBeenRevealed) {
      return;
    }
    completeVisibilityTrace();
  }, [
    isTechnicalIndicatorsEnabled,
    hasChartBeenRevealed,
    completeVisibilityTrace,
  ]);

  const handleAdvancedChartError = useCallback((error: string) => {
    const open = activeVisibilityTraceRef.current;
    if (!open) {
      return;
    }
    endTrace({
      name: open.traceName,
      id: open.seriesKey,
      data: {
        errorMessage: error.slice(0, 200),
      },
    });
    activeVisibilityTraceRef.current = null;
  }, []);

  const handleAdvancedChartInitFailed = useCallback((error: string) => {
    setChartInitFailed(true);
    const open = activeVisibilityTraceRef.current;
    if (!open) {
      return;
    }
    endTrace({
      name: open.traceName,
      id: open.seriesKey,
      data: {
        errorMessage: error.slice(0, 200),
        chartInitFailed: true,
      },
    });
    activeVisibilityTraceRef.current = null;
  }, []);

  useEffect(() => {
    setChartInitFailed(null);
    setHasChartBeenRevealed(false);
  }, [chartWebViewSessionKey]);

  const {
    ohlcvData,
    isLoading: chartLoading,
    error: chartError,
    hasMore,
    nextCursor,
    hasEmptyData,
  } = useOHLCVChart({
    assetId,
    timePeriod: effectiveTimePeriod,
    interval: effectiveInterval,
    vsCurrency: currentCurrency,
  });

  const maLabel = useMemo(() => {
    if (selectedMAs.length === 0) return 'MA';
    if (selectedMAs.length === 1) return selectedMAs[0];
    return `MA x${selectedMAs.length}`;
  }, [selectedMAs]);

  const handleMAPress = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
        .addProperties({
          interaction_type: 'indicator_selector_opened',
          selector_type: 'moving_averages',
          chart_type: chartType === ChartType.Candles ? 'candlestick' : 'line',
          indicators_active: [...activeIndicators],
        })
        .build(),
    );

    navigation.navigate(
      ...createMAPickerNavDetails({
        selectedMAs,
        onDone: (selected: string[]) => {
          setActiveIndicators((prev) => {
            const next = new Set([...prev].filter((i) => !/^MA\d+$/.test(i)));
            const previousMAs = [...prev].filter((i) => /^MA\d+$/.test(i));
            const selectedSet = new Set(selected);

            selected.forEach((ma) => next.add(ma));

            // Track individual MA state changes
            const allMAs = new Set([...previousMAs, ...selected]);

            allMAs.forEach((ma) => {
              const wasActive = previousMAs.includes(ma);
              const isActive = selectedSet.has(ma);

              // Only emit event if state changed
              if (wasActive !== isActive) {
                trackEvent(
                  createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
                    .addProperties({
                      interaction_type: 'indicator_toggled',
                      indicator_type: ma,
                      indicator_action: isActive ? 'on' : 'off',
                      indicators_active: [...next],
                      chart_type:
                        chartType === ChartType.Candles
                          ? 'candlestick'
                          : 'line',
                    })
                    .build(),
                );
              }
            });

            return next;
          });
        },
      }),
    );
  }, [
    navigation,
    selectedMAs,
    trackEvent,
    createEventBuilder,
    chartType,
    activeIndicators,
  ]);

  const chartHeight = BASE_CHART_HEIGHT;

  const handleIndicatorToggle = useCallback(
    (name: string) => {
      setActiveIndicators((prev) => {
        const next = new Set(prev);
        const wasActive = next.has(name);

        if (wasActive) {
          next.delete(name);
        } else {
          next.add(name);
        }

        // Track immediately with the new state
        const updatedIndicators = [...next];
        trackEvent(
          createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
            .addProperties({
              interaction_type: 'indicator_toggled',
              indicator_type: name,
              indicator_action: wasActive ? 'off' : 'on',
              indicators_active: updatedIndicators,
              chart_type:
                chartType === ChartType.Candles ? 'candlestick' : 'line',
            })
            .build(),
        );

        return next;
      });
    },
    [trackEvent, createEventBuilder, chartType],
  );

  const wsEnabled =
    isOhlcvWsEnabled &&
    !chartLoading &&
    ohlcvData.length >= CHART_DATA_THRESHOLD &&
    !hasEmptyData &&
    !chartError;

  /** OHLCV or WebView init still in flight — mirrors TimeRangeSelector `isChartLoading`. */
  const isAdvancedChartUiPending = chartLoading || chartInitFailed === null;

  /** First visit only; time-range / interval refresh keeps selector and bars visible. */
  const isInitialChartPending =
    !hasChartBeenRevealed && isAdvancedChartUiPending;

  /**
   * Only show technical indicators UI when we're certain the advanced chart is being used.
   * After first reveal, keep bars visible during interval refresh.
   */
  const shouldShowTechnicalIndicators =
    isTechnicalIndicatorsEnabled &&
    (hasChartBeenRevealed ||
      (!isInitialChartPending &&
        ohlcvData.length >= CHART_DATA_THRESHOLD &&
        !hasEmptyData &&
        !chartError));

  /** Candlestick-only: keep selections in state/Redux but hide studies on line chart. */
  const showChartIndicators =
    isTechnicalIndicatorsEnabled && chartType === ChartType.Candles;

  const { latestBar } = useOHLCVRealtime({
    assetId,
    interval: isTechnicalIndicatorsEnabled ? chartInterval : wsInterval,
    currency: currentCurrency,
    timePeriod: isTechnicalIndicatorsEnabled
      ? effectiveTimePeriod
      : timeRange.toLowerCase(),
    enabled: wsEnabled,
  });

  const handleInlineIntervalSelect = useCallback(
    (interval: string) => {
      setDisplayInterval(interval);
      setChartInterval(interval);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CHART_INTERACTED)
          .addProperties({
            interaction_type: 'granularity_changed',
            chart_granularity: interval.toLowerCase(),
            chart_type:
              chartType === ChartType.Candles ? 'candlestick' : 'line',
            indicators_active: [...activeIndicators],
          })
          .build(),
      );
    },
    [
      trackEvent,
      createEventBuilder,
      chartType,
      activeIndicators,
      setChartInterval,
    ],
  );

  // TradingView Advanced Charts Bar.time expects milliseconds
  // https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Datafeed.Bar/
  // OHLCVService delivers bars with `timestamp` in Unix seconds — multiply by 1000
  const realtimeBar = useMemo(() => {
    if (!wsEnabled || !latestBar) return undefined;
    return {
      time: latestBar.timestamp * 1000,
      open: latestBar.open,
      high: latestBar.high,
      low: latestBar.low,
      close: latestBar.close,
      volume: latestBar.volume,
    };
  }, [wsEnabled, latestBar]);

  const ohlcvPagination = useMemo(
    () => ({
      nextCursor,
      hasMore,
      assetId,
      vsCurrency: currentCurrency,
    }),
    [nextCursor, hasMore, assetId, currentCurrency],
  );
  const lastBarTime = ohlcvData[ohlcvData.length - 1]?.time;

  // Flag ON: let TradingView auto-fit all returned data.
  // Flag OFF: anchor visible window to lastBarTime - durationMs so the
  //           leftmost bar matches the reference price for the header percentage.
  const visibleFromMs = useMemo(() => {
    if (isTechnicalIndicatorsEnabled) return undefined;
    if (lastBarTime == null) return undefined;
    return lastBarTime - config.durationMs;
  }, [isTechnicalIndicatorsEnabled, lastBarTime, config.durationMs]);

  const visibleToMs = isTechnicalIndicatorsEnabled ? undefined : lastBarTime;

  const dateLabel = isTechnicalIndicatorsEnabled
    ? strings('asset_overview.chart_time_period.1d')
    : strings(TIME_RANGE_LABELS[timeRange]);

  // Calculate the current compare price from OHLCV data.
  // Flag ON: find the bar closest to exactly 24 h before the last bar so the
  // percentage always represents 24H change regardless of selected interval.
  // Flag OFF: find the first bar within the visible window so the percentage
  // resets to 0% at the leftmost visible bar.
  const currentComparePrice = useMemo(() => {
    if (ohlcvData.length === 0) return null;
    if (isTechnicalIndicatorsEnabled) {
      if (lastBarTime == null) return null;
      const target24h = lastBarTime - 24 * 60 * 60 * 1000;
      const bar24h = ohlcvData.find((c) => c.time >= target24h) ?? ohlcvData[0];
      return bar24h.close;
    }
    if (visibleFromMs == null) return null;
    const firstVisible =
      ohlcvData.find((c) => c.time >= visibleFromMs) ?? ohlcvData[0];
    return firstVisible.close;
  }, [ohlcvData, visibleFromMs, isTechnicalIndicatorsEnabled, lastBarTime]);

  // Store last good compare price to show during loading
  const stableComparePriceRef = useRef<number | null>(null);
  const stableSeriesKeyRef = useRef<string>(ohlcvSeriesKey);

  // Update stable compare price when chart finishes loading AND series matches
  useEffect(() => {
    if (stableSeriesKeyRef.current !== ohlcvSeriesKey) {
      stableSeriesKeyRef.current = ohlcvSeriesKey;
    } else if (!chartLoading && currentComparePrice !== null) {
      stableComparePriceRef.current = currentComparePrice;
    }
  }, [chartLoading, currentComparePrice, ohlcvSeriesKey]);

  // Use stable while (loading OR series mismatch), otherwise use current
  const dynamicComparePrice =
    (chartLoading || stableSeriesKeyRef.current !== ohlcvSeriesKey) &&
    stableComparePriceRef.current !== null
      ? stableComparePriceRef.current
      : currentComparePrice;

  // Use last bar's close price for consistent percentage calculation with chart data
  const lastBarClose = ohlcvData[ohlcvData.length - 1]?.close;
  const realtimeClose = wsEnabled ? latestBar?.close : undefined;

  // Hold the last WS price during time-range transitions to avoid stale API flicker
  const lastRealtimeRef = useRef<number | undefined>(undefined);
  if (realtimeClose !== undefined) {
    lastRealtimeRef.current = realtimeClose;
  }
  const stablePrice = realtimeClose ?? lastRealtimeRef.current;

  const displayPrice =
    crosshairData?.close ?? stablePrice ?? lastBarClose ?? currentPrice;
  const displayDiff = useMemo(() => {
    if (dynamicComparePrice === null) return null;
    return (
      (crosshairData?.close ?? stablePrice ?? lastBarClose ?? currentPrice) -
      dynamicComparePrice
    );
  }, [
    crosshairData,
    stablePrice,
    lastBarClose,
    currentPrice,
    dynamicComparePrice,
  ]);

  const isCrosshairActive = !!crosshairData && chartType === ChartType.Candles;

  const changePercent = useMemo(() => {
    if (!isCrosshairActive || displayDiff === null || !dynamicComparePrice)
      return undefined;
    const sign = displayDiff >= 0 ? '+' : '';
    const pct = ((displayDiff / dynamicComparePrice) * 100).toFixed(2);
    return `${sign}${pct}%`;
  }, [isCrosshairActive, displayDiff, dynamicComparePrice]);

  const changePercentColor = getChangePercentColor(displayDiff);

  const { styles, theme } = useStyles(styleSheet);
  const { themeAppearance } = useTheme();
  const isLightMode = themeAppearance === AppThemeKey.light;

  const ambientSuccessGreen = isLightMode
    ? LIGHT_MODE_SUCCESS_GREEN
    : theme.colors.success.default;

  // Price diff used for the ambient color of the chart line/candles, time-range
  // selector, back button, and sticky footer.  Includes realtimeClose so the
  // chart color updates when WS ticks flip the price direction — the chart
  // itself hot-swaps colors via SET_THEME_COLORS postMessage (no WebView rebuild).
  const initialPriceDiff = useMemo(() => {
    const lbClose = ohlcvData[ohlcvData.length - 1]?.close;
    const currentDisplayPrice = realtimeClose ?? lbClose ?? currentPrice;

    if (dynamicComparePrice === null) return null;
    return currentDisplayPrice - dynamicComparePrice;
  }, [ohlcvData, currentPrice, dynamicComparePrice, realtimeClose]);

  const initialAmbientColor = useMemo(() => {
    if (!useAmbientColor) return undefined;
    if (initialPriceDiff === null) return undefined;
    return initialPriceDiff >= 0 ? ambientSuccessGreen : AMBIENT_NEGATIVE_COLOR;
  }, [useAmbientColor, initialPriceDiff, ambientSuccessGreen]);

  const tokenDetailsLegendOverlay = useMemo(
    () =>
      isTechnicalIndicatorsEnabled
        ? getTokenDetailsLegendOverlay(themeAppearance)
        : undefined,
    [isTechnicalIndicatorsEnabled, themeAppearance],
  );

  // Dynamic ambient color for price diff text only - changes during crosshair hover
  const ambientColor = useMemo(() => {
    if (!useAmbientColor) return undefined;
    if (displayDiff === null) return ambientSuccessGreen;
    return displayDiff >= 0 ? ambientSuccessGreen : AMBIENT_NEGATIVE_COLOR;
  }, [useAmbientColor, displayDiff, ambientSuccessGreen]);

  const shouldFallbackToLegacy =
    !chartLoading &&
    (ohlcvData.length < CHART_DATA_THRESHOLD ||
      hasEmptyData ||
      chartError ||
      chartInitFailed === true);

  useLayoutEffect(() => {
    if (initialPriceDiff !== null && !shouldFallbackToLegacy) {
      onPriceDirectionChange?.(initialPriceDiff >= 0);
    }
  }, [initialPriceDiff, onPriceDirectionChange, shouldFallbackToLegacy]);

  const displayDate = crosshairData
    ? toDateFormat(crosshairData.time)
    : dateLabel;

  const getPriceDiffStyle = () => {
    if (ambientColor) {
      return { color: ambientColor };
    }
    if (isLightMode && displayDiff !== null && displayDiff > 0) {
      return { color: LIGHT_MODE_SUCCESS_GREEN };
    }
    return undefined;
  };

  const shouldFallbackToLegacyRef = useRef(shouldFallbackToLegacy);
  shouldFallbackToLegacyRef.current = shouldFallbackToLegacy;

  useEffect(() => {
    if (!shouldFallbackToLegacy) {
      return;
    }
    const pendingId = visibilityTraceStartedRef.current;
    if (pendingId === null) {
      return;
    }
    const open = activeVisibilityTraceRef.current;
    if (open?.seriesKey === pendingId) {
      endTrace({
        name: open.traceName,
        id: pendingId,
        data: { fallbackToLegacy: true },
      });
      activeVisibilityTraceRef.current = null;
    }
    visibilityTraceStartedRef.current = null;
  }, [shouldFallbackToLegacy]);

  useEffect(() => {
    if (shouldFallbackToLegacyRef.current) {
      return;
    }
    if (visibilityTraceStartedRef.current === ohlcvSeriesKey) {
      return;
    }

    const previousSeriesId = visibilityTraceStartedRef.current;
    if (previousSeriesId !== null && previousSeriesId !== ohlcvSeriesKey) {
      const supersededOpen = activeVisibilityTraceRef.current;
      if (supersededOpen?.seriesKey === previousSeriesId) {
        endTrace({
          name: supersededOpen.traceName,
          id: previousSeriesId,
          data: { superseded: true },
        });
        activeVisibilityTraceRef.current = null;
      }
    }
    const { name: visibilityTraceName, op: visibilityTraceOp } =
      getAdvancedChartVisibilityTraceRequest(previousSeriesId, ohlcvSeriesKey);

    visibilityTraceStartedRef.current = ohlcvSeriesKey;
    activeVisibilityTraceRef.current = {
      seriesKey: ohlcvSeriesKey,
      traceName: visibilityTraceName,
    };

    const currentAssetId = assetIdRef.current;
    trace({
      name: visibilityTraceName,
      op: visibilityTraceOp,
      id: ohlcvSeriesKey,
      ...(currentAssetId.length > 0
        ? { data: { assetId: currentAssetId } }
        : {}),
    });
  }, [ohlcvSeriesKey]);

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

  if (shouldFallbackToLegacy) {
    return (
      <PriceLegacy
        prices={prices}
        timePeriod={timePeriod}
        chartNavigationButtons={chartNavigationButtons}
        onTimePeriodChange={setTimePeriod}
        priceDiff={priceDiff}
        currentPrice={currentPrice}
        currentCurrency={currentCurrency}
        comparePrice={comparePrice}
        isLoading={isLoading}
        onPriceDirectionChange={onPriceDirectionChange}
        useAmbientColor={useAmbientColor}
        hasInsufficientCoverage={hasInsufficientCoverage}
      />
    );
  }

  return (
    <>
      {!Number.isNaN(currentPrice) &&
        (isCrosshairActive && crosshairData ? (
          <OHLCVBar
            data={crosshairData}
            currency={currentCurrency}
            changePercent={changePercent}
            changePercentColor={changePercentColor}
          />
        ) : (
          <TokenPriceTitleHub
            price={displayPrice}
            displayDiff={displayDiff}
            comparePrice={dynamicComparePrice}
            periodLabel={displayDate}
            currentCurrency={currentCurrency}
            isLoading={isLoading}
            isChangeLoading={
              isTechnicalIndicatorsEnabled ? chartLoading : isLoading
            }
            ambientColor={ambientColor}
            getPriceDiffStyle={getPriceDiffStyle}
            changeFormat="signedCurrency"
          />
        ))}
      {/* Unified skeleton bar when feature flag ON and chart not yet revealed */}
      {isTechnicalIndicatorsEnabled && isInitialChartPending && (
        <View style={styles.intervalBarContainer}>
          <View style={styles.timeRangeSelectorWrap}>
            <Box twClassName="w-full px-4">
              <Skeleton height={29} width="100%" />
            </Box>
          </View>
        </View>
      )}
      {/* IntervalBar appears once OHLCV and WebView init have completed */}
      {isTechnicalIndicatorsEnabled && shouldShowTechnicalIndicators && (
        <View style={styles.intervalBarContainer}>
          <View style={styles.timeRangeSelectorWrap}>
            <Box twClassName="w-full">
              <IntervalBar
                selectedInterval={displayInterval}
                onIntervalSelect={handleInlineIntervalSelect}
                chartType={chartType}
                onChartTypeSelect={handleChartTypeSelect}
              />
            </Box>
          </View>
        </View>
      )}
      <Box
        twClassName={isTechnicalIndicatorsEnabled ? 'w-full' : 'mt-3 w-full'}
      >
        <View
          testID="advanced-chart-touch-container"
          style={[styles.chartContainer, { height: chartHeight }]}
        >
          {Platform.OS === 'ios' && (
            <View style={styles.edgeOverlay} pointerEvents="box-only" />
          )}
          {useAmbientColor && initialAmbientColor === undefined ? (
            <Skeleton height={chartHeight} width="100%" />
          ) : (
            <AdvancedChart
              ohlcvData={ohlcvData}
              ohlcvSeriesKey={ohlcvSeriesKey}
              webViewInstanceKey={
                isTechnicalIndicatorsEnabled
                  ? chartWebViewSessionKey
                  : undefined
              }
              realtimeBar={realtimeBar}
              height={chartHeight}
              showVolume={
                isTechnicalIndicatorsEnabled
                  ? chartType === ChartType.Candles &&
                    activeIndicators.has('Volume')
                  : chartType === ChartType.Candles
              }
              volumeOverlay
              chartType={chartType}
              indicators={showChartIndicators ? indicatorsArray : []}
              selectedMAs={showChartIndicators ? selectedMAs : []}
              lineChrome={
                advancedChartLineChromePresets.tokenOverview.lineChrome
              }
              subPaneHeightRatio={
                advancedChartLineChromePresets.tokenOverview.subPaneHeightRatio
              }
              useSubscriptPriceFormat={
                advancedChartLineChromePresets.tokenOverview
                  .useSubscriptPriceFormat
              }
              isLoading={
                isTechnicalIndicatorsEnabled
                  ? !hasChartBeenRevealed && chartLoading
                  : chartLoading
              }
              ohlcvPagination={ohlcvPagination}
              visibleFromMs={visibleFromMs}
              visibleToMs={visibleToMs}
              onCrosshairMove={handleCrosshairMove}
              onChartInteracted={handleChartInteracted}
              onChartTradingViewClicked={handleChartTradingViewClicked}
              onSkeletonHidden={handleAdvancedChartSkeletonHidden}
              onChartLayoutSettled={
                isTechnicalIndicatorsEnabled
                  ? handleAdvancedChartLayoutSettled
                  : undefined
              }
              onError={handleAdvancedChartError}
              onInitFailed={handleAdvancedChartInitFailed}
              lineColorOverride={initialAmbientColor}
              successColorOverride={
                initialAmbientColor ? ambientSuccessGreen : undefined
              }
              errorColorOverride={
                initialAmbientColor ? AMBIENT_NEGATIVE_COLOR : undefined
              }
              legendOverlay={tokenDetailsLegendOverlay}
            />
          )}
        </View>
      </Box>
      {/* IndicatorBar appears when not loading */}
      {shouldShowTechnicalIndicators && chartType === ChartType.Candles ? (
        <Box twClassName="w-full mt-4 mb-6">
          <IndicatorBar
            maLabel={maLabel}
            onMAPress={handleMAPress}
            activeIndicators={activeIndicators}
            onIndicatorToggle={handleIndicatorToggle}
          />
        </Box>
      ) : isTechnicalIndicatorsEnabled &&
        chartType === ChartType.Candles &&
        !shouldShowTechnicalIndicators ? (
        <Box twClassName="w-full px-4 mt-4 mb-6">
          <Skeleton height={37} width="100%" />
        </Box>
      ) : !shouldShowTechnicalIndicators && !isTechnicalIndicatorsEnabled ? (
        <View style={styles.timeRangeContainer}>
          <View style={styles.timeRangeSelectorWrap}>
            <TimeRangeSelector
              isChartLoading={isInitialChartPending}
              selected={timeRange}
              onSelect={handleTimeRangeSelect}
              chartType={chartType}
              onChartTypeToggle={toggleChartType}
              selectedColor={initialAmbientColor}
            />
          </View>
        </View>
      ) : (
        <Box twClassName="pb-4" />
      )}
    </>
  );
};

export default PriceAdvanced;

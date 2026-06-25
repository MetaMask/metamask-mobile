import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { Linking, View } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import type { WebViewOpenWindowEvent } from '@metamask/react-native-webview/lib/WebViewTypes';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import performance from 'react-native-performance';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet, { DEFAULT_CHART_HEIGHT } from './AdvancedChart.styles';
import {
  createAdvancedChartTemplate,
  CHARTING_LIBRARY_BASE_URL,
} from './AdvancedChartTemplate';
import {
  ChartType,
  DEFAULT_DISABLED_FEATURES,
  parseWebViewMessage,
  resolveLineChromeOptions,
  resolveCurrentPriceColor,
  type AdvancedChartProps,
  type AdvancedChartRef,
  type ChartRangeSettlePayload,
  type IndicatorType,
  type OHLCVBar,
  type OHLCVPaginationConfig,
  type RNToWebViewMessage,
} from './AdvancedChart.types';

const openInAppBrowser = (url: string) => {
  const fallback = () => {
    try {
      Linking.openURL(url);
    } catch {
      /* noop */
    }
  };
  try {
    InAppBrowser.isAvailable()
      .then((available) =>
        available ? InAppBrowser.open(url) : Linking.openURL(url),
      )
      .catch(fallback);
  } catch {
    fallback();
  }
};

/**
 * Generic TradingView Advanced Chart component.
 *
 * Renders a professional charting widget inside a WebView.
 * Designed to be consumed by multiple features (Token Details, Perps, etc.)
 * with a composable props API -- each consumer uses only the props it needs.
 *
 * ATTRIBUTION NOTICE:
 * TradingView Advanced Charts (TM)
 * Copyright (c) 2025 TradingView, Inc. https://www.tradingview.com/
 */

/** Hide layout skeleton if WebView never sends `CHART_LAYOUT_SETTLED` (e.g. older HTML). */
const LAYOUT_SETTLE_FALLBACK_MS = 2500;

/** Defer indicator/MA sync until layout settles; fallback if WebView never posts settle. */
const INDICATORS_SYNC_FALLBACK_MS = 500;

/** Debounce TradingView external opens (redirect chains can fire multiple navigation requests). */
const TRADINGVIEW_OPEN_DEBOUNCE_MS = 800;

interface ChartTimingSnapshot {
  seriesStartMs: number;
  webViewLoadEndMs?: number;
  chartReadyMs?: number;
  setOhlcvDataMs?: number;
  rangeAppliedMs?: number;
}

const AdvancedChart = forwardRef<AdvancedChartRef, AdvancedChartProps>(
  (
    {
      ohlcvData,
      ohlcvSeriesKey,
      webViewInstanceKey,
      height = DEFAULT_CHART_HEIGHT,
      realtimeBar,
      ohlcvPagination,
      indicators = [],
      selectedMAs = [],
      positionLines,
      chartType,
      showVolume = false,
      volumeOverlay = false,
      enableDrawingTools = false,
      disabledFeatures = DEFAULT_DISABLED_FEATURES,
      onChartReady,
      onSkeletonHidden,
      onChartLayoutSettled,
      onError,
      onInitFailed,
      onCrosshairMove,
      onChartInteracted,
      onChartTradingViewClicked,
      isLoading = false,
      lineChrome,
      subPaneHeightRatio,
      useSubscriptPriceFormat,
      visibleFromMs,
      visibleToMs,
      lineColorOverride,
      successColorOverride,
      errorColorOverride,
      legendOverlay,
      currentPriceLineColorOverride,
      labelStyleOverrides,
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {
      height,
    });
    const webViewRef = useRef<WebView>(null);
    const [chartReadyCount, setChartReadyCount] = useState(0);
    const isChartReady = chartReadyCount > 0;
    const [webViewError, setWebViewError] = useState<string | null>(null);
    /**
     * After `CHART_READY`, a full `SET_OHLCV_DATA` (new series key, first bars, or large length
     * change) still leaves TradingView applying scale/layout asynchronously. We keep the skeleton
     * until the WebView posts `CHART_LAYOUT_SETTLED` (see deferred settle in chartLogic) or the
     * `LAYOUT_SETTLE_FALLBACK_MS` timer, so the canvas does not flash empty or half-drawn.
     */
    const [layoutSettling, setLayoutSettling] = useState(false);
    const layoutSettleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );
    /** Gate ADD_INDICATOR / SET_MA_VISIBILITY until post-OHLCV layout settle (see chartLogic). */
    const [indicatorsSyncReady, setIndicatorsSyncReady] = useState(false);
    const indicatorsSyncFallbackRef = useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

    const activeIndicatorsRef = useRef<Set<IndicatorType>>(new Set());
    const [appliedIndicatorCount, setAppliedIndicatorCount] = useState(0);
    const [legendRendered, setLegendRendered] = useState(false);
    const [webViewLoaded, setWebViewLoaded] = useState(false);
    const webViewLoadedRef = useRef(false);
    const prevPositionLinesRef = useRef(positionLines);
    const prevChartTypeRef = useRef(chartType);
    const prevOhlcvDataRef = useRef<OHLCVBar[]>([]);
    const prevOhlcvSeriesKeyRef = useRef<string | undefined>(undefined);
    /** When non-null, `ohlcvData` is still the previous series' array; skip sync until the hook replaces it. */
    const ohlcvSeriesStaleSnapshotRef = useRef<OHLCVBar[] | null>(null);
    const tradingViewOpenInterceptRef = useRef(0);
    const skeletonHiddenReportedRef = useRef(false);
    const seriesGenerationRef = useRef(0);
    const activeSettleGenerationRef = useRef<number | null>(null);
    const activeSettleRequiresRangeProofRef = useRef(false);
    const rangeSettlePayloadRef = useRef<ChartRangeSettlePayload | undefined>(
      undefined,
    );
    const pendingSeriesSettleRef = useRef(false);
    const webViewRemountedGenerationsRef = useRef<Set<number>>(new Set());
    const markNextGenerationAsRemountedRef = useRef(false);
    const [webViewRemountNonce, setWebViewRemountNonce] = useState(0);
    const resolvedWebViewKey = `${webViewInstanceKey ?? 'default'}-${webViewRemountNonce}`;
    const chartTimingRef = useRef<ChartTimingSnapshot>({
      seriesStartMs: performance.now(),
    });

    // Track the color overrides baked into the current HTML template so the
    // SET_THEME_COLORS effect can skip sending when colors haven't diverged.
    // Refs are updated synchronously inside the useMemo below (not in a post-render
    // effect) so the snapshot is always in sync with what was actually baked, even
    // when multiple deps change in the same render cycle.
    const initialLineColorRef = useRef(lineColorOverride);
    const initialSuccessColorRef = useRef(successColorOverride);
    const initialErrorColorRef = useRef(errorColorOverride);
    const initialCurrentPriceColorRef = useRef(
      resolveCurrentPriceColor({
        lastValuePillColor: labelStyleOverrides?.lastValuePillColor,
        currentPriceLineColorOverride,
        lineColorOverride,
        successColorOverride,
        themeSuccessDefault: theme.colors.success.default,
      }),
    );
    const themeColorsSentRef = useRef(false);

    const htmlContent = useMemo(() => {
      // Snapshot current prop values at the moment the template is created.
      // This must happen inside useMemo (not in a separate effect) so the refs
      // reflect what is actually baked, preventing a stale-color race where a
      // simultaneous non-color dep change causes the SET_THEME_COLORS effect to
      // see "colors already match" and skip a needed hot-swap.
      initialLineColorRef.current = lineColorOverride;
      initialSuccessColorRef.current = successColorOverride;
      initialErrorColorRef.current = errorColorOverride;
      initialCurrentPriceColorRef.current = resolveCurrentPriceColor({
        lastValuePillColor: labelStyleOverrides?.lastValuePillColor,
        currentPriceLineColorOverride,
        lineColorOverride,
        successColorOverride,
        themeSuccessDefault: theme.colors.success.default,
      });
      return createAdvancedChartTemplate(theme, {
        enableDrawingTools,
        disabledFeatures,
        lineChrome,
        useSubscriptPriceFormat,
        lineColorOverride,
        successColorOverride,
        errorColorOverride,
        currentPriceLineColorOverride,
        labelStyleOverrides,
        legendOverlay,
      });
      // lineColorOverride/successColorOverride/errorColorOverride/currentPriceLineColorOverride
      // intentionally excluded — color changes hot-swap via SET_THEME_COLORS without
      // rebuilding the WebView.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      theme,
      enableDrawingTools,
      disabledFeatures,
      lineChrome,
      useSubscriptPriceFormat,
      labelStyleOverrides,
      legendOverlay,
    ]);

    // ---- Helpers ----

    const postMessage = useCallback((message: RNToWebViewMessage) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }, []);

    const clearLayoutSettleTimeout = useCallback(() => {
      const t = layoutSettleTimeoutRef.current;
      if (t !== null) {
        clearTimeout(t);
        layoutSettleTimeoutRef.current = null;
      }
    }, []);

    const clearIndicatorsSyncFallback = useCallback(() => {
      const t = indicatorsSyncFallbackRef.current;
      if (t !== null) {
        clearTimeout(t);
        indicatorsSyncFallbackRef.current = null;
      }
    }, []);

    const markIndicatorsSyncReady = useCallback(() => {
      clearIndicatorsSyncFallback();
      setIndicatorsSyncReady(true);
    }, [clearIndicatorsSyncFallback]);

    const scheduleIndicatorsSyncFallback = useCallback(() => {
      clearIndicatorsSyncFallback();
      indicatorsSyncFallbackRef.current = setTimeout(() => {
        indicatorsSyncFallbackRef.current = null;
        markIndicatorsSyncReady();
      }, INDICATORS_SYNC_FALLBACK_MS);
    }, [clearIndicatorsSyncFallback, markIndicatorsSyncReady]);

    const resetChartTiming = useCallback(() => {
      chartTimingRef.current = { seriesStartMs: performance.now() };
    }, []);

    const getRoundedDuration = useCallback(
      (startMs: number | undefined, endMs: number | undefined) => {
        if (startMs === undefined || endMs === undefined) {
          return undefined;
        }
        return Math.max(0, Math.round(endMs - startMs));
      },
      [],
    );

    const getChartTimingPayload = useCallback(
      (
        options: {
          rangeAppliedMs?: number;
          skeletonHiddenMs?: number;
        } = {},
      ): Partial<ChartRangeSettlePayload> => {
        const {
          seriesStartMs,
          webViewLoadEndMs,
          chartReadyMs,
          setOhlcvDataMs,
        } = chartTimingRef.current;
        const rangeAppliedMs =
          options.rangeAppliedMs ?? chartTimingRef.current.rangeAppliedMs;

        return {
          ...(getRoundedDuration(seriesStartMs, webViewLoadEndMs) !== undefined
            ? {
                seriesStartToWebViewLoadEndMs: getRoundedDuration(
                  seriesStartMs,
                  webViewLoadEndMs,
                ),
              }
            : {}),
          ...(getRoundedDuration(seriesStartMs, chartReadyMs) !== undefined
            ? {
                seriesStartToChartReadyMs: getRoundedDuration(
                  seriesStartMs,
                  chartReadyMs,
                ),
              }
            : {}),
          ...(getRoundedDuration(seriesStartMs, setOhlcvDataMs) !== undefined
            ? {
                seriesStartToSetOhlcvDataMs: getRoundedDuration(
                  seriesStartMs,
                  setOhlcvDataMs,
                ),
              }
            : {}),
          ...(getRoundedDuration(seriesStartMs, rangeAppliedMs) !== undefined
            ? {
                seriesStartToRangeAppliedMs: getRoundedDuration(
                  seriesStartMs,
                  rangeAppliedMs,
                ),
              }
            : {}),
          ...(getRoundedDuration(seriesStartMs, options.skeletonHiddenMs) !==
          undefined
            ? {
                seriesStartToSkeletonHiddenMs: getRoundedDuration(
                  seriesStartMs,
                  options.skeletonHiddenMs,
                ),
              }
            : {}),
          ...(getRoundedDuration(webViewLoadEndMs, chartReadyMs) !== undefined
            ? {
                webViewLoadEndToChartReadyMs: getRoundedDuration(
                  webViewLoadEndMs,
                  chartReadyMs,
                ),
              }
            : {}),
          ...(getRoundedDuration(setOhlcvDataMs, rangeAppliedMs) !== undefined
            ? {
                setOhlcvDataToRangeAppliedMs: getRoundedDuration(
                  setOhlcvDataMs,
                  rangeAppliedMs,
                ),
              }
            : {}),
        };
      },
      [getRoundedDuration],
    );

    const withChartTimingPayload = useCallback(
      (
        payload: ChartRangeSettlePayload,
        options?: {
          rangeAppliedMs?: number;
          skeletonHiddenMs?: number;
        },
      ): ChartRangeSettlePayload => ({
        ...payload,
        ...getChartTimingPayload(options),
      }),
      [getChartTimingPayload],
    );

    const resetWebViewRuntimeState = useCallback(() => {
      skeletonHiddenReportedRef.current = false;
      activeSettleGenerationRef.current = null;
      activeSettleRequiresRangeProofRef.current = false;
      rangeSettlePayloadRef.current = undefined;
      pendingSeriesSettleRef.current = false;
      setChartReadyCount(0);
      setWebViewLoaded(false);
      webViewLoadedRef.current = false;
      setLayoutSettling(false);
      clearLayoutSettleTimeout();
      setWebViewError(null);
      activeIndicatorsRef.current.clear();
      setAppliedIndicatorCount(0);
      setLegendRendered(false);
      setIndicatorsSyncReady(false);
      clearIndicatorsSyncFallback();
      prevPositionLinesRef.current = undefined;
      prevChartTypeRef.current = undefined;
      prevOhlcvDataRef.current = [];
      prevOhlcvSeriesKeyRef.current = undefined;
      ohlcvSeriesStaleSnapshotRef.current = null;
      themeColorsSentRef.current = false;
      resetChartTiming();
    }, [
      clearLayoutSettleTimeout,
      clearIndicatorsSyncFallback,
      resetChartTiming,
    ]);

    // Reset all chart state when the WebView reloads due to htmlContent changes.
    useEffect(() => {
      resetWebViewRuntimeState();
    }, [htmlContent, resetWebViewRuntimeState]);

    const beginFullOhlcvLayoutSettle = useCallback(
      (
        seriesGeneration?: number,
        shouldReportSkeleton = true,
        shouldWaitForSettle = activeSettleRequiresRangeProofRef.current,
      ) => {
        if (shouldReportSkeleton) {
          skeletonHiddenReportedRef.current = false;
          pendingSeriesSettleRef.current = shouldWaitForSettle;
        } else {
          pendingSeriesSettleRef.current = false;
        }
        rangeSettlePayloadRef.current = undefined;
        if (!isChartReady && !activeSettleRequiresRangeProofRef.current) {
          return;
        }
        setLayoutSettling(true);
        clearLayoutSettleTimeout();
        layoutSettleTimeoutRef.current = setTimeout(() => {
          layoutSettleTimeoutRef.current = null;
          if (
            seriesGeneration !== undefined &&
            activeSettleGenerationRef.current !== seriesGeneration
          ) {
            return;
          }
          if (seriesGeneration !== undefined) {
            const remounted =
              webViewRemountedGenerationsRef.current.has(seriesGeneration);
            rangeSettlePayloadRef.current = {
              seriesGeneration,
              rangeStatus: 'fallback',
              webViewRemounted: remounted,
              ...getChartTimingPayload(),
            };
            webViewRemountedGenerationsRef.current.delete(seriesGeneration);
          }
          pendingSeriesSettleRef.current = false;
          setLayoutSettling(false);
        }, LAYOUT_SETTLE_FALLBACK_MS);
      },
      [isChartReady, clearLayoutSettleTimeout, getChartTimingPayload],
    );

    const completeLayoutSettle = useCallback(
      (payload?: ChartRangeSettlePayload) => {
        if (
          !payload &&
          activeSettleGenerationRef.current !== null &&
          activeSettleRequiresRangeProofRef.current
        ) {
          return;
        }
        if (
          payload?.seriesGeneration !== undefined &&
          activeSettleGenerationRef.current !== payload.seriesGeneration
        ) {
          return;
        }

        const payloadWithRemount =
          payload &&
          webViewRemountedGenerationsRef.current.has(payload.seriesGeneration)
            ? { ...payload, webViewRemounted: true }
            : payload;

        if (payload) {
          webViewRemountedGenerationsRef.current.delete(
            payload.seriesGeneration,
          );
        }
        activeSettleRequiresRangeProofRef.current = false;
        rangeSettlePayloadRef.current = payloadWithRemount;
        pendingSeriesSettleRef.current = false;
        clearLayoutSettleTimeout();
        setLayoutSettling(false);
      },
      [clearLayoutSettleTimeout],
    );

    const requestFallbackRemount = useCallback(() => {
      markNextGenerationAsRemountedRef.current = true;
      resetWebViewRuntimeState();
      setWebViewRemountNonce((nonce) => nonce + 1);
    }, [resetWebViewRuntimeState]);

    const useIntervalHotReload = webViewInstanceKey !== undefined;

    const beginPendingSeriesSettle = useCallback(
      (shouldReportSkeleton: boolean) => {
        if (shouldReportSkeleton) {
          skeletonHiddenReportedRef.current = false;
          pendingSeriesSettleRef.current = true;
        } else {
          pendingSeriesSettleRef.current = false;
        }
        rangeSettlePayloadRef.current = undefined;
        setLayoutSettling(true);
        clearLayoutSettleTimeout();
        layoutSettleTimeoutRef.current = setTimeout(() => {
          layoutSettleTimeoutRef.current = null;
          pendingSeriesSettleRef.current = false;
          setLayoutSettling(false);
        }, LAYOUT_SETTLE_FALLBACK_MS);
      },
      [clearLayoutSettleTimeout],
    );

    useEffect(() => {
      if (ohlcvSeriesKey === undefined) {
        return;
      }
      resetChartTiming();
      beginPendingSeriesSettle(
        !useIntervalHotReload && prevOhlcvSeriesKeyRef.current !== undefined,
      );
      ohlcvSeriesStaleSnapshotRef.current =
        prevOhlcvSeriesKeyRef.current !== undefined
          ? prevOhlcvDataRef.current
          : null;
    }, [
      ohlcvSeriesKey,
      useIntervalHotReload,
      resetChartTiming,
      beginPendingSeriesSettle,
    ]);

    // Remount only for explicit WebView instance changes (asset/currency) or fallback.
    useEffect(() => {
      if (!useIntervalHotReload || !webViewInstanceKey) {
        return;
      }
      resetWebViewRuntimeState();
    }, [useIntervalHotReload, webViewInstanceKey, resetWebViewRuntimeState]);

    useEffect(
      () => () => {
        clearLayoutSettleTimeout();
        clearIndicatorsSyncFallback();
      },
      [clearLayoutSettleTimeout, clearIndicatorsSyncFallback],
    );

    const paginationRef = useRef<OHLCVPaginationConfig | undefined>(
      ohlcvPagination,
    );
    paginationRef.current = ohlcvPagination;

    const visibleFromMsRef = useRef<number | undefined>(visibleFromMs);
    visibleFromMsRef.current = visibleFromMs;

    const visibleToMsRef = useRef<number | undefined>(visibleToMs);
    visibleToMsRef.current = visibleToMs;

    const sendOHLCVData = useCallback(
      (data: OHLCVBar[]) => {
        const seriesGeneration = seriesGenerationRef.current + 1;
        seriesGenerationRef.current = seriesGeneration;
        activeSettleGenerationRef.current = seriesGeneration;
        activeSettleRequiresRangeProofRef.current =
          visibleFromMsRef.current !== undefined;
        chartTimingRef.current.setOhlcvDataMs = performance.now();
        if (markNextGenerationAsRemountedRef.current) {
          markNextGenerationAsRemountedRef.current = false;
          webViewRemountedGenerationsRef.current.add(seriesGeneration);
        }
        beginFullOhlcvLayoutSettle(
          seriesGeneration,
          !useIntervalHotReload || !skeletonHiddenReportedRef.current,
          activeSettleRequiresRangeProofRef.current ||
            (!useIntervalHotReload &&
              prevOhlcvSeriesKeyRef.current !== undefined),
        );
        postMessage({
          type: 'SET_OHLCV_DATA',
          payload: {
            data,
            seriesGeneration,
            pagination: paginationRef.current,
            visibleFromMs: visibleFromMsRef.current,
            visibleToMs: visibleToMsRef.current,
          },
        });
      },
      [beginFullOhlcvLayoutSettle, postMessage, useIntervalHotReload],
    );

    const addIndicator = useCallback(
      (indicator: IndicatorType, inputs?: Record<string, unknown>) => {
        if (!isChartReady) return;
        postMessage({
          type: 'ADD_INDICATOR',
          payload: { name: indicator, inputs },
        });
      },
      [isChartReady, postMessage],
    );

    const removeIndicator = useCallback(
      (indicator: IndicatorType) => {
        if (!isChartReady) return;
        postMessage({
          type: 'REMOVE_INDICATOR',
          payload: { name: indicator },
        });
      },
      [isChartReady, postMessage],
    );

    const setChartTypeInternal = useCallback(
      (type: ChartType) => {
        if (!isChartReady) return;
        postMessage({
          type: 'SET_CHART_TYPE',
          payload: { type },
        });
      },
      [isChartReady, postMessage],
    );

    /**
     * Opens a TradingView URL in the in-app browser, fires analytics,
     * and dedupes across onOpenWindow and postMessage channels.
     */
    const handleTradingViewOpen = useCallback(
      (url: string) => {
        const now = Date.now();
        if (
          now - tradingViewOpenInterceptRef.current <
          TRADINGVIEW_OPEN_DEBOUNCE_MS
        ) {
          return;
        }
        tradingViewOpenInterceptRef.current = now;
        openInAppBrowser(url);
        onChartTradingViewClicked?.();
      },
      [onChartTradingViewClicked],
    );

    const handleOpenWindow = useCallback(
      (event: WebViewOpenWindowEvent) => {
        handleTradingViewOpen(event.nativeEvent.targetUrl);
      },
      [handleTradingViewOpen],
    );

    // ---- WebView message handling ----

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        let raw: unknown;
        try {
          raw = JSON.parse(event.nativeEvent.data);
        } catch {
          return;
        }

        const message = parseWebViewMessage(raw);
        if (!message) return;

        switch (message.type) {
          case 'CHART_READY':
            chartTimingRef.current.chartReadyMs = performance.now();
            activeIndicatorsRef.current.clear();
            setAppliedIndicatorCount(0);
            setLegendRendered(false);
            prevPositionLinesRef.current = undefined;
            prevChartTypeRef.current = undefined;
            setIndicatorsSyncReady(false);
            scheduleIndicatorsSyncFallback();
            if (!activeSettleRequiresRangeProofRef.current) {
              clearLayoutSettleTimeout();
              setLayoutSettling(false);
            }
            setChartReadyCount((c) => c + 1);
            setWebViewError(null);
            onChartReady?.();
            break;

          case 'CHART_LAYOUT_SETTLED':
            completeLayoutSettle(
              message.payload
                ? withChartTimingPayload(message.payload)
                : message.payload,
            );
            markIndicatorsSyncReady();
            onChartLayoutSettled?.();
            break;

          case 'CHART_RANGE_APPLIED':
            if (message.payload.latestBarVisible !== false) {
              const rangeAppliedMs = performance.now();
              chartTimingRef.current.rangeAppliedMs = rangeAppliedMs;
              completeLayoutSettle(
                withChartTimingPayload(message.payload, { rangeAppliedMs }),
              );
            }
            break;

          case 'CHART_RANGE_APPLY_FAILED':
            if (
              activeSettleGenerationRef.current ===
              message.payload.seriesGeneration
            ) {
              chartTimingRef.current.rangeAppliedMs = performance.now();
              requestFallbackRemount();
            }
            break;

          case 'INDICATOR_ADDED':
            activeIndicatorsRef.current.add(message.payload.name);
            setAppliedIndicatorCount(activeIndicatorsRef.current.size);
            break;

          case 'INDICATOR_REMOVED':
            activeIndicatorsRef.current.delete(message.payload.name);
            setAppliedIndicatorCount(activeIndicatorsRef.current.size);
            break;

          case 'LEGEND_RENDERED':
            setLegendRendered(true);
            break;

          case 'CROSSHAIR_MOVE':
            onCrosshairMove?.(message.payload.data);
            break;

          case 'CHART_INTERACTED':
            onChartInteracted?.(message.payload);
            break;

          case 'CHART_TRADINGVIEW_CLICKED': {
            const bridgeUrl = message.payload?.url;
            if (typeof bridgeUrl === 'string' && bridgeUrl.length > 0) {
              handleTradingViewOpen(bridgeUrl);
            }
            break;
          }

          case 'ERROR':
            if (!isChartReady) {
              if (onInitFailed) {
                onInitFailed(message.payload.message);
              } else {
                setWebViewError(message.payload.message);
                onError?.(message.payload.message);
              }
            } else {
              onError?.(message.payload.message);
            }
            break;

          default:
            break;
        }
      },
      [
        isChartReady,
        clearLayoutSettleTimeout,
        scheduleIndicatorsSyncFallback,
        markIndicatorsSyncReady,
        completeLayoutSettle,
        requestFallbackRemount,
        onChartReady,
        onChartLayoutSettled,
        onError,
        onInitFailed,
        onCrosshairMove,
        onChartInteracted,
        handleTradingViewOpen,
        withChartTimingPayload,
      ],
    );

    const handleWebViewError = useCallback(
      (syntheticEvent: { nativeEvent: { description: string } }) => {
        const { description } = syntheticEvent.nativeEvent;
        if (!isChartReady && onInitFailed) {
          onInitFailed(description);
          return;
        }
        setWebViewError(description);
        onError?.(description);
      },
      [isChartReady, onInitFailed, onError],
    );

    const handleLoadEnd = useCallback(() => {
      chartTimingRef.current.webViewLoadEndMs = performance.now();
      setWebViewLoaded(true);
      webViewLoadedRef.current = true;
    }, []);

    // ---- Ref API ----

    useImperativeHandle(
      ref,
      () => ({
        addIndicator,
        removeIndicator,
        setChartType: setChartTypeInternal,
        reset: () => {
          clearLayoutSettleTimeout();
          setLayoutSettling(false);
          setChartReadyCount(0);
          setWebViewLoaded(false);
          webViewLoadedRef.current = false;
          setWebViewError(null);
          activeIndicatorsRef.current.clear();
          prevPositionLinesRef.current = undefined;
          prevChartTypeRef.current = undefined;
          prevOhlcvDataRef.current = [];
          prevOhlcvSeriesKeyRef.current = undefined;
          ohlcvSeriesStaleSnapshotRef.current = null;
          activeSettleGenerationRef.current = null;
          activeSettleRequiresRangeProofRef.current = false;
          rangeSettlePayloadRef.current = undefined;
          markNextGenerationAsRemountedRef.current = false;
          webViewRef.current?.reload();
        },
      }),
      [
        addIndicator,
        removeIndicator,
        setChartTypeInternal,
        clearLayoutSettleTimeout,
      ],
    );

    // ---- Declarative prop syncing ----

    useEffect(() => {
      if (ohlcvData.length === 0 || !webViewLoaded) {
        return;
      }

      if (ohlcvSeriesStaleSnapshotRef.current !== null) {
        if (ohlcvData !== ohlcvSeriesStaleSnapshotRef.current) {
          ohlcvSeriesStaleSnapshotRef.current = null;
        } else {
          return;
        }
      }

      const prevData = prevOhlcvDataRef.current;

      if (
        ohlcvSeriesKey !== undefined &&
        ohlcvSeriesKey !== prevOhlcvSeriesKeyRef.current
      ) {
        sendOHLCVData(ohlcvData);
        prevOhlcvDataRef.current = ohlcvData;
        prevOhlcvSeriesKeyRef.current = ohlcvSeriesKey;
        return;
      }

      // If this is the first load or data length changed significantly, send full dataset
      if (
        prevData.length === 0 ||
        Math.abs(ohlcvData.length - prevData.length) > 1
      ) {
        sendOHLCVData(ohlcvData);
        prevOhlcvDataRef.current = ohlcvData;
        if (ohlcvSeriesKey !== undefined) {
          prevOhlcvSeriesKeyRef.current = ohlcvSeriesKey;
        }
        return;
      }

      // If only the last candle changed (polling update), use REALTIME_UPDATE instead
      const lastCandle = ohlcvData[ohlcvData.length - 1];
      const prevLastCandle = prevData[prevData.length - 1];

      if (
        lastCandle &&
        prevLastCandle &&
        (lastCandle.time !== prevLastCandle.time ||
          lastCandle.close !== prevLastCandle.close ||
          lastCandle.high !== prevLastCandle.high ||
          lastCandle.low !== prevLastCandle.low ||
          lastCandle.volume !== prevLastCandle.volume)
      ) {
        postMessage({
          type: 'REALTIME_UPDATE',
          payload: { bar: lastCandle },
        });
        prevOhlcvDataRef.current = ohlcvData;
        return;
      }

      prevOhlcvDataRef.current = ohlcvData;
    }, [ohlcvData, ohlcvSeriesKey, webViewLoaded, sendOHLCVData, postMessage]);

    // Send initial chartType as soon as WebView loads (before chart is ready)
    // This prevents the flash of default chart type during initialization
    useEffect(() => {
      if (!webViewLoaded || chartType === undefined) return;
      if (prevChartTypeRef.current !== undefined) return;
      prevChartTypeRef.current = chartType;
      postMessage({
        type: 'SET_CHART_TYPE',
        payload: { type: chartType },
      });
    }, [webViewLoaded, chartType, postMessage]);

    // Forward real-time bar updates to WebView
    useEffect(() => {
      if (!isChartReady || !realtimeBar) return;
      postMessage({
        type: 'REALTIME_UPDATE',
        payload: { bar: realtimeBar },
      });
    }, [realtimeBar, isChartReady, postMessage]);

    // Sync indicators prop (depends on chartReadyCount to re-fire on chart recreation)
    useEffect(() => {
      if (chartReadyCount === 0 || !indicatorsSyncReady) return;

      const currentIndicators = new Set(indicators);
      const active = activeIndicatorsRef.current;

      indicators.forEach((indicator) => {
        if (!active.has(indicator)) {
          addIndicator(indicator);
        }
      });

      active.forEach((indicator) => {
        if (!currentIndicators.has(indicator)) {
          removeIndicator(indicator);
        }
      });
    }, [
      indicators,
      chartReadyCount,
      indicatorsSyncReady,
      addIndicator,
      removeIndicator,
    ]);

    useEffect(() => {
      if (chartReadyCount === 0 || !indicatorsSyncReady) return;

      postMessage({
        type: 'SET_MA_VISIBILITY',
        payload: { visible: selectedMAs },
      });
    }, [selectedMAs, chartReadyCount, indicatorsSyncReady, postMessage]);

    // Sync positionLines prop
    useEffect(() => {
      if (chartReadyCount === 0) return;
      if (positionLines === prevPositionLinesRef.current) return;
      prevPositionLinesRef.current = positionLines;

      postMessage({
        type: 'SET_POSITION_LINES',
        payload: { position: positionLines ?? null },
      });
    }, [positionLines, chartReadyCount, postMessage]);

    // Sync chartType prop
    useEffect(() => {
      if (chartReadyCount === 0 || chartType === undefined) return;
      if (chartType === prevChartTypeRef.current) return;
      prevChartTypeRef.current = chartType;
      setChartTypeInternal(chartType);
    }, [chartType, chartReadyCount, setChartTypeInternal]);

    // Sync showVolume + optional volumeOverlay (fires on chart ready)
    useEffect(() => {
      if (chartReadyCount === 0) return;
      postMessage({
        type: 'TOGGLE_VOLUME',
        payload: { visible: showVolume, volumeOverlay },
      });
    }, [showVolume, volumeOverlay, chartReadyCount, postMessage]);

    // Line / chart chrome: always send resolved payload after CHART_READY (matches inline CONFIG).
    useEffect(() => {
      if (chartReadyCount === 0) return;
      postMessage({
        type: 'SET_LINE_CHROME',
        payload: resolveLineChromeOptions(lineChrome),
      });
    }, [lineChrome, chartReadyCount, postMessage]);

    useEffect(() => {
      if (chartReadyCount === 0) return;
      postMessage({
        type: 'SET_SUB_PANE_LAYOUT',
        payload: { heightRatio: subPaneHeightRatio ?? null },
      });
    }, [subPaneHeightRatio, chartReadyCount, postMessage]);

    // Hot-swap chart colors via postMessage whenever overrides change.
    // Gates on webViewLoaded (not chartReady) so messages sent during chart
    // init get queued in pendingMessages and drained inside onChartReady —
    // before the first overlay paint — eliminating stale-color flashes.
    // Skips only the very first invocation (mount) when all color overrides still match
    // the HTML template; all subsequent changes always send.
    useEffect(() => {
      if (!webViewLoaded) return;
      if (!themeColorsSentRef.current) {
        const effectiveCurrentPriceColor = resolveCurrentPriceColor({
          lastValuePillColor: labelStyleOverrides?.lastValuePillColor,
          currentPriceLineColorOverride,
          lineColorOverride,
          successColorOverride,
          themeSuccessDefault: theme.colors.success.default,
        });
        // First run after webViewLoaded: skip only if colors still match template
        const colorsMatch =
          lineColorOverride === initialLineColorRef.current &&
          successColorOverride === initialSuccessColorRef.current &&
          errorColorOverride === initialErrorColorRef.current &&
          effectiveCurrentPriceColor === initialCurrentPriceColorRef.current;
        themeColorsSentRef.current = true;
        if (colorsMatch) return;
      }
      const effectiveSuccessColor =
        successColorOverride ?? theme.colors.success.default;
      const effectiveLineColor = lineColorOverride ?? effectiveSuccessColor;
      const effectiveErrorColor =
        errorColorOverride ?? theme.colors.error.default;
      const effectiveCurrentPriceColor = resolveCurrentPriceColor({
        lastValuePillColor: labelStyleOverrides?.lastValuePillColor,
        currentPriceLineColorOverride,
        lineColorOverride,
        successColorOverride,
        themeSuccessDefault: theme.colors.success.default,
      });
      postMessage({
        type: 'SET_THEME_COLORS',
        payload: {
          lineColor: effectiveLineColor,
          successColor: effectiveSuccessColor,
          errorColor: effectiveErrorColor,
          currentPriceColor: effectiveCurrentPriceColor,
        },
      });
    }, [
      lineColorOverride,
      successColorOverride,
      errorColorOverride,
      currentPriceLineColorOverride,
      labelStyleOverrides?.lastValuePillColor,
      webViewLoaded,
      postMessage,
      theme.colors.success.default,
      theme.colors.error.default,
    ]);

    // On first paint, wait for indicators/legend before hiding skeleton. After the chart
    // has been revealed once, keep it visible while users toggle indicators live.
    const expectedIndicators = useMemo(
      () => new Set([...indicators, ...selectedMAs]),
      [indicators, selectedMAs],
    );
    const awaitingInitialIndicatorPaint = !skeletonHiddenReportedRef.current;
    const waitingForIndicators =
      awaitingInitialIndicatorPaint &&
      isChartReady &&
      expectedIndicators.size > 0 &&
      activeIndicatorsRef.current.size < expectedIndicators.size;

    const waitingForLegend =
      awaitingInitialIndicatorPaint &&
      isChartReady &&
      legendOverlay?.enabled &&
      expectedIndicators.size > 0 &&
      !legendRendered;

    const isFirstReveal = !skeletonHiddenReportedRef.current;
    const skeletonPending =
      isLoading ||
      !isChartReady ||
      layoutSettling ||
      waitingForIndicators ||
      waitingForLegend;

    const showSkeleton = useIntervalHotReload
      ? isFirstReveal && skeletonPending
      : skeletonPending;

    useEffect(() => {
      if (webViewError) return;
      if (!onSkeletonHidden) return;
      if (isLoading || !isChartReady || layoutSettling) {
        return;
      }
      if (
        pendingSeriesSettleRef.current &&
        rangeSettlePayloadRef.current === undefined
      ) {
        return;
      }

      if (!skeletonHiddenReportedRef.current) {
        // If we expect indicators, wait for all of them to be painted
        if (
          expectedIndicators.size > 0 &&
          activeIndicatorsRef.current.size < expectedIndicators.size
        ) {
          return;
        }

        // If legend overlay is enabled and we have indicators, wait for it to render
        if (
          legendOverlay?.enabled &&
          expectedIndicators.size > 0 &&
          !legendRendered
        ) {
          return;
        }
      }

      // Hide skeleton
      if (skeletonHiddenReportedRef.current) return;
      skeletonHiddenReportedRef.current = true;
      onSkeletonHidden(
        rangeSettlePayloadRef.current
          ? withChartTimingPayload(rangeSettlePayloadRef.current, {
              skeletonHiddenMs: performance.now(),
            })
          : rangeSettlePayloadRef.current,
      );
    }, [
      isLoading,
      isChartReady,
      layoutSettling,
      webViewError,
      onSkeletonHidden,
      expectedIndicators,
      appliedIndicatorCount,
      legendOverlay,
      legendRendered,
      withChartTimingPayload,
    ]);

    // ---- Render ----

    if (webViewError) {
      return (
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMd} style={styles.errorText}>
            Failed to load chart: {webViewError}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.chartSurface}>
          <WebView
            key={`advanced-chart-${resolvedWebViewKey}`}
            ref={webViewRef}
            source={{ html: htmlContent, baseUrl: CHARTING_LIBRARY_BASE_URL }}
            style={styles.webview}
            onMessage={handleMessage}
            onOpenWindow={handleOpenWindow}
            onError={handleWebViewError}
            onLoadEnd={handleLoadEnd}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            webviewDebuggingEnabled={__DEV__}
            scrollEnabled={false}
            bounces={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            allowsInlineMediaPlayback
            androidLayerType="hardware"
            mixedContentMode="always"
          />
          {showSkeleton && (
            <Skeleton
              height={height}
              width="100%"
              style={styles.skeletonOverlay}
              testID="advanced-chart-skeleton"
            />
          )}
        </View>
      </View>
    );
  },
);

AdvancedChart.displayName = 'AdvancedChart';

export default AdvancedChart;

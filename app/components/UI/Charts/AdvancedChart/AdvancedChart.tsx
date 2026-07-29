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
  type AdvancedChartProps,
  type AdvancedChartRef,
  type FetchOlderBarsResponse,
  type IndicatorType,
  resolveCurrentPriceColor,
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

const AdvancedChart = forwardRef<AdvancedChartRef, AdvancedChartProps>(
  (
    {
      ohlcvData,
      ohlcvSeriesKey,
      webViewInstanceKey,
      height = DEFAULT_CHART_HEIGHT,
      realtimeBar,
      ohlcvPagination,
      rnBackedPagination,
      onFetchOlderBarsRequest,
      indicators = [],
      selectedMAs = [],
      positionLines,
      tradeMarkers,
      positionLineColors,
      chartType,
      showVolume = false,
      volumeOverlay = false,
      hidePaneSeparator = false,
      gridLineColorOverride,
      enableDrawingTools = false,
      disabledFeatures = DEFAULT_DISABLED_FEATURES,
      onChartReady,
      onSkeletonHidden,
      onChartLayoutSettled,
      onError,
      onInitFailed,
      onCrosshairMove,
      onTradeMarkerPress,
      onChartInteracted,
      onChartTradingViewClicked,
      isLoading = false,
      subPaneHeightRatio,
      useSubscriptPriceFormat,
      priceDecimals,
      visibleFromMs,
      visibleToMs,
      lineColorOverride,
      successColorOverride,
      errorColorOverride,
      legendOverlay,
      showBuiltInLegend,
      currentPriceLineColorOverride,
      labelStyleOverrides,
      scrollPassthrough = false,
      slbMode = false,
      volumeSuccessColorOverride,
      volumeErrorColorOverride,
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
    const prevTradeMarkersRef = useRef(tradeMarkers);
    const prevPositionLineColorsRef = useRef(positionLineColors);
    const prevChartTypeRef = useRef(chartType);
    const prevOhlcvDataRef = useRef<OHLCVBar[]>([]);
    const prevOhlcvSeriesKeyRef = useRef<string | undefined>(undefined);
    /** When non-null, `ohlcvData` is still the previous series' array; skip sync until the hook replaces it. */
    const ohlcvSeriesStaleSnapshotRef = useRef<OHLCVBar[] | null>(null);
    const tradingViewOpenInterceptRef = useRef(0);
    const skeletonHiddenReportedRef = useRef(false);
    const resolvedWebViewKey = webViewInstanceKey ?? ohlcvSeriesKey ?? '';

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
    const initialVolumeSuccessColorRef = useRef(volumeSuccessColorOverride);
    const initialVolumeErrorColorRef = useRef(volumeErrorColorOverride);
    const themeColorsSentRef = useRef(false);

    const htmlContent = useMemo(() => {
      // Snapshot current color-override prop values at the moment the template
      // is created so the SET_THEME_COLORS effect can skip a redundant send on
      // mount. Must happen inside useMemo (not a post-render effect) to avoid
      // a stale-color race when multiple deps change in the same render cycle.
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
      initialVolumeSuccessColorRef.current = volumeSuccessColorOverride;
      initialVolumeErrorColorRef.current = volumeErrorColorOverride;
      return createAdvancedChartTemplate(theme, {
        enableDrawingTools,
        disabledFeatures,
        useSubscriptPriceFormat,
        priceDecimals,
        hidePaneSeparator,
        gridLineColorOverride,
        lineColorOverride,
        successColorOverride,
        errorColorOverride,
        currentPriceLineColorOverride,
        labelStyleOverrides,
        legendOverlay,
        showBuiltInLegend,
        volumeSuccessColorOverride,
        volumeErrorColorOverride,
      });
      // lineColorOverride/successColorOverride/errorColorOverride/currentPriceLineColorOverride
      // intentionally excluded — color changes hot-swap via SET_THEME_COLORS without
      // rebuilding the WebView.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      theme,
      enableDrawingTools,
      disabledFeatures,
      useSubscriptPriceFormat,
      priceDecimals,
      labelStyleOverrides,
      hidePaneSeparator,
      gridLineColorOverride,
      legendOverlay,
      showBuiltInLegend,
    ]);

    // Reset all chart state when the WebView reloads due to htmlContent changes.
    // Color refs are intentionally omitted here — they are snapshotted synchronously
    // inside the useMemo above.
    useEffect(() => {
      skeletonHiddenReportedRef.current = false;
      setChartReadyCount(0);
      setWebViewLoaded(false);
      webViewLoadedRef.current = false;
      setWebViewError(null);
      activeIndicatorsRef.current.clear();
      setAppliedIndicatorCount(0);
      setLegendRendered(false);
      prevPositionLinesRef.current = undefined;
      prevTradeMarkersRef.current = undefined;
      prevPositionLineColorsRef.current = undefined;
      prevChartTypeRef.current = undefined;
      prevOhlcvDataRef.current = [];
      prevOhlcvSeriesKeyRef.current = undefined;
      ohlcvSeriesStaleSnapshotRef.current = null;
      themeColorsSentRef.current = false;
    }, [htmlContent]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const beginFullOhlcvLayoutSettle = useCallback(() => {
      if (!isChartReady) {
        return;
      }
      setLayoutSettling(true);
      clearLayoutSettleTimeout();
      layoutSettleTimeoutRef.current = setTimeout(() => {
        layoutSettleTimeoutRef.current = null;
        setLayoutSettling(false);
      }, LAYOUT_SETTLE_FALLBACK_MS);
    }, [isChartReady, clearLayoutSettleTimeout]);

    const resetWebViewSessionState = useCallback(() => {
      skeletonHiddenReportedRef.current = false;
      setChartReadyCount(0);
      setWebViewLoaded(false);
      // Mark "not loaded" synchronously: the WebView is remounting (new `key`), so
      // the OHLCV sync effect running later in THIS same commit must not post to the
      // fresh, not-yet-loaded WebView (the message would be dropped and the data
      // never re-sent). `setWebViewLoaded(false)` only applies next render, so the
      // ref is the synchronously-correct gate. Re-set true in `handleLoadEnd`.
      webViewLoadedRef.current = false;
      setLayoutSettling(false);
      setIndicatorsSyncReady(false);
      clearLayoutSettleTimeout();
      clearIndicatorsSyncFallback();
      activeIndicatorsRef.current.clear();
      setAppliedIndicatorCount(0);
      setLegendRendered(false);
      prevPositionLinesRef.current = undefined;
      prevPositionLineColorsRef.current = undefined;
      prevChartTypeRef.current = undefined;
    }, [clearLayoutSettleTimeout, clearIndicatorsSyncFallback]);

    const resetForInstanceRemount = useCallback(() => {
      resetWebViewSessionState();
      webViewLoadedRef.current = false;
      prevOhlcvDataRef.current = [];
      prevOhlcvSeriesKeyRef.current = undefined;
      ohlcvSeriesStaleSnapshotRef.current = null;
    }, [resetWebViewSessionState]);

    const useIntervalHotReload = webViewInstanceKey !== undefined;

    // Default: WebView remounts when `ohlcvSeriesKey` changes (time range / legacy path).
    useEffect(() => {
      if (useIntervalHotReload || ohlcvSeriesKey === undefined) {
        return;
      }
      resetWebViewSessionState();
      // Mark "not loaded" synchronously: the WebView is remounting (new `key`), so
      // the OHLCV sync effect running later in THIS same commit must not post to the
      // fresh, not-yet-loaded WebView (the message would be dropped and the data
      // never re-sent). `setWebViewLoaded(false)` only applies next render, so the
      // ref is the synchronously-correct gate. Re-set true in `handleLoadEnd`.
      webViewLoadedRef.current = false;
      ohlcvSeriesStaleSnapshotRef.current =
        prevOhlcvSeriesKeyRef.current !== undefined
          ? prevOhlcvDataRef.current
          : null;
      // Trade markers belong to the WebView session; clear so the fresh instance
      // re-posts them from scratch once it loads.
      prevTradeMarkersRef.current = undefined;
    }, [useIntervalHotReload, ohlcvSeriesKey, resetWebViewSessionState]);

    // Technical-indicators path: remount only when `webViewInstanceKey` changes.
    useEffect(() => {
      if (!useIntervalHotReload || !resolvedWebViewKey) {
        return;
      }
      resetForInstanceRemount();
    }, [useIntervalHotReload, resolvedWebViewKey, resetForInstanceRemount]);

    // Interval change within the same WebView — keep chart visible, skip stale sends.
    useEffect(() => {
      if (!useIntervalHotReload || ohlcvSeriesKey === undefined) {
        return;
      }
      if (prevOhlcvSeriesKeyRef.current === ohlcvSeriesKey) {
        return;
      }
      ohlcvSeriesStaleSnapshotRef.current =
        prevOhlcvSeriesKeyRef.current !== undefined
          ? prevOhlcvDataRef.current
          : null;
    }, [useIntervalHotReload, ohlcvSeriesKey]);

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

    const rnBackedPaginationRef = useRef<{ enabled: boolean } | undefined>(
      rnBackedPagination,
    );
    rnBackedPaginationRef.current = rnBackedPagination;

    const onFetchOlderBarsRequestRef = useRef<
      AdvancedChartProps['onFetchOlderBarsRequest']
    >(onFetchOlderBarsRequest);
    onFetchOlderBarsRequestRef.current = onFetchOlderBarsRequest;

    const visibleFromMsRef = useRef<number | undefined>(visibleFromMs);
    visibleFromMsRef.current = visibleFromMs;

    const visibleToMsRef = useRef<number | undefined>(visibleToMs);
    visibleToMsRef.current = visibleToMs;
    const prevVisibleFromMsSentRef = useRef<number | undefined>(undefined);
    const prevVisibleToMsSentRef = useRef<number | undefined>(undefined);

    // Mirror `slbMode` into a ref so `sendOHLCVData` keeps a stable identity (it
    // rarely changes — set once per consumer). Sent on every SET_OHLCV_DATA so the
    // WebView's `window.__slbMode` gate is correct before the post-load centering.
    const slbModeRef = useRef(slbMode);
    slbModeRef.current = slbMode;

    const sendOHLCVData = useCallback(
      (data: OHLCVBar[]) => {
        postMessage({
          type: 'SET_OHLCV_DATA',
          payload: {
            data,
            pagination: paginationRef.current,
            rnBackedPagination: rnBackedPaginationRef.current,
            visibleFromMs: visibleFromMsRef.current,
            visibleToMs: visibleToMsRef.current,
            // Only sent for SocialLeaderboard; omitted otherwise so other
            // consumers' payload is unchanged (the WebView coerces a missing
            // value to false via `!!payload.slbMode`).
            slbMode: slbModeRef.current || undefined,
          },
        });
        prevVisibleFromMsSentRef.current = visibleFromMsRef.current;
        prevVisibleToMsSentRef.current = visibleToMsRef.current;
      },
      [postMessage],
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
        let raw;
        try {
          raw = JSON.parse(event.nativeEvent.data);
        } catch (err) {
          return;
        }

        const message = parseWebViewMessage(raw);
        if (!message) return;

        switch (message.type) {
          case 'CHART_READY':
            activeIndicatorsRef.current.clear();
            setAppliedIndicatorCount(0);
            setLegendRendered(false);
            prevPositionLinesRef.current = undefined;
            prevTradeMarkersRef.current = undefined;
            prevPositionLineColorsRef.current = undefined;
            prevChartTypeRef.current = undefined;
            clearLayoutSettleTimeout();
            setLayoutSettling(false);
            setIndicatorsSyncReady(false);
            scheduleIndicatorsSyncFallback();
            setChartReadyCount((c) => c + 1);
            setWebViewError(null);
            onChartReady?.();
            break;

          case 'CHART_LAYOUT_SETTLED':
            clearLayoutSettleTimeout();
            setLayoutSettling(false);
            markIndicatorsSyncReady();
            onChartLayoutSettled?.();
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

          case 'TRADE_MARKER_PRESSED':
            onTradeMarkerPress?.(message.payload.id);
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

          case 'FETCH_OLDER_BARS_REQUEST': {
            const handler = onFetchOlderBarsRequestRef.current;
            const req = message.payload;
            const respond = (response: FetchOlderBarsResponse) => {
              postMessage({
                type: 'FETCH_OLDER_BARS_RESPONSE',
                payload: response,
              });
            };
            if (!handler) {
              respond({
                requestId: req.requestId,
                seriesGeneration: req.seriesGeneration,
                bars: [],
                noData: true,
                error: 'missing_onFetchOlderBarsRequest',
              });
              break;
            }
            handler(req)
              .then(respond)
              .catch(() =>
                respond({
                  requestId: req.requestId,
                  seriesGeneration: req.seriesGeneration,
                  bars: [],
                  noData: true,
                }),
              );
            break;
          }

          default:
            break;
        }
      },
      [
        isChartReady,
        clearLayoutSettleTimeout,
        scheduleIndicatorsSyncFallback,
        markIndicatorsSyncReady,
        onChartReady,
        onChartLayoutSettled,
        onError,
        onInitFailed,
        onCrosshairMove,
        onTradeMarkerPress,
        onChartInteracted,
        handleTradingViewOpen,
        postMessage,
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
        focusTime: (timeMs, options) => {
          if (!Number.isFinite(timeMs)) return;
          postMessage({
            type: 'FOCUS_TIME',
            payload: {
              timeMs,
              ...(options?.spanMs != null ? { spanMs: options.spanMs } : {}),
              ...(options?.animate != null ? { animate: options.animate } : {}),
            },
          });
        },
        pulseTradeMarker: (id) => {
          if (!id) return;
          postMessage({ type: 'PULSE_TRADE_MARKER', payload: { id } });
        },
        reset: () => {
          clearLayoutSettleTimeout();
          setLayoutSettling(false);
          setChartReadyCount(0);
          setWebViewLoaded(false);
          webViewLoadedRef.current = false;
          setWebViewError(null);
          activeIndicatorsRef.current.clear();
          prevPositionLinesRef.current = undefined;
          prevTradeMarkersRef.current = undefined;
          prevPositionLineColorsRef.current = undefined;
          prevChartTypeRef.current = undefined;
          prevOhlcvDataRef.current = [];
          prevOhlcvSeriesKeyRef.current = undefined;
          ohlcvSeriesStaleSnapshotRef.current = null;
          webViewRef.current?.reload();
        },
      }),
      [
        addIndicator,
        removeIndicator,
        setChartTypeInternal,
        clearLayoutSettleTimeout,
        postMessage,
      ],
    );

    // ---- Declarative prop syncing ----

    // Hot-swap chart colors via postMessage whenever overrides change.
    // IMPORTANT: this effect MUST be declared BEFORE the OHLCV-sync effect
    // below. React fires effects in declaration order, so colours reach the
    // WebView before SET_OHLCV_DATA. The WebView updates its theme state
    // first; when onChartReady fires (after the data triggers widget
    // creation), flushPendingTheme() reads the already-correct colour.
    // This mirrors main's pendingMessages queue, which drained
    // SET_THEME_COLORS inside onChartReady before applySeriesColors().
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
        const colorsMatch =
          lineColorOverride === initialLineColorRef.current &&
          successColorOverride === initialSuccessColorRef.current &&
          errorColorOverride === initialErrorColorRef.current &&
          effectiveCurrentPriceColor === initialCurrentPriceColorRef.current &&
          volumeSuccessColorOverride === initialVolumeSuccessColorRef.current &&
          volumeErrorColorOverride === initialVolumeErrorColorRef.current;
        themeColorsSentRef.current = true;
        if (
          colorsMatch &&
          currentPriceLineColorOverride === undefined &&
          volumeSuccessColorOverride === undefined &&
          volumeErrorColorOverride === undefined
        )
          return;
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
      const effectiveVolumeSuccessColor =
        volumeSuccessColorOverride ?? effectiveSuccessColor;
      const effectiveVolumeErrorColor =
        volumeErrorColorOverride ?? effectiveErrorColor;
      postMessage({
        type: 'SET_THEME_COLORS',
        payload: {
          lineColor: effectiveLineColor,
          successColor: effectiveSuccessColor,
          errorColor: effectiveErrorColor,
          currentPriceColor: effectiveCurrentPriceColor,
          volumeSuccessColor: effectiveVolumeSuccessColor,
          volumeErrorColor: effectiveVolumeErrorColor,
        },
      });
    }, [
      lineColorOverride,
      successColorOverride,
      errorColorOverride,
      currentPriceLineColorOverride,
      labelStyleOverrides?.lastValuePillColor,
      volumeSuccessColorOverride,
      volumeErrorColorOverride,
      webViewLoaded,
      chartReadyCount,
      postMessage,
      theme.colors.success.default,
      theme.colors.error.default,
    ]);

    useEffect(() => {
      // `webViewLoaded` (state) is in deps so this re-runs once the new WebView
      // loads; `webViewLoadedRef` is the synchronously-correct value that prevents
      // posting to a WebView that is mid-remount (see the series-key reset effect).
      if (
        ohlcvData.length === 0 ||
        !webViewLoaded ||
        !webViewLoadedRef.current
      ) {
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
      const visibleRangeChanged =
        visibleFromMsRef.current !== prevVisibleFromMsSentRef.current ||
        visibleToMsRef.current !== prevVisibleToMsSentRef.current;

      if (
        ohlcvSeriesKey !== undefined &&
        ohlcvSeriesKey !== prevOhlcvSeriesKeyRef.current
      ) {
        beginFullOhlcvLayoutSettle();
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
        beginFullOhlcvLayoutSettle();
        sendOHLCVData(ohlcvData);
        prevOhlcvDataRef.current = ohlcvData;
        if (ohlcvSeriesKey !== undefined) {
          prevOhlcvSeriesKeyRef.current = ohlcvSeriesKey;
        }
        return;
      }

      // SocialLeaderboard only: when the requested viewport (visibleFromMs/To)
      // changes without a series-key change, resend the full series so the WebView
      // re-frames on the trades. Gated behind slbMode so other consumers (e.g.
      // Perps) keep their stable latest-N-candle viewport + REALTIME_UPDATE path
      // and never take a full-data resend on a visible-range-only change.
      if (slbModeRef.current && visibleRangeChanged) {
        beginFullOhlcvLayoutSettle();
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
    }, [
      ohlcvData,
      ohlcvSeriesKey,
      webViewLoaded,
      visibleFromMs,
      visibleToMs,
      sendOHLCVData,
      postMessage,
      beginFullOhlcvLayoutSettle,
    ]);

    // Send chartType to the WebView as soon as it loads so the widget can
    // apply it before hiding the loading overlay. Without this, TradingView
    // defaults to candlestick and the user sees a brief flash when line is
    // the active type. Also re-sends on chartType changes before chart ready.
    useEffect(() => {
      if (!webViewLoaded || chartType === undefined) return;
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
      if (
        positionLines === prevPositionLinesRef.current &&
        positionLineColors === prevPositionLineColorsRef.current
      ) {
        return;
      }
      prevPositionLinesRef.current = positionLines;
      prevPositionLineColorsRef.current = positionLineColors;

      postMessage({
        type: 'SET_POSITION_LINES',
        payload: {
          position: positionLines ?? null,
          positionLineColors,
        },
      });
    }, [positionLines, positionLineColors, chartReadyCount, postMessage]);

    // Sync tradeMarkers prop (open/close circles). Compares by reference, so
    // parents should memoize the array; a new reference re-renders all markers.
    useEffect(() => {
      if (chartReadyCount === 0) return;
      if (tradeMarkers === prevTradeMarkersRef.current) return;
      prevTradeMarkersRef.current = tradeMarkers;

      postMessage({
        type: 'SET_TRADE_MARKERS',
        payload: { markers: tradeMarkers ?? null },
      });
    }, [tradeMarkers, chartReadyCount, postMessage]);

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

    useEffect(() => {
      if (chartReadyCount === 0) return;
      postMessage({
        type: 'SET_SUB_PANE_LAYOUT',
        payload: { heightRatio: subPaneHeightRatio ?? null },
      });
    }, [subPaneHeightRatio, chartReadyCount, postMessage]);

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
      onSkeletonHidden();
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
        <View
          style={styles.chartSurface}
          pointerEvents={scrollPassthrough ? 'none' : 'auto'}
        >
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

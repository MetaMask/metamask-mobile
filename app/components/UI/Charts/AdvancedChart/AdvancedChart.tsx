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
  resolveLineChromeOptions,
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

/** Debounce TradingView external opens (redirect chains can fire multiple navigation requests). */
const TRADINGVIEW_OPEN_DEBOUNCE_MS = 800;

const AdvancedChart = forwardRef<AdvancedChartRef, AdvancedChartProps>(
  (
    {
      ohlcvData,
      ohlcvSeriesKey,
      height = DEFAULT_CHART_HEIGHT,
      realtimeBar,
      ohlcvPagination,
      indicators = [],
      positionLines,
      chartType,
      showVolume = false,
      volumeOverlay = false,
      enableDrawingTools = false,
      disabledFeatures = DEFAULT_DISABLED_FEATURES,
      onChartReady,
      onSkeletonHidden,
      onError,
      onCrosshairMove,
      onChartInteracted,
      onChartTradingViewClicked,
      isLoading = false,
      lineChrome,
      visibleFromMs,
      visibleToMs,
      lineColorOverride,
      successColorOverride,
      errorColorOverride,
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

    const activeIndicatorsRef = useRef<Set<IndicatorType>>(new Set());
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
    const webViewRemountedGenerationsRef = useRef<Set<number>>(new Set());
    const markNextGenerationAsRemountedRef = useRef(false);
    const [webViewRemountNonce, setWebViewRemountNonce] = useState(0);

    const htmlContent = useMemo(
      () =>
        createAdvancedChartTemplate(theme, {
          enableDrawingTools,
          disabledFeatures,
          lineChrome,
          lineColorOverride,
          successColorOverride,
          errorColorOverride,
        }),
      [
        theme,
        enableDrawingTools,
        disabledFeatures,
        lineChrome,
        lineColorOverride,
        successColorOverride,
        errorColorOverride,
      ],
    );

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

    const resetWebViewRuntimeState = useCallback(() => {
      skeletonHiddenReportedRef.current = false;
      activeSettleGenerationRef.current = null;
      activeSettleRequiresRangeProofRef.current = false;
      rangeSettlePayloadRef.current = undefined;
      setChartReadyCount(0);
      setWebViewLoaded(false);
      webViewLoadedRef.current = false;
      setLayoutSettling(false);
      clearLayoutSettleTimeout();
      setWebViewError(null);
      activeIndicatorsRef.current.clear();
      prevPositionLinesRef.current = undefined;
      prevChartTypeRef.current = undefined;
      prevOhlcvDataRef.current = [];
      prevOhlcvSeriesKeyRef.current = undefined;
      ohlcvSeriesStaleSnapshotRef.current = null;
    }, [clearLayoutSettleTimeout]);

    // Reset all chart state when the WebView reloads due to htmlContent changes.
    useEffect(() => {
      resetWebViewRuntimeState();
    }, [htmlContent, resetWebViewRuntimeState]);

    const beginFullOhlcvLayoutSettle = useCallback(
      (seriesGeneration?: number) => {
        skeletonHiddenReportedRef.current = false;
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
            };
            webViewRemountedGenerationsRef.current.delete(seriesGeneration);
          }
          setLayoutSettling(false);
        }, LAYOUT_SETTLE_FALLBACK_MS);
      },
      [isChartReady, clearLayoutSettleTimeout],
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

    const beginPendingSeriesSettle = useCallback(() => {
      skeletonHiddenReportedRef.current = false;
      rangeSettlePayloadRef.current = undefined;
      setLayoutSettling(true);
      clearLayoutSettleTimeout();
      layoutSettleTimeoutRef.current = setTimeout(() => {
        layoutSettleTimeoutRef.current = null;
        setLayoutSettling(false);
      }, LAYOUT_SETTLE_FALLBACK_MS);
    }, [clearLayoutSettleTimeout]);

    useEffect(() => {
      if (ohlcvSeriesKey === undefined) {
        return;
      }
      beginPendingSeriesSettle();
      ohlcvSeriesStaleSnapshotRef.current =
        prevOhlcvSeriesKeyRef.current !== undefined
          ? prevOhlcvDataRef.current
          : null;
    }, [ohlcvSeriesKey, beginPendingSeriesSettle]);

    useEffect(
      () => () => {
        clearLayoutSettleTimeout();
      },
      [clearLayoutSettleTimeout],
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
        if (markNextGenerationAsRemountedRef.current) {
          markNextGenerationAsRemountedRef.current = false;
          webViewRemountedGenerationsRef.current.add(seriesGeneration);
        }
        beginFullOhlcvLayoutSettle(seriesGeneration);
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
      [beginFullOhlcvLayoutSettle, postMessage],
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
        } catch {
          return;
        }

        const message = parseWebViewMessage(raw);
        if (!message) return;

        switch (message.type) {
          case 'CHART_READY':
            activeIndicatorsRef.current.clear();
            prevPositionLinesRef.current = undefined;
            prevChartTypeRef.current = undefined;
            if (!activeSettleRequiresRangeProofRef.current) {
              clearLayoutSettleTimeout();
              setLayoutSettling(false);
            }
            setChartReadyCount((c) => c + 1);
            setWebViewError(null);
            onChartReady?.();
            break;

          case 'CHART_LAYOUT_SETTLED':
            completeLayoutSettle(message.payload);
            break;

          case 'CHART_RANGE_APPLIED':
            if (message.payload.latestBarVisible !== false) {
              completeLayoutSettle(message.payload);
            }
            break;

          case 'CHART_RANGE_APPLY_FAILED':
            if (
              activeSettleGenerationRef.current ===
              message.payload.seriesGeneration
            ) {
              requestFallbackRemount();
            }
            break;

          case 'INDICATOR_ADDED':
            activeIndicatorsRef.current.add(message.payload.name);
            break;

          case 'INDICATOR_REMOVED':
            activeIndicatorsRef.current.delete(message.payload.name);
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
            if (!isChartReady && webViewLoadedRef.current) {
              setWebViewError(message.payload.message);
            }
            onError?.(message.payload.message);
            break;

          case 'DEBUG':
            if (__DEV__) {
              // WebView console is not the Metro / Xcode log; chartLogic mirrors here via DEBUG.
              // eslint-disable-next-line no-console -- intentional dev bridge from WebView
              console.log('[AdvancedChart]', message.payload);
            }
            break;

          default:
            break;
        }
      },
      [
        isChartReady,
        clearLayoutSettleTimeout,
        completeLayoutSettle,
        requestFallbackRemount,
        onChartReady,
        onError,
        onCrosshairMove,
        onChartInteracted,
        handleTradingViewOpen,
      ],
    );

    const handleWebViewError = useCallback(
      (syntheticEvent: { nativeEvent: { description: string } }) => {
        const { description } = syntheticEvent.nativeEvent;
        setWebViewError(description);
        onError?.(description);
      },
      [onError],
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
      if (ohlcvData.length === 0 || !webViewLoaded) return;

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
      if (chartReadyCount === 0) return;

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
    }, [indicators, chartReadyCount, addIndicator, removeIndicator]);

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

    const showSkeleton = isLoading || !isChartReady || layoutSettling;

    useEffect(() => {
      if (webViewError) {
        return;
      }
      if (!onSkeletonHidden) {
        return;
      }
      if (isLoading || !isChartReady || layoutSettling) {
        return;
      }
      if (skeletonHiddenReportedRef.current) {
        return;
      }
      skeletonHiddenReportedRef.current = true;
      onSkeletonHidden(rangeSettlePayloadRef.current);
    }, [
      isLoading,
      isChartReady,
      layoutSettling,
      webViewError,
      onSkeletonHidden,
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
            key={`advanced-chart-${webViewRemountNonce}`}
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

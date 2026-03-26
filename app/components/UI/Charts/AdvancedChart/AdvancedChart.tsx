import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { View } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { Text, TextVariant } from '@metamask/design-system-react-native';
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
  type IndicatorType,
  type OHLCVBar,
  type RNToWebViewMessage,
} from './AdvancedChart.types';

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
const AdvancedChart = forwardRef<AdvancedChartRef, AdvancedChartProps>(
  (
    {
      ohlcvData,
      height = DEFAULT_CHART_HEIGHT,
      realtimeBar,
      onRequestMoreHistory,
      indicators = [],
      positionLines,
      chartType,
      showVolume = false,
      volumeOverlay = false,
      enableDrawingTools = false,
      disabledFeatures = DEFAULT_DISABLED_FEATURES,
      onChartReady,
      onError,
      onCrosshairMove,
      isLoading = false,
      lineChrome,
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

    const activeIndicatorsRef = useRef<Set<IndicatorType>>(new Set());
    const [webViewLoaded, setWebViewLoaded] = useState(false);
    const prevPositionLinesRef = useRef(positionLines);
    const prevChartTypeRef = useRef(chartType);
    const prevOhlcvDataRef = useRef<OHLCVBar[]>([]);

    const htmlContent = useMemo(
      () =>
        createAdvancedChartTemplate(theme, {
          enableDrawingTools,
          disabledFeatures,
          lineChrome,
        }),
      [theme, enableDrawingTools, disabledFeatures, lineChrome],
    );

    // Reset all chart state when the WebView reloads due to htmlContent changes
    useEffect(() => {
      setChartReadyCount(0);
      setWebViewLoaded(false);
      activeIndicatorsRef.current.clear();
      prevPositionLinesRef.current = undefined;
      prevChartTypeRef.current = undefined;
    }, [htmlContent]); // eslint-disable-line react-hooks/exhaustive-deps

    // ---- Helpers ----

    const postMessage = useCallback((message: RNToWebViewMessage) => {
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }, []);

    const sendOHLCVData = useCallback(
      (data: OHLCVBar[]) => {
        postMessage({
          type: 'SET_OHLCV_DATA',
          payload: { data },
        });
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
            setChartReadyCount((c) => c + 1);
            setWebViewError(null);
            onChartReady?.();
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

          case 'NEED_MORE_HISTORY':
            onRequestMoreHistory?.(message.payload);
            break;

          case 'ERROR':
            if (!isChartReady) {
              setWebViewError(message.payload.message);
            }
            onError?.(message.payload.message);
            break;

          case 'DEBUG':
            break;

          default:
            break;
        }
      },
      [
        isChartReady,
        onChartReady,
        onError,
        onCrosshairMove,
        onRequestMoreHistory,
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
    }, []);

    // ---- Ref API ----

    useImperativeHandle(
      ref,
      () => ({
        addIndicator,
        removeIndicator,
        setChartType: setChartTypeInternal,
        reset: () => {
          setChartReadyCount(0);
          setWebViewLoaded(false);
          setWebViewError(null);
          activeIndicatorsRef.current.clear();
          prevPositionLinesRef.current = undefined;
          prevChartTypeRef.current = undefined;
          webViewRef.current?.reload();
        },
      }),
      [addIndicator, removeIndicator, setChartTypeInternal],
    );

    // ---- Declarative prop syncing ----

    useEffect(() => {
      if (ohlcvData.length === 0 || !webViewLoaded) return;

      const prevData = prevOhlcvDataRef.current;

      // If this is the first load or data length changed significantly, send full dataset
      if (
        prevData.length === 0 ||
        Math.abs(ohlcvData.length - prevData.length) > 1
      ) {
        sendOHLCVData(ohlcvData);
        prevOhlcvDataRef.current = ohlcvData;
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
    }, [ohlcvData, webViewLoaded, sendOHLCVData, postMessage]);

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

    // Line chart chrome presets (time axis / last-price line); merges in WebView without requiring HTML edits
    useEffect(() => {
      if (chartReadyCount === 0 || lineChrome === undefined) return;
      postMessage({
        type: 'SET_LINE_CHROME',
        payload: lineChrome,
      });
    }, [lineChrome, chartReadyCount, postMessage]);

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
            ref={webViewRef}
            source={{ html: htmlContent, baseUrl: CHARTING_LIBRARY_BASE_URL }}
            style={styles.webview}
            onMessage={handleMessage}
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
          {(isLoading || !isChartReady) && (
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

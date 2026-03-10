import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { Text, TextVariant } from '@metamask/design-system-react-native';
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
      enableDrawingTools = false,
      disabledFeatures = DEFAULT_DISABLED_FEATURES,
      onChartReady,
      onError,
      onCrosshairMove,
      isLoading = false,
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {
      height,
    } as { height: number });
    const webViewRef = useRef<WebView>(null);
    const [chartReadyCount, setChartReadyCount] = useState(0);
    const isChartReady = chartReadyCount > 0;
    const [webViewError, setWebViewError] = useState<string | null>(null);

    const activeIndicatorsRef = useRef<Set<IndicatorType>>(new Set());
    const [webViewLoaded, setWebViewLoaded] = useState(false);
    const prevPositionLinesRef = useRef(positionLines);
    const prevChartTypeRef = useRef(chartType);
    const prevShowVolumeRef = useRef(showVolume);

    const htmlContent = useMemo(
      () =>
        createAdvancedChartTemplate(theme, {
          enableDrawingTools,
          showVolume,
          disabledFeatures,
        }),
      [theme, enableDrawingTools, showVolume, disabledFeatures],
    );

    // Reset all chart state when the WebView reloads due to htmlContent changes
    useEffect(() => {
      setChartReadyCount(0);
      setWebViewLoaded(false);
      activeIndicatorsRef.current.clear();
      prevPositionLinesRef.current = undefined;
      prevChartTypeRef.current = undefined;
      prevShowVolumeRef.current = showVolume;
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
            prevShowVolumeRef.current = showVolume;
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
        showVolume,
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
          prevShowVolumeRef.current = showVolume;
          webViewRef.current?.reload();
        },
      }),
      [addIndicator, removeIndicator, setChartTypeInternal, showVolume],
    );

    // ---- Declarative prop syncing ----

    useEffect(() => {
      if (ohlcvData.length > 0 && webViewLoaded) {
        sendOHLCVData(ohlcvData);
      }
    }, [ohlcvData, webViewLoaded, sendOHLCVData]);

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

    // Sync showVolume prop
    useEffect(() => {
      if (chartReadyCount === 0) return;
      if (showVolume === prevShowVolumeRef.current) return;
      prevShowVolumeRef.current = showVolume;

      postMessage({
        type: 'TOGGLE_VOLUME',
        payload: { visible: showVolume },
      });
    }, [showVolume, chartReadyCount, postMessage]);

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
          scrollEnabled={false}
          bounces={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          allowsInlineMediaPlayback
          androidLayerType="hardware"
          mixedContentMode="always"
        />

        {(isLoading || !isChartReady) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.primary.default}
            />
            <Text variant={TextVariant.BodySm} style={styles.loadingText}>
              Loading chart...
            </Text>
          </View>
        )}
      </View>
    );
  },
);

AdvancedChart.displayName = 'AdvancedChart';

export default AdvancedChart;

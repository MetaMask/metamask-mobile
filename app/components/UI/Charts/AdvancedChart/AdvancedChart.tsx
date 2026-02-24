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
  type AdvancedChartProps,
  type AdvancedChartRef,
  type CrosshairData,
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
      symbol = 'ASSET',
      height = DEFAULT_CHART_HEIGHT,
      realtimeBar,
      onRequestMoreHistory,
      indicators = [],
      positionLines,
      chartType,
      showVolume = false,
      enableDrawingTools = false,
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
    const [isChartReady, setIsChartReady] = useState(false);
    const [webViewError, setWebViewError] = useState<string | null>(null);

    const activeIndicatorsRef = useRef<Set<IndicatorType>>(new Set());
    const webViewLoadedRef = useRef(false);
    const prevPositionLinesRef = useRef(positionLines);
    const prevChartTypeRef = useRef(chartType);
    const prevShowVolumeRef = useRef(showVolume);

    const htmlContent = useMemo(
      () =>
        createAdvancedChartTemplate(theme, {
          enableDrawingTools,
          showVolume,
        }),
      [theme, enableDrawingTools, showVolume],
    );

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
          payload: { data, symbol },
        });
      },
      [postMessage, symbol],
    );

    const addIndicator = useCallback(
      (indicator: IndicatorType) => {
        if (!isChartReady) return;
        postMessage({
          type: 'ADD_INDICATOR',
          payload: { name: indicator },
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
        try {
          const message = JSON.parse(event.nativeEvent.data);

          switch (message.type) {
            case 'CHART_READY':
              setIsChartReady(true);
              setWebViewError(null);
              onChartReady?.();
              break;

            case 'INDICATOR_ADDED':
              if ('name' in message.payload) {
                activeIndicatorsRef.current.add(
                  message.payload.name as IndicatorType,
                );
              }
              break;

            case 'INDICATOR_REMOVED':
              if ('name' in message.payload) {
                activeIndicatorsRef.current.delete(
                  message.payload.name as IndicatorType,
                );
              }
              break;

            case 'CROSSHAIR_MOVE':
              onCrosshairMove?.(
                (message.payload?.data as CrosshairData) ?? null,
              );
              break;

            case 'NEED_MORE_HISTORY':
              onRequestMoreHistory?.();
              break;

            case 'ERROR':
              if ('message' in message.payload) {
                const errorMessage = message.payload.message as string;
                setWebViewError(errorMessage);
                onError?.(errorMessage);
              }
              break;

            case 'DEBUG':
              // eslint-disable-next-line no-console
              console.log('[AdvancedChart]', JSON.stringify(message.payload));
              break;

            default:
              break;
          }
        } catch {
          // Ignore parse errors from non-JSON messages
        }
      },
      [onChartReady, onError, onCrosshairMove, onRequestMoreHistory],
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
      webViewLoadedRef.current = true;
      if (ohlcvData.length > 0) {
        setTimeout(() => {
          sendOHLCVData(ohlcvData);
        }, 100);
      }
    }, [ohlcvData, sendOHLCVData]);

    // ---- Ref API ----

    useImperativeHandle(
      ref,
      () => ({
        addIndicator,
        removeIndicator,
        setChartType: setChartTypeInternal,
        reset: () => {
          setIsChartReady(false);
          activeIndicatorsRef.current.clear();
          webViewRef.current?.reload();
        },
      }),
      [addIndicator, removeIndicator, setChartTypeInternal],
    );

    // ---- Declarative prop syncing ----

    useEffect(() => {
      if (ohlcvData.length > 0 && webViewLoadedRef.current) {
        sendOHLCVData(ohlcvData);
      }
    }, [ohlcvData, sendOHLCVData]);

    // Forward real-time bar updates to WebView
    useEffect(() => {
      if (!isChartReady || !realtimeBar) return;
      postMessage({
        type: 'REALTIME_UPDATE',
        payload: { bar: realtimeBar },
      });
    }, [realtimeBar, isChartReady, postMessage]);

    // Sync indicators prop
    useEffect(() => {
      if (!isChartReady) return;

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
    }, [indicators, isChartReady, addIndicator, removeIndicator]);

    // Sync positionLines prop
    useEffect(() => {
      if (!isChartReady) return;
      if (positionLines === prevPositionLinesRef.current) return;
      prevPositionLinesRef.current = positionLines;

      postMessage({
        type: 'SET_POSITION_LINES',
        payload: { position: positionLines ?? null },
      });
    }, [positionLines, isChartReady, postMessage]);

    // Sync chartType prop
    useEffect(() => {
      if (!isChartReady || chartType === undefined) return;
      if (chartType === prevChartTypeRef.current) return;
      prevChartTypeRef.current = chartType;
      setChartTypeInternal(chartType);
    }, [chartType, isChartReady, setChartTypeInternal]);

    // Sync showVolume prop
    useEffect(() => {
      if (!isChartReady) return;
      if (showVolume === prevShowVolumeRef.current) return;
      prevShowVolumeRef.current = showVolume;

      postMessage({
        type: 'TOGGLE_VOLUME',
        payload: { visible: showVolume },
      });
    }, [showVolume, isChartReady, postMessage]);

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
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
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

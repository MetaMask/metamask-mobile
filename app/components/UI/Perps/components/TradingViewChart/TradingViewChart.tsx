/* eslint-disable @metamask/design-tokens/color-no-hex */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './TradingViewChart.styles';
import type { CandleData } from '../../types/perps-types';
import { TradingViewChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { createTradingViewChartTemplate } from './TradingViewChartTemplate';
import { Platform } from 'react-native';
import { LIGHTWEIGHT_CHARTS_LIBRARY } from '../../../../../lib/lightweight-charts/LightweightChartsLib';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { strings } from '../../../../../../locales/i18n';
export interface TPSLLines {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  entryPrice?: string;
  liquidationPrice?: string;
  currentPrice?: string;
}

export type { TimeDuration } from '../../constants/chartConfig';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';

export interface OhlcData {
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
  time: number;
}

export interface TradingViewChartRef {
  resetToDefault: () => void;
  zoomToLatestCandle: (candleCount?: number) => void;
  clearTPSLLines: () => void;
  toggleVolumeVisibility: (visible: boolean) => void;
  toggleOverlayVisibility: (visible: boolean) => void;
}

interface TradingViewChartProps {
  candleData?: CandleData | null;
  height?: number;
  tpslLines?: TPSLLines;
  onChartReady?: () => void;
  onNeedMoreHistory?: () => void; // Callback when user scrolls to left edge and needs more historical data
  visibleCandleCount?: number; // Number of candles to display (for zoom level)
  showVolume?: boolean; // Control volume bars visibility
  showOverlay?: boolean; // Control chart overlay visibility (OHLC legend)
  coloredVolume?: boolean; // Control volume bar coloring (true = green/red by direction, false = single color)
  onOhlcDataChange?: (data: OhlcData | null) => void; // Callback when OHLC data changes
  symbol?: string; // Expected symbol for validation (prevents stale data from previous market)
  testID?: string;
}

// ATTRIBUTION NOTICE:
// TradingView Lightweight Charts™
// Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/
const TradingViewChart = React.forwardRef<
  TradingViewChartRef,
  TradingViewChartProps
>(
  (
    {
      candleData,
      height = 350,
      tpslLines,
      onChartReady,
      onNeedMoreHistory,
      visibleCandleCount = PERPS_CHART_CONFIG.CANDLE_COUNT.DEFAULT,
      showVolume = true, // Default to showing volume
      showOverlay = false, // Default to hiding overlay
      coloredVolume = true, // Default to colored volume bars
      onOhlcDataChange,
      symbol,
      testID,
    },
    ref,
  ) => {
    const { styles, theme } = useStyles(styleSheet, {});
    const webViewRef = useRef<WebView>(null);
    const [isChartReady, setIsChartReady] = useState(false);
    const [webViewError, setWebViewError] = useState<string | null>(null);
    const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);
    // Buffer for candle data that arrives before WebView is ready (Android fix)
    const pendingCandleDataRef = useRef<{
      data: CandleData;
      timestamp: number;
    } | null>(null);

    // Format OHLC values using the same formatting as the header
    const formattedOhlcData = useMemo(() => {
      if (!ohlcData) return null;

      try {
        return {
          open: formatPerpsFiat(parseFloat(ohlcData.open), {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
          high: formatPerpsFiat(parseFloat(ohlcData.high), {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
          low: formatPerpsFiat(parseFloat(ohlcData.low), {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
          close: formatPerpsFiat(parseFloat(ohlcData.close), {
            ranges: PRICE_RANGES_UNIVERSAL,
          }),
        };
      } catch {
        return null;
      }
    }, [ohlcData]);

    // Platform-specific WebView props
    const platformSpecificProps = useMemo(() => {
      const baseProps = {
        javaScriptEnabled: true,
        domStorageEnabled: true,
        originWhitelist: ['*'],
        mixedContentMode: 'compatibility' as const,
        startInLoadingState: false, // Disable built-in loader to use our skeleton
        scrollEnabled: false,
        showsHorizontalScrollIndicator: false,
        showsVerticalScrollIndicator: false,
        scalesPageToFit: false,
        webviewDebuggingEnabled: __DEV__,
      };

      if (Platform.OS === 'android') {
        return {
          ...baseProps,
          cacheEnabled: true, // Enable caching for better performance
          incognito: false,
          androidLayerType: 'hardware' as const,
          allowsInlineMediaPlayback: false,
        };
      }

      if (Platform.OS === 'ios') {
        return {
          ...baseProps,
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          cacheEnabled: false,
          incognito: true,
          bounces: false,
          allowsFullscreenVideo: false,
          allowsBackForwardNavigationGestures: false,
          dataDetectorTypes: 'none' as const,
        };
      }
    }, []);

    // Force WebView HTML regeneration when template changes (cache bust)
    const htmlContent = useMemo(
      () =>
        createTradingViewChartTemplate(
          theme,
          LIGHTWEIGHT_CHARTS_LIBRARY,
          coloredVolume,
        ),
      [theme, coloredVolume],
    );

    // Send message to WebView - simplified to avoid loops
    const sendMessage = useCallback(
      (message: object) => {
        if (webViewRef.current && isChartReady) {
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      [isChartReady],
    );

    // Reset chart to default state (30 candles, most recent data)
    const resetToDefault = useCallback(() => {
      if (webViewRef.current && isChartReady) {
        const message = {
          type: 'RESET_TO_DEFAULT',
        };
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }, [isChartReady]);

    // Zoom to latest candle when period changes
    const zoomToLatestCandle = useCallback(
      (candleCount?: number) => {
        if (webViewRef.current && isChartReady) {
          const message = {
            type: 'ZOOM_TO_LATEST_CANDLE',
            candleCount: candleCount || visibleCandleCount,
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      [isChartReady, visibleCandleCount],
    );

    // Clear TPSL lines (except current price line)
    const clearTPSLLines = useCallback(() => {
      if (webViewRef.current && isChartReady) {
        const message = {
          type: 'CLEAR_TPSL_LINES',
        };
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }, [isChartReady]);

    // Toggle volume visibility
    const toggleVolumeVisibility = useCallback(
      (visible: boolean) => {
        if (webViewRef.current && isChartReady) {
          const message = {
            type: 'TOGGLE_VOLUME_VISIBILITY',
            visible,
          };
          webViewRef.current.postMessage(JSON.stringify(message));
        }
      },
      [isChartReady],
    );

    // Toggle overlay visibility (not used internally, but exposed via ref for parent control)
    const toggleOverlayVisibility = useCallback((_visible: boolean) => {
      // Note: Overlay visibility is controlled by the parent component via the showOverlay prop
      // This method is kept for API consistency but doesn't need to do anything
      // The parent component controls overlay visibility by setting showOverlay prop
    }, []);

    // Handle messages from WebView
    const handleWebViewMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const message = JSON.parse(event.nativeEvent.data);

          switch (message.type) {
            case 'CHART_READY':
              setIsChartReady(true);
              onChartReady?.();
              break;
            case 'PRICE_LINES_UPDATE':
              break;
            case 'INTERVAL_UPDATED':
              break;
            case 'WEBVIEW_TEST':
              break;
            case 'OHLC_DATA':
              // Trigger haptic feedback only when OHLC data changes (not on every update)
              if (
                message.data &&
                (!ohlcData ||
                  message.data.open !== ohlcData.open ||
                  message.data.high !== ohlcData.high ||
                  message.data.low !== ohlcData.low ||
                  message.data.close !== ohlcData.close)
              ) {
                impactAsync(ImpactFeedbackStyle.Light);
              }
              setOhlcData(message.data);
              break;
            case 'NEED_MORE_HISTORY':
              // User scrolled to left edge - request more historical data
              DevLogger.log(
                'TradingViewChart: Received NEED_MORE_HISTORY from WebView',
                {
                  currentDataLength: message.currentDataLength,
                  visibleRange: message.visibleRange,
                },
              );
              onNeedMoreHistory?.();
              break;
            default:
              break;
          }
        } catch (error) {
          console.error(
            'TradingViewChart: Error parsing WebView message:',
            error,
          );
        }
      },
      [onChartReady, onNeedMoreHistory, ohlcData],
    );

    // Convert CandleData to format expected by TradingView Lightweight Charts
    const formatCandleData = useCallback((data: CandleData) => {
      if (!data?.candles) return [];

      const formatted = data.candles
        .map((candle) => {
          // TradingView expects Unix timestamp in SECONDS for intraday data
          // Our data comes in milliseconds, so divide by 1000
          const timeInSeconds = Math.floor(candle.time / 1000);

          const formattedCandle = {
            time: timeInSeconds,
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: candle.volume, // Include volume for histogram series
          };

          // Validate all values are valid numbers
          const isValid =
            !isNaN(formattedCandle.time) &&
            !isNaN(formattedCandle.open) &&
            !isNaN(formattedCandle.high) &&
            !isNaN(formattedCandle.low) &&
            !isNaN(formattedCandle.close) &&
            formattedCandle.open > 0 &&
            formattedCandle.high > 0 &&
            formattedCandle.low > 0 &&
            formattedCandle.close > 0;

          if (!isValid) {
            DevLogger.log(
              '🚨 Invalid candle data:',
              candle,
              '→',
              formattedCandle,
            );
            return null;
          }

          return formattedCandle;
        })
        .filter(
          (candle): candle is NonNullable<typeof candle> => candle !== null,
        )
        .sort((a, b) => a.time - b.time); // Sort by time ascending

      return formatted;
    }, []);

    // Memoize the candle data to prevent infinite loops
    const candleDataVersion = useMemo(() => {
      if (!candleData?.candles) return null;
      return {
        coin: candleData.coin,
        interval: candleData.interval,
        candlesCount: candleData.candles.length,
        firstTime: candleData.candles[0]?.time,
        lastTime: candleData.candles[candleData.candles.length - 1]?.time,
      };
    }, [candleData]);

    // Send real candle data to chart
    useEffect(() => {
      // If chart is not ready, buffer the data for later
      if (!isChartReady) {
        if (candleData?.candles && candleData.candles.length > 0) {
          // Validate before buffering
          if (!symbol || candleData.coin === symbol) {
            pendingCandleDataRef.current = {
              data: candleData,
              timestamp: Date.now(),
            };
          }
        }
        return;
      }

      // Chart is ready - send data
      if (!webViewRef.current) return;

      let dataToSend = null;
      let dataSource = 'none';
      let dataToUse: CandleData | null = null;

      // Check for pending buffered data first (Android case)
      if (pendingCandleDataRef.current) {
        dataToUse = pendingCandleDataRef.current.data;
        pendingCandleDataRef.current = null; // Clear buffer
      } else if (candleData?.candles && candleData.candles.length > 0) {
        dataToUse = candleData;
      }

      // If no data available, clear the chart to prevent stale data display
      if (!dataToUse?.candles?.length) {
        webViewRef.current.postMessage(
          JSON.stringify({
            type: 'CLEAR_DATA',
          }),
        );
        return;
      }

      if (dataToUse?.candles && dataToUse.candles.length > 0) {
        // DEFENSIVE: Validate candle data matches expected symbol
        if (symbol && dataToUse.coin !== symbol) {
          DevLogger.log(
            'TradingViewChart: Ignoring mismatched candleData',
            `Expected: ${symbol}, Got: ${dataToUse.coin}`,
          );
          return;
        }

        dataToSend = formatCandleData(dataToUse);
        dataSource = 'real';
      }

      if (dataToSend) {
        const message = {
          type: 'SET_CANDLESTICK_DATA',
          data: dataToSend,
          source: dataSource,
          visibleCandleCount,
          interval: dataToUse?.interval, // Pass interval for zoom reset on change
        };
        webViewRef.current.postMessage(JSON.stringify(message));
      }
    }, [
      isChartReady,
      candleDataVersion,
      formatCandleData,
      candleData,
      visibleCandleCount,
      symbol,
    ]);

    // Update auxiliary lines when they change
    useEffect(() => {
      if (isChartReady) {
        if (tpslLines) {
          // Update TPSL lines when they exist
          sendMessage({
            type: 'ADD_AUXILIARY_LINES',
            lines: tpslLines,
          });
        } else {
          // Clear TPSL lines when they don't exist (position closed)
          sendMessage({
            type: 'CLEAR_TPSL_LINES',
          });
        }
      }
    }, [tpslLines, isChartReady, sendMessage]);

    // Sync volume visibility with chart
    useEffect(() => {
      if (isChartReady) {
        sendMessage({
          type: 'TOGGLE_VOLUME_VISIBILITY',
          visible: showVolume,
        });
      }
    }, [showVolume, isChartReady, sendMessage]);

    // Notify parent component when OHLC data changes
    useEffect(() => {
      if (onOhlcDataChange) {
        onOhlcDataChange(ohlcData);
      }
    }, [ohlcData, onOhlcDataChange]);

    // Expose ref methods for parent components
    React.useImperativeHandle(
      ref,
      () => ({
        resetToDefault,
        zoomToLatestCandle,
        clearTPSLLines,
        toggleVolumeVisibility,
        toggleOverlayVisibility,
      }),
      [
        resetToDefault,
        zoomToLatestCandle,
        clearTPSLLines,
        toggleVolumeVisibility,
        toggleOverlayVisibility,
      ],
    );

    // Handle WebView errors
    const handleWebViewError = useCallback(
      (event: { nativeEvent?: { description?: string } }) => {
        const errorDescription =
          event.nativeEvent?.description || 'WebView error occurred';
        setWebViewError(errorDescription);
        console.error('WebView error:', event.nativeEvent);
      },
      [],
    );

    if (webViewError) {
      return (
        <Box
          twClassName="flex-1 items-center justify-center bg-error-muted"
          style={{ height }}
          testID={`${testID}-error`}
        >
          <Text variant={TextVariant.BodyMd}>Chart Error: {webViewError}</Text>
        </Box>
      );
    }

    const webViewElement = (
      <WebView
        // WebView cache versioning strategy:
        // Increment this version number to force WebView remount and HTML reload
        // when making incompatible changes to TradingViewChartTemplate.tsx
        //
        // Current version: v21 (fixed y-axis spacing and debug borders)
        //
        // Future improvement: Consider using a content hash of the template
        // for automatic cache busting: key={`chart-webview-${templateHash}`}
        //
        // Note: HTML content is already memoized and regenerates on theme/coloredVolume changes
        key="chart-webview-v21"
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webView, { height, width: '100%' }]} // eslint-disable-line react-native/no-inline-styles
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('TradingViewChart: HTTP Error:', nativeEvent);
        }}
        testID={`${testID || TradingViewChartSelectorsIDs.CONTAINER}-webview`}
        {...(Platform.OS === 'android' ? { nestedScrollEnabled: true } : {})}
        {...platformSpecificProps}
      />
    );

    return (
      <Box
        twClassName="bg-default rounded-lg"
        testID={testID || TradingViewChartSelectorsIDs.CONTAINER}
      >
        {/* Chart WebView */}
        <Box
          twClassName="overflow-hidden rounded-lg"
          style={{ height, width: '100%', minHeight: height }} // eslint-disable-line react-native/no-inline-styles
        >
          {/* Show skeleton when chart WebView is still loading */}
          {!isChartReady && (
            <Skeleton
              height={height}
              width="100%"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                position: 'absolute',
                zIndex: 10,
                backgroundColor: theme.colors.background.default,
              }} // eslint-disable-line react-native/no-inline-styles
              testID={`${
                testID || TradingViewChartSelectorsIDs.CONTAINER
              }-skeleton`}
            />
          )}
          {Platform.OS === 'android' ? (
            <GestureDetector gesture={Gesture.Pinch()}>
              {webViewElement}
            </GestureDetector>
          ) : (
            webViewElement
          )}
        </Box>

        {/* OHLC Legend Overlay (conditionally rendered based on showOverlay prop) */}
        {showOverlay && formattedOhlcData && (
          <Box style={styles.ohlcLegend}>
            <Box style={styles.ohlcRow}>
              <Text variant={TextVariant.BodyXs}>
                {strings('perps.chart.ohlc.open').charAt(0)}:{' '}
                {formattedOhlcData.open}
              </Text>
              <Text variant={TextVariant.BodyXs}>
                {strings('perps.chart.ohlc.close').charAt(0)}:{' '}
                {formattedOhlcData.close}
              </Text>
            </Box>
            <Box style={styles.ohlcRow}>
              <Text variant={TextVariant.BodyXs}>
                {strings('perps.chart.ohlc.high').charAt(0)}:{' '}
                {formattedOhlcData.high}
              </Text>
              <Text variant={TextVariant.BodyXs}>
                {strings('perps.chart.ohlc.low').charAt(0)}:{' '}
                {formattedOhlcData.low}
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    );
  },
);

TradingViewChart.displayName = 'TradingViewChart';

export default TradingViewChart;

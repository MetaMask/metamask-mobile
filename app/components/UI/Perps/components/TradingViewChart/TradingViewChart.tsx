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
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './TradingViewChart.styles';
import type { CandleData } from '../../types';
import { TradingViewChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { createTradingViewChartTemplate } from './TradingViewChartTemplate';
import { Platform } from 'react-native';
export interface TPSLLines {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  entryPrice?: string;
  liquidationPrice?: string;
  currentPrice?: string;
}

export type { TimeDuration } from '../../constants/chartConfig';

interface TradingViewChartProps {
  candleData?: CandleData | null;
  height?: number;
  tpslLines?: TPSLLines;
  onChartReady?: () => void;
  testID?: string;
}

// ATTRIBUTION NOTICE:
// TradingView Lightweight Charts™
// Copyright (с) 2025 TradingView, Inc. https://www.tradingview.com/
const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candleData,
  height = 350,
  tpslLines,
  onChartReady,
  testID,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const webViewRef = useRef<WebView>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Platform-specific WebView props
  const platformSpecificProps = useMemo(() => {
    const baseProps = {
      javaScriptEnabled: true,
      domStorageEnabled: true,
      originWhitelist: ['*'],
      mixedContentMode: 'compatibility' as const,
      startInLoadingState: true,
      scrollEnabled: false,
      showsHorizontalScrollIndicator: false,
      showsVerticalScrollIndicator: false,
      scalesPageToFit: false,
      webviewDebuggingEnabled: __DEV__,
    };

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

    // Android-safe configuration
    return baseProps;
  }, []);

  const htmlContent = useMemo(
    () => createTradingViewChartTemplate(theme),
    [theme],
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
    [onChartReady],
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
      .filter((candle): candle is NonNullable<typeof candle> => candle !== null)
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
    if (!isChartReady || !webViewRef.current) return;

    let dataToSend = null;
    let dataSource = 'none';

    // Prioritize real data over sample data
    if (candleData?.candles && candleData.candles.length > 0) {
      dataToSend = formatCandleData(candleData);
      dataSource = 'real';
    }

    if (dataToSend) {
      const message = {
        type: 'SET_CANDLESTICK_DATA',
        data: dataToSend,
        source: dataSource,
      };
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, [isChartReady, candleDataVersion, formatCandleData, candleData]);

  // Update auxiliary lines when they change
  useEffect(() => {
    if (isChartReady && tpslLines) {
      sendMessage({
        type: 'ADD_AUXILIARY_LINES',
        lines: tpslLines,
      });
    }
  }, [tpslLines, isChartReady, sendMessage]);

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
        <WebView
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
          {...platformSpecificProps}
        />
      </Box>
    </Box>
  );
};

export default TradingViewChart;

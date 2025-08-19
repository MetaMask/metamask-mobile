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

import { CandlePeriod, TimeDuration } from '../../constants/chartConfig';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { createIntervalUpdateMessage } from './utils/chartCalculations';

// TP/SL Lines interface
export interface TPSLLines {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  entryPrice?: string;
  liquidationPrice?: string;
  currentPrice?: string;
}

// Re-export TimeDuration for convenience
export type { TimeDuration } from '../../constants/chartConfig';

interface TradingViewChartProps {
  candleData?: CandleData | null;
  height?: number;
  tpslLines?: TPSLLines;
  onChartReady?: () => void;
  testID?: string;
  showSampleDataWhenEmpty?: boolean; // For debugging purposes
  selectedDuration?: TimeDuration | string;
  selectedCandlePeriod?: CandlePeriod | string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candleData,
  height = 350,
  tpslLines,
  onChartReady,
  testID,
  showSampleDataWhenEmpty = true, // Enable by default for debugging
  selectedDuration = '1d',
  selectedCandlePeriod = CandlePeriod.ONE_HOUR,
}) => {
  /* eslint-disable no-console */
  // Temporarily disable console warnings for debugging
  const { styles, theme } = useStyles(styleSheet, {});
  const webViewRef = useRef<WebView>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Note: getCandleCount logic moved to utils/chartCalculations.ts for better testability

  // Send interval update to WebView
  // Note: This is mainly for debugging/logging. The actual data fetching
  // should be handled by the parent component via usePerpsPositionData
  const sendIntervalUpdate = useCallback(
    (duration: TimeDuration | string, candlePeriod?: CandlePeriod) => {
      if (!webViewRef.current || !isChartReady) {
        console.log(
          '🔍 Chart not ready yet, interval update will be sent when ready',
        );
        return;
      }

      // Use provided candle period or fallback to a default
      const period = candlePeriod || CandlePeriod.ONE_HOUR;
      const message = createIntervalUpdateMessage(duration, period);

      console.log('📊 Sending interval update to chart:', message);
      webViewRef.current.postMessage(JSON.stringify(message));
    },
    [isChartReady],
  );

  // Send initial interval when chart becomes ready
  useEffect(() => {
    if (isChartReady) {
      sendIntervalUpdate(
        selectedDuration,
        selectedCandlePeriod as CandlePeriod,
      );
    }
  }, [
    isChartReady,
    selectedDuration,
    selectedCandlePeriod,
    sendIntervalUpdate,
  ]);

  // WORKING TradingView implementation - building on verified WebView foundation
  const htmlContent = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>TradingView Chart</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: Arial, sans-serif;
            background: ${theme.colors.background.default};
        }
        
        #container {
            width: 100%;
            height: 100vh;
            position: relative;
            background: ${theme.colors.background.default};
        }
    </style>
</head>
<body>
    <div id="container">
    </div>

    <script>
        console.log('TradingView: Starting initialization...');
        
        // Global variables
        window.chart = null;
        window.candlestickSeries = null;
        window.isInitialDataLoad = true; // Track if this is the first data load
        window.lastDataKey = null; // Track the last dataset to avoid unnecessary autoscaling
        
        // Step 1: Load TradingView library dynamically
        function loadTradingView() {
            console.log('TradingView: Loading library...');
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
            
            script.onload = function() {
                console.log('TradingView: Library loaded successfully');
                setTimeout(createChart, 500); // Small delay to ensure library is ready
            };
            
            script.onerror = function() {
                console.error('TradingView: Failed to load library');
            };
            
            document.head.appendChild(script);
        }
        
        // Step 2: Create chart
        function createChart() {
            console.log('TradingView: Creating chart...');
            
            if (!window.LightweightCharts) {
                console.error('TradingView: Library not available');
                return;
            }
            
            try {
                // Create chart with theme applied via template literals
                window.chart = LightweightCharts.createChart(document.getElementById('container'), {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    layout: {
                        background: {
                            color: '${theme.colors.background.default}',
                        },
                        textColor: '${theme.colors.text.muted}',
                        attributionLogo: false, // Hide the TradingView logo
                    },
                    localization: {
                        priceFormatter: (price) => {
                            // Format price with comma separators
                            return new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            }).format(price);
                        }
                    },
                    grid: {
                        vertLines: { color: '${theme.colors.border.muted}' },
                        horzLines: { color: '${theme.colors.border.muted}' },
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        borderColor: 'transparent',
                    },
                    rightPriceScale: {
                        borderColor: 'transparent',
                    },
                    leftPriceScale: {
                        borderColor: 'transparent',
                    }
                });
                
                // Notify React Native that chart is ready
                if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CHART_READY',
                        timestamp: new Date().toISOString()
                    }));
                } 
            } catch (error) {
                console.error('TradingView: Error creating chart:', error);
            }
        }
        
        // Create candlestick series when data is received
        window.createCandlestickSeries = function() {
            if (!window.chart || !window.LightweightCharts?.CandlestickSeries) return null;
            
            // Remove existing series if it exists
            if (window.candlestickSeries) {
                window.chart.removeSeries(window.candlestickSeries);
            }
            
            // Create new candlestick series
            window.candlestickSeries = window.chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                upColor: '#BAF24A',
                downColor: '#FF7584',
                borderVisible: false,
                wickUpColor: '#BAF24A',
                wickDownColor: '#FF7584',
                priceLineColor: '#FFF',
                priceLineWidth: 1,
                lastValueVisible: true,
                title: 'Current',
            });
            
            console.log('TradingView: Candlestick series created successfully');
            return window.candlestickSeries;
        };
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.chart) {
                window.chart.applyOptions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }
        });
        
        // Store price lines for management
        window.priceLines = {
            entryPrice: null,
            liquidationPrice: null, 
            takeProfitPrice: null,
            stopLossPrice: null,
            currentPrice: null
        };
        
        window.updatePriceLines = function(lines) {
            if (!window.candlestickSeries) {
                return;
            }
            
            // Remove existing entry line if it exists
            if (window.priceLines.entryPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.entryPrice);
                } catch (error) {
                    // Silent error handling
                }
                window.priceLines.entryPrice = null;
            }
            
            // Create new entry line if price is valid
            if (lines.entryPrice && !isNaN(parseFloat(lines.entryPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.entryPrice),
                        color: '#CCC', // Light Gray
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: 'Entry'
                    });
                    
                    // Store reference for future removal
                    window.priceLines.entryPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                }
            }
            
            // Remove existing take profit line if it exists
            if (window.priceLines.takeProfitPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.takeProfitPrice);
                } catch (error) {
                    // Silent error handling
                }
                window.priceLines.takeProfitPrice = null;
            }
            
            // Create new take profit line if price is valid
            if (lines.takeProfitPrice && !isNaN(parseFloat(lines.takeProfitPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.takeProfitPrice),
                        color: '#BAF24A', // Light Green
                        lineWidth: 1,
                        lineStyle: 2, // Dashed
                        axisLabelVisible: true,
                        title: 'TP'
                    });
                    window.priceLines.takeProfitPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                }
            }
            
            // Remove existing stop loss line if it exists
            if (window.priceLines.stopLossPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.stopLossPrice);
                } catch (error) {
                    // Silent error handling
                }
                window.priceLines.stopLossPrice = null;
            }
            
            // Create new stop loss line if price is valid
            if (lines.stopLossPrice && !isNaN(parseFloat(lines.stopLossPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.stopLossPrice),
                        color: '#484848',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'SL'
                    });
                    
                    // Store reference for future removal
                    window.priceLines.stopLossPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                }
            }
            
            // Remove existing liquidation line if it exists
            if (window.priceLines.liquidationPrice) {
                try {
                    window.candlestickSeries.removePriceLine(window.priceLines.liquidationPrice);
                } catch (error) {
                    // Silent error handling
                }
                window.priceLines.liquidationPrice = null;
            }
            
            // Create new liquidation line if price is valid
            if (lines.liquidationPrice && !isNaN(parseFloat(lines.liquidationPrice))) {
                try {
                    const priceLine = window.candlestickSeries.createPriceLine({
                        price: parseFloat(lines.liquidationPrice),
                        color: '#FF7584',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'Liq'
                    });
                    
                    // Store reference for future removal
                    window.priceLines.liquidationPrice = priceLine;
                } catch (error) {
                    // Silent error handling
                }
            }
        };

        // Message handling from React Native
        window.addEventListener('message', function(event) {
            try {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'SET_CANDLESTICK_DATA':
                        if (window.chart && message.data?.length > 0) {
                            // Create or get candlestick series
                            if (!window.candlestickSeries) {
                                window.createCandlestickSeries();
                            }
                            
                            if (window.candlestickSeries) {
                                window.candlestickSeries.setData(message.data);
                                
                                // Check if this is truly new data (different source/period) or just a rerender
                                const currentDataKey = message.source + '_' + (message.data?.length || 0);
                                const shouldAutoscale = window.isInitialDataLoad || (window.lastDataKey !== currentDataKey);
                                
                                if (shouldAutoscale) {
                                    window.chart.timeScale().fitContent();
                                    window.lastDataKey = currentDataKey;
                                }
                                
                                window.isInitialDataLoad = false;
                            } else {
                                console.error('📊 TradingView: Failed to create candlestick series');
                            }
                        }
                        break;
                        
                    case 'ADD_AUXILIARY_LINES':
                        if (window.chart && message.lines) {
                            window.updatePriceLines(message.lines);
                        }
                        break;
                        
                    case 'UPDATE_INTERVAL':
                        // Send confirmation back to React Native
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'INTERVAL_UPDATED',
                                duration: message.duration,
                                candlePeriod: message.candlePeriod,
                                candleCount: message.candleCount,
                                timestamp: new Date().toISOString()
                            }));
                        }
                        break;
                }
            } catch (error) {
                console.error('📊 TradingView: Message handling error:', error);
            }
        });
        
        // Also listen for React Native WebView messages
        document.addEventListener('message', function(event) {
            window.dispatchEvent(new MessageEvent('message', event));
        });
        
        // Start the process
        console.log('📊 TradingView: WebView loaded, starting initialization...');
        
        // Start loading after a small delay
        setTimeout(loadTradingView, 500);
    </script>
</body>
</html>`,
    [
      theme.colors.background.default,
      theme.colors.border.muted,
      theme.colors.text.muted,
    ], // Theme values used in template
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
  }, [
    isChartReady,
    candleDataVersion,
    formatCandleData,
    showSampleDataWhenEmpty,
    candleData,
  ]);

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
          // injectedJavaScript={injectedJavaScript}
          onMessage={handleWebViewMessage}
          onError={handleWebViewError}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('TradingViewChart: HTTP Error:', nativeEvent);
          }}
          onLoadStart={() =>
            console.log('TradingViewChart: WebView load started')
          }
          onLoadEnd={() => console.log('TradingViewChart: WebView load ended')}
          onLoad={() => {
            console.log(
              'TradingViewChart: WebView loaded - ready to communicate',
            );
          }}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bounces={false}
          scalesPageToFit={false}
          startInLoadingState={false}
          allowsInlineMediaPlayback={false}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          testID={`${testID || TradingViewChartSelectorsIDs.CONTAINER}-webview`}
          // Enable debugging (you can set this to false in production)
          webviewDebuggingEnabled={__DEV__}
        />
      </Box>
    </Box>
  );
};

export default TradingViewChart;

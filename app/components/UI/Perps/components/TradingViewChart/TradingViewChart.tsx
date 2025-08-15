import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from '@metamask/react-native-webview';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { styleSheet } from './TradingViewChart.styles';
import type { CandleData } from '../../types';
import { TradingViewChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// TP/SL Lines interface
export interface TPSLLines {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  entryPrice?: string;
  liquidationPrice?: string;
  currentPrice?: string;
}

interface TradingViewChartProps {
  candleData?: CandleData | null;
  isLoading?: boolean;
  height?: number;
  tpslLines?: TPSLLines;
  onChartReady?: () => void;
  testID?: string;
  showSampleDataWhenEmpty?: boolean; // For debugging purposes
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candleData,
  isLoading = false,
  height = 350,
  tpslLines,
  onChartReady,
  testID,
  showSampleDataWhenEmpty = true, // Enable by default for debugging
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const webViewRef = useRef<WebView>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Convert theme to simple string for WebView
  const themeMode =
    theme.colors.background.default === '#ffffff' ? 'light' : 'dark';

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
            background: #f0f0f0;
        }
        
        #container {
            width: 100%;
            height: 100vh;
            position: relative;
        }
        
        #loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            font-size: 16px;
            z-index: 1000;
        }
        
        #debug {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            max-width: 200px;
            z-index: 1001;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="loading">📊 Loading TradingView...</div>
        <div id="debug">
            Status: Loading...<br/>
            Library: Not loaded<br/>
            Chart: Not created<br/>
            Data: None
        </div>
    </div>

    <script>
        console.log('📊 TradingView: Starting initialization...');
        
        // Global variables
        window.chart = null;
        window.candlestickSeries = null;
        
        // Update debug info
        function updateDebug(info) {
            document.getElementById('debug').innerHTML = info;
        }
        
        // Step 1: Load TradingView library dynamically
        function loadTradingView() {
            console.log('📊 TradingView: Loading library...');
            updateDebug('Status: Loading...<br/>Library: Downloading...<br/>Chart: Waiting<br/>Data: None');
            
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
            
            script.onload = function() {
                console.log('📊 TradingView: Library loaded successfully');
                updateDebug('Status: Ready<br/>Library: ✅ Loaded<br/>Chart: Creating...<br/>Data: None');
                setTimeout(createChart, 500); // Small delay to ensure library is ready
            };
            
            script.onerror = function() {
                console.error('📊 TradingView: Failed to load library');
                updateDebug('Status: ERROR<br/>Library: ❌ Failed<br/>Chart: Not created<br/>Data: None');
            };
            
            document.head.appendChild(script);
        }
        
        // Step 2: Create chart
        function createChart() {
            console.log('📊 TradingView: Creating chart...');
            
            if (!window.LightweightCharts) {
                console.error('📊 TradingView: Library not available');
                return;
            }
            
            try {
                // Create chart
                window.chart = LightweightCharts.createChart(document.getElementById('container'), {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    layout: {
                        backgroundColor: 'transparent',
                        textColor: '#333',
                    },
                    grid: {
                        vertLines: { color: 'rgba(197, 203, 206, 0.3)' },
                        horzLines: { color: 'rgba(197, 203, 206, 0.3)' },
                    },
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                    }
                });
                
                console.log('📊 TradingView: Chart created successfully');
                updateDebug('Status: Ready<br/>Library: ✅ Loaded<br/>Chart: ✅ Created<br/>Data: Waiting...');
                
                // Hide loading
                document.getElementById('loading').style.display = 'none';
                
                // Notify React Native that chart is ready
                if (window.ReactNativeWebView) {
                    console.log('📊 TradingView: Notifying React Native that chart is ready');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'CHART_READY',
                        timestamp: new Date().toISOString()
                    }));
                }
                
                console.log('📊 TradingView: Chart initialized successfully - waiting for real data from React Native');
                
            } catch (error) {
                console.error('📊 TradingView: Error creating chart:', error);
                updateDebug('Status: ERROR<br/>Library: ✅ Loaded<br/>Chart: ❌ Failed<br/>Data: None');
            }
        }
        
        // Create candlestick series when data is received
        window.createCandlestickSeries = function() {
            if (!window.chart || !window.LightweightCharts?.CandlestickSeries) return null;
            
            console.log('📊 TradingView: Creating candlestick series for data...');
            
            // Remove existing series if it exists
            if (window.candlestickSeries) {
                window.chart.removeSeries(window.candlestickSeries);
            }
            
            // Create new candlestick series
            window.candlestickSeries = window.chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });
            
            console.log('📊 TradingView: Candlestick series created successfully');
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
        
        // Message handling from React Native
        window.addEventListener('message', function(event) {
            try {
                const message = JSON.parse(event.data);
                console.log('📊 TradingView: Received message:', message.type);
                
                switch (message.type) {
                    case 'SET_CANDLESTICK_DATA':
                        console.log('📊 TradingView: Setting candlestick data, points:', message.data?.length);
                        console.log('📊 TradingView: First data point received:', message.data?.[0]);
                        console.log('📊 TradingView: Last data point received:', message.data?.[message.data?.length - 1]);
                        
                        if (window.chart && message.data?.length > 0) {
                            // Create or get candlestick series
                            if (!window.candlestickSeries) {
                                window.createCandlestickSeries();
                            }
                            
                            if (window.candlestickSeries) {
                                console.log('📊 TradingView: Setting data on series...');
                                try {
                                    window.candlestickSeries.setData(message.data);
                                    window.chart.timeScale().fitContent();
                                    
                                    const dataType = message.source || 'unknown';
                                    updateDebug('Status: Ready ✅<br/>Library: ✅ Loaded<br/>Chart: ✅ Active<br/>Data: ✅ ' + message.data.length + ' candles (' + dataType.toUpperCase() + ')');
                                    console.log('📊 TradingView: ' + dataType + ' data set successfully!');
                                } catch (error) {
                                    console.error('📊 TradingView: Error setting data on series:', error);
                                    console.error('📊 TradingView: Error details:', error.message);
                                    updateDebug('Status: ERROR<br/>Library: ✅ Loaded<br/>Chart: ✅ Created<br/>Data: ❌ ' + error.message);
                                }
                            } else {
                                console.error('📊 TradingView: Failed to create candlestick series');
                            }
                        } else {
                            console.log('📊 TradingView: No data or chart not ready');
                            console.log('📊 TradingView: Chart available:', !!window.chart);
                            console.log('📊 TradingView: Data length:', message.data?.length);
                        }
                        break;
                    case 'UPDATE_THEME':
                        console.log('📊 TradingView: Updating theme to:', message.theme);
                        // Theme update logic can be added here
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
        updateDebug('Status: Starting...<br/>Library: Loading...<br/>Chart: Not created<br/>Data: None');
        
        // Start loading after a small delay
        setTimeout(loadTradingView, 500);
    </script>
</body>
</html>`,
    [],
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
      console.log('🔄 BASIC TEST: handleWebViewMessage called');
      try {
        const message = JSON.parse(event.nativeEvent.data);
        console.log(
          '🔄 BASIC TEST: Message received:',
          message.type,
          message.message,
        );

        switch (message.type) {
          case 'BASIC_WEBVIEW_SUCCESS':
            console.log('🎉 BASIC TEST: WebView is working perfectly!');
            console.log('🎉 BASIC TEST: Message:', message.message);
            console.log('🎉 BASIC TEST: Timestamp:', message.timestamp);
            setIsChartReady(true); // Just to enable further testing
            break;
          case 'CHART_READY':
            console.log('📊 TradingViewChart: Chart is ready and loaded!');
            setIsChartReady(true);
            onChartReady?.();
            break;
          case 'WEBVIEW_TEST':
            console.log(
              'TradingViewChart: WebView test message received:',
              message.message,
            );
            break;
          default:
            console.log(
              'TradingViewChart: Unknown message type:',
              message.type,
            );
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

    console.log(
      '🔧 formatCandleData: Processing',
      data.candles.length,
      'candles',
    );
    console.log('🔧 formatCandleData: First raw candle:', data.candles[0]);

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
          console.warn('🚨 Invalid candle data:', candle, '→', formattedCandle);
          return null;
        }

        return formattedCandle;
      })
      .filter((candle): candle is NonNullable<typeof candle> => candle !== null)
      .sort((a, b) => a.time - b.time); // Sort by time ascending

    console.log(
      '🔧 formatCandleData: Processed',
      formatted.length,
      'valid candles',
    );
    console.log('🔧 formatCandleData: First formatted candle:', formatted[0]);
    console.log(
      '🔧 formatCandleData: Last formatted candle:',
      formatted[formatted.length - 1],
    );

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
      console.log(
        '📊 TradingViewChart: Sending real candle data:',
        dataToSend.length,
        'points',
      );
    } else if (showSampleDataWhenEmpty) {
      dataToSend = [
        { time: '2024-01-01', open: 2000, high: 2100, low: 1950, close: 2050 },
        { time: '2024-01-02', open: 2050, high: 2150, low: 2000, close: 2120 },
        { time: '2024-01-03', open: 2120, high: 2200, low: 2080, close: 2180 },
        { time: '2024-01-04', open: 2180, high: 2250, low: 2150, close: 2200 },
        { time: '2024-01-05', open: 2200, high: 2300, low: 2180, close: 2250 },
      ];
      dataSource = 'sample';
      console.log('📊 TradingViewChart: Sending sample data as fallback');
    }

    if (dataToSend) {
      const message = {
        type: 'SET_CANDLESTICK_DATA',
        data: dataToSend,
        theme: themeMode,
        source: dataSource,
      };

      console.log(
        `📊 TradingViewChart: Posting ${dataSource} data message:`,
        message.data.length,
        'candles',
      );
      webViewRef.current.postMessage(JSON.stringify(message));
    }
  }, [
    isChartReady,
    candleDataVersion,
    themeMode,
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

  // Update theme when it changes
  useEffect(() => {
    if (isChartReady) {
      sendMessage({
        type: 'UPDATE_THEME',
        theme: themeMode,
      });
    }
  }, [themeMode, isChartReady, sendMessage]);

  // Handle WebView errors
  const handleWebViewError = useCallback(
    (error: { description?: string } | null | undefined) => {
      setWebViewError(error?.description || 'WebView error occurred');
      console.error('WebView error:', error);
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
      twClassName="bg-default overflow-hidden rounded-lg"
      style={{ height, width: '100%', minHeight: height }}
      testID={testID || TradingViewChartSelectorsIDs.CONTAINER}
    >
      {isLoading && !isChartReady && (
        <Box
          twClassName="absolute inset-0 items-center justify-center bg-default z-10"
          style={styles.loadingContainer}
        >
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
          <Text variant={TextVariant.BodyMd} twClassName="mt-2">
            Loading chart...
          </Text>
        </Box>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={[styles.webView, { height, width: '100%' }]}
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
  );
};

export default TradingViewChart;

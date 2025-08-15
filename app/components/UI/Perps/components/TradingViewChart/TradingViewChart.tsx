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
                
                // Add sample data for testing
                addSampleData();
                
            } catch (error) {
                console.error('📊 TradingView: Error creating chart:', error);
                updateDebug('Status: ERROR<br/>Library: ✅ Loaded<br/>Chart: ❌ Failed<br/>Data: None');
            }
        }
        
        // Step 3: Add sample data 
        function addSampleData() {
            console.log('📊 TradingView: Adding sample data...');
            updateDebug('Status: Ready<br/>Library: ✅ Loaded<br/>Chart: ✅ Created<br/>Data: Adding...');
            
            if (!window.chart) {
                console.error('📊 TradingView: Chart not available for sample data');
                updateDebug('Status: ERROR<br/>Library: ✅ Loaded<br/>Chart: ❌ Lost<br/>Data: ❌ No chart');
                return;
            }
            
            console.log('📊 TradingView: Chart is available, checking LightweightCharts...');
            console.log('📊 TradingView: window.LightweightCharts available:', !!window.LightweightCharts);
            console.log('📊 TradingView: window.chart available:', !!window.chart);
            
            try {
                console.log('📊 TradingView: Step 1 - Debugging chart object...');
                console.log('📊 TradingView: Chart object type:', typeof window.chart);
                console.log('📊 TradingView: Chart object keys:', Object.keys(window.chart));
                console.log('📊 TradingView: Available methods:', Object.getOwnPropertyNames(window.chart));
                
                // Check for different method names
                console.log('📊 TradingView: addCandlestickSeries available:', !!window.chart.addCandlestickSeries);
                console.log('📊 TradingView: addSeries available:', !!window.chart.addSeries);
                console.log('📊 TradingView: addAreaSeries available:', !!window.chart.addAreaSeries);
                console.log('📊 TradingView: addLineSeries available:', !!window.chart.addLineSeries);
                
                console.log('📊 TradingView: Step 2 - Attempting to create candlestick series...');
                
                // Use the correct TradingView API: addSeries(CandlestickSeries, options)
                console.log('📊 TradingView: Using correct API - chart.addSeries(CandlestickSeries, options)...');
                
                if (!window.LightweightCharts.CandlestickSeries) {
                    console.error('📊 TradingView: CandlestickSeries definition not found in LightweightCharts');
                    throw new Error('CandlestickSeries not available');
                }
                
                const candlestickSeries = window.chart.addSeries(window.LightweightCharts.CandlestickSeries, {
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                });
                
                window.candlestickSeries = candlestickSeries;
                console.log('📊 TradingView: Step 3 - Candlestick series created successfully:', !!window.candlestickSeries);
                
                // Sample data
                const sampleData = [
                    { time: '2024-01-01', open: 2000, high: 2100, low: 1950, close: 2050 },
                    { time: '2024-01-02', open: 2050, high: 2150, low: 2000, close: 2120 },
                    { time: '2024-01-03', open: 2120, high: 2200, low: 2080, close: 2180 },
                    { time: '2024-01-04', open: 2180, high: 2250, low: 2150, close: 2200 },
                    { time: '2024-01-05', open: 2200, high: 2300, low: 2180, close: 2250 },
                    { time: '2024-01-06', open: 2250, high: 2320, low: 2220, close: 2280 },
                    { time: '2024-01-07', open: 2280, high: 2350, low: 2250, close: 2300 },
                ];
                
                console.log('📊 TradingView: Step 3 - Sample data prepared:', sampleData.length, 'points');
                console.log('📊 TradingView: First data point:', JSON.stringify(sampleData[0]));
                
                // Set the data
                console.log('📊 TradingView: Step 4 - Calling setData...');
                window.candlestickSeries.setData(sampleData);
                
                console.log('📊 TradingView: Step 5 - Calling fitContent...');
                window.chart.timeScale().fitContent();
                
                console.log('📊 TradingView: Step 6 - All data operations completed successfully!');
                updateDebug('Status: Ready ✅<br/>Library: ✅ Loaded<br/>Chart: ✅ Active<br/>Data: ✅ ' + sampleData.length + ' candles');
                
            } catch (error) {
                console.error('📊 TradingView: DETAILED Error adding sample data:', error);
                console.error('📊 TradingView: Error name:', error.name);
                console.error('📊 TradingView: Error message:', error.message);
                console.error('📊 TradingView: Error stack:', error.stack);
                updateDebug('Status: ERROR<br/>Library: ✅ Loaded<br/>Chart: ✅ Created<br/>Data: ❌ ' + error.message);
            }
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.chart) {
                window.chart.applyOptions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }
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

  // Convert CandleData to format expected by chart
  const formatCandleData = useCallback((data: CandleData) => {
    if (!data?.candles) return [];

    return data.candles.map((candle) => ({
      time:
        typeof candle.time === 'string'
          ? candle.time
          : new Date(candle.time * 1000).toISOString().split('T')[0],
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume),
    }));
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

  // Update chart data when props change - DISABLED due to broken message bridge
  //   useEffect(() => {
  //     if (
  //       isChartReady &&
  //       candleData &&
  //       candleData.candles &&
  //       candleData.candles.length > 0
  //     ) {
  //       const message = {
  //         type: 'SET_CANDLESTICK_DATA',
  //         data: candleData,
  //         theme: themeMode,
  //         auxiliaryLines: tpslLines,
  //       };

  //       if (webViewRef.current) {
  //         webViewRef.current.postMessage(JSON.stringify(message));
  //         console.log('TradingViewChart: Sample data sent to WebView');
  //       }
  //     }
  //   }, [
  //     isChartReady,
  //     candleDataVersion,
  //     themeMode,
  //     candleData,
  //     showSampleDataWhenEmpty,
  //     formatCandleData,
  //     tpslLines,
  //   ]); // Removed problematic dependencies

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
  const handleWebViewError = useCallback((error: any) => {
    setWebViewError(error?.description || 'WebView error occurred');
    console.error('WebView error:', error);
  }, []);

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

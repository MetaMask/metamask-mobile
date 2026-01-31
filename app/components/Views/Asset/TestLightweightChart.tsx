/* eslint-disable @metamask/design-tokens/color-no-hex */
// Hex colors in this file are used within WebView JavaScript context for the charting library,
// not in React Native components, so design token rules don't apply.

import React, { useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import WebView from '@metamask/react-native-webview';
import { useTheme } from '../../../util/theme';

interface TestLightweightChartProps {
  width?: number;
  height?: number;
}

/**
 * TEST COMPONENT - For evaluating lightweight-charts integration
 * This component uses WebView to embed the web-based lightweight-charts library
 */
const TestLightweightChart: React.FC<TestLightweightChartProps> = ({
  width = Dimensions.get('window').width,
  height = 300,
}) => {
  const { colors } = useTheme();
  const webViewRef = useRef<WebView>(null);

  // Generate realistic mock data with more candles for indicator testing
  // Generates 200 candles (enough for RSI/MACD warm-up + visible data)
  const generateInitialData = () => {
    const data = [];
    const volatility = 0.5;
    const numCandles = 200; // More data for indicators
    const intervalMinutes = 5; // 5-minute candles

    // Start ~16 hours ago (200 * 5 minutes)
    const startTimestamp =
      Math.floor(Date.now() / 1000) - numCandles * intervalMinutes * 60;

    let previousClose = 30.5;

    // Add some trending behavior for more realistic data
    let trendDirection = 1;
    let trendStrength = 0.02;
    let trendDuration = 0;

    for (let i = 0; i < numCandles; i++) {
      const time = startTimestamp + i * intervalMinutes * 60;

      // Change trend every 20-40 candles
      if (trendDuration > 20 + Math.random() * 20) {
        trendDirection *= -1;
        trendStrength = 0.01 + Math.random() * 0.03;
        trendDuration = 0;
      }
      trendDuration++;

      // Random walk with trend
      const randomChange = (Math.random() - 0.5) * volatility;
      const trendChange = trendDirection * trendStrength;
      const change = randomChange + trendChange;

      const open = previousClose;
      const close = parseFloat((open + change).toFixed(2));
      const high = parseFloat(
        (Math.max(open, close) + Math.random() * 0.3).toFixed(2),
      );
      const low = parseFloat(
        (Math.min(open, close) - Math.random() * 0.3).toFixed(2),
      );
      const volume = Math.floor(Math.random() * 2000) + 500;

      data.push({ time, open, high, low, close, volume });
      previousClose = close;
    }

    return data;
  };

  const initialData = generateInitialData();

  // HTML content for WebView with lightweight-charts
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: ${colors.background.default};
          }
          #chart-container {
            width: 100%;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div id="chart-container"></div>
        <script>
          try {
            const chartContainer = document.getElementById('chart-container');
            const containerWidth = ${width};
            const containerHeight = ${height};
            
            // ============ INDICATOR CALCULATION FUNCTIONS ============
            
            // Calculate Simple Moving Average
            function calculateSMA(data, period) {
              const result = [];
              for (let i = period - 1; i < data.length; i++) {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                  sum += data[i - j];
                }
                result.push(sum / period);
              }
              return result;
            }
            
            // Calculate Exponential Moving Average
            function calculateEMA(data, period) {
              const result = [];
              const multiplier = 2 / (period + 1);
              let ema = data[0]; // Start with first value
              result.push(ema);
              
              for (let i = 1; i < data.length; i++) {
                ema = (data[i] - ema) * multiplier + ema;
                result.push(ema);
              }
              return result;
            }
            
            // Calculate RSI
            function calculateRSI(data, period = 14) {
              const changes = [];
              for (let i = 1; i < data.length; i++) {
                changes.push(data[i] - data[i - 1]);
              }
              
              const gains = changes.map(c => c > 0 ? c : 0);
              const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
              
              const avgGains = calculateEMA(gains, period);
              const avgLosses = calculateEMA(losses, period);
              
              const rsi = avgGains.map((gain, i) => {
                const rs = gain / (avgLosses[i] || 0.0001); // Avoid division by zero
                return 100 - (100 / (1 + rs));
              });
              
              return rsi;
            }
            
            // Calculate MACD
            function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
              const fastEMA = calculateEMA(data, fastPeriod);
              const slowEMA = calculateEMA(data, slowPeriod);
              
              const macdLine = [];
              for (let i = 0; i < fastEMA.length && i < slowEMA.length; i++) {
                macdLine.push(fastEMA[i] - slowEMA[i]);
              }
              
              const signalLine = calculateEMA(macdLine, signalPeriod);
              const histogram = [];
              
              for (let i = 0; i < signalLine.length; i++) {
                histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
              }
              
              return { macdLine, signalLine, histogram };
            }
            
            // Calculate VWAP
            function calculateVWAP(data) {
              let cumulativePV = 0;
              let cumulativeVolume = 0;
              const vwap = [];
              
              data.forEach(candle => {
                const typicalPrice = (candle.high + candle.low + candle.close) / 3;
                cumulativePV += typicalPrice * candle.volume;
                cumulativeVolume += candle.volume;
                vwap.push(cumulativePV / cumulativeVolume);
              });
              
              return vwap;
            }
            
            // Calculate Momentum
            function calculateMomentum(data, period = 14) {
              const momentum = [];
              for (let i = period; i < data.length; i++) {
                momentum.push(data[i] - data[i - period]);
              }
              return momentum;
            }
            
            // Calculate Bollinger Bands (for Support/Resistance)
            function calculateBollingerBands(data, period = 20, stdDevMultiplier = 2) {
              const sma = calculateSMA(data, period);
              const bands = { upper: [], middle: [], lower: [] };
              
              for (let i = period - 1; i < data.length; i++) {
                const slice = data.slice(i - period + 1, i + 1);
                const mean = sma[i - period + 1];
                const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
                const stdDev = Math.sqrt(variance);
                
                bands.middle.push(mean);
                bands.upper.push(mean + (stdDevMultiplier * stdDev));
                bands.lower.push(mean - (stdDevMultiplier * stdDev));
              }
              
              return bands;
            }
            
            // ============ CHART SETUP ============
            
            // Create chart
            const chart = LightweightCharts.createChart(chartContainer, {
              width: containerWidth,
              height: containerHeight,
              layout: {
                background: { type: "solid", color: "${colors.background.default}" },
                textColor: "${colors.text.default}",
                attributionLogo: false
              },
              grid: {
                vertLines: { color: "${colors.border.muted}" },
                horzLines: { color: "${colors.border.muted}" }
              },
              timeScale: {
                timeVisible: true,
                secondsVisible: false
              },
              rightPriceScale: {
                alignLabels: true,
              },
              leftPriceScale: {
                visible: true,
                borderColor: '${colors.border.default}',
              }
            });

            // Configure right scale (candles)
            chart.priceScale('right').applyOptions({
              scaleMargins: {
                top: 0.1,
                bottom: 0.25,
              },
              visible: true,
            });

            // Configure left scale (volume)
            chart.priceScale('left').applyOptions({
              scaleMargins: {
                top: 0.75,
                bottom: 0,
              },
              visible: true,
            });

            // ============ DATA & CALCULATIONS ============
            
            const data = ${JSON.stringify(initialData)};
            const closes = data.map(d => d.close);
            
            // Calculate all indicators
            const rsi = calculateRSI(closes, 14);
            const macd = calculateMACD(closes);
            const vwap = calculateVWAP(data);
            const momentum = calculateMomentum(closes, 14);
            const bollingerBands = calculateBollingerBands(closes, 20, 2);
            
            // ============ ADD SERIES TO CHART ============
            
            // Main candlestick series
            const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
              priceScaleId: 'right',
              upColor: "#26a69a",
              downColor: "#ef5350",
              borderVisible: false,
              wickUpColor: "#26a69a",
              wickDownColor: "#ef5350"
            });
            candleSeries.setData(data);

            // Volume histogram
            const volumeSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
              priceScaleId: 'left',
              color: "#26a69a",
              priceFormat: { type: "volume" },
            });
            const volumeData = data.map(d => ({
              time: d.time,
              value: d.volume,
              color: d.close >= d.open ? "#26a69a" : "#ef5350"
            }));
            volumeSeries.setData(volumeData);

            // VWAP Line (overlay on main chart)
            const vwapSeries = chart.addSeries(LightweightCharts.LineSeries, {
              priceScaleId: 'right',
              color: '#2962FF',
              lineWidth: 2,
              title: 'VWAP',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            const vwapData = data.map((d, i) => ({
              time: d.time,
              value: vwap[i]
            }));
            vwapSeries.setData(vwapData);

            // Bollinger Bands (Support/Resistance)
            const bbUpperSeries = chart.addSeries(LightweightCharts.LineSeries, {
              priceScaleId: 'right',
              color: '#E040FB',
              lineWidth: 1,
              lineStyle: 2, // Dashed
              title: 'BB Upper',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            const bbLowerSeries = chart.addSeries(LightweightCharts.LineSeries, {
              priceScaleId: 'right',
              color: '#E040FB',
              lineWidth: 1,
              lineStyle: 2, // Dashed
              title: 'BB Lower',
              lastValueVisible: false,
              priceLineVisible: false,
            });
            
            const bbStartIndex = 19; // Bollinger needs 20 periods
            const bbUpperData = data.slice(bbStartIndex).map((d, i) => ({
              time: d.time,
              value: bollingerBands.upper[i]
            }));
            const bbLowerData = data.slice(bbStartIndex).map((d, i) => ({
              time: d.time,
              value: bollingerBands.lower[i]
            }));
            bbUpperSeries.setData(bbUpperData);
            bbLowerSeries.setData(bbLowerData);

            // ============ LOG INDICATORS (for debugging) ============
            console.log('=== LIGHTWEIGHT CHARTS TEST - INDICATORS CALCULATED ===');
            console.log('Total candles:', data.length);
            console.log('RSI (last 5):', rsi.slice(-5));
            console.log('VWAP (last 5):', vwap.slice(-5));
            console.log('MACD histogram (last 5):', macd.histogram.slice(-5));
            console.log('Momentum (last 5):', momentum.slice(-5));
            console.log('Bollinger Bands (last 3 upper):', bollingerBands.upper.slice(-3));
            console.log('===================================================');
            
            // ============ DISPLAY INDICATOR VALUES IN UI ============
            // Since WebView console is hard to access, show values on screen
            const indicatorDisplay = document.createElement('div');
            indicatorDisplay.style.cssText = \`
              position: absolute;
              top: 10px;
              left: 10px;
              background: rgba(0, 0, 0, 0.8);
              color: #fff;
              padding: 10px;
              border-radius: 5px;
              font-family: monospace;
              font-size: 11px;
              z-index: 1000;
              max-width: 300px;
              line-height: 1.4;
            \`;
            
            const lastRSI = rsi[rsi.length - 1];
            const lastVWAP = vwap[vwap.length - 1];
            const lastMACD = macd.histogram[macd.histogram.length - 1];
            const lastMomentum = momentum[momentum.length - 1];
            
            indicatorDisplay.innerHTML = \`
              <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50; border-bottom: 1px solid #444; padding-bottom: 5px;">
                📊 Technical Indicators
              </div>
              <div style="margin-bottom: 8px;">
                <div style="color: #2196F3; margin-bottom: 2px;">
                  📈 VWAP: \${lastVWAP?.toFixed(2) || 'N/A'} <span style="color: #4CAF50;">(visible)</span>
                </div>
                <div style="color: #E040FB; margin-bottom: 2px;">
                  📈 Bollinger Bands <span style="color: #4CAF50;">(visible)</span>
                </div>
              </div>
              <div style="border-top: 1px solid #444; padding-top: 5px;">
                <div style="color: #9C27B0; margin-bottom: 2px;">
                  ✓ RSI(14): \${lastRSI?.toFixed(2) || 'N/A'} <span style="color: #FF9800;">(calc only)</span>
                </div>
                <div style="color: #FF9800; margin-bottom: 2px;">
                  ✓ MACD Hist: \${lastMACD?.toFixed(4) || 'N/A'} <span style="color: #FF9800;">(calc only)</span>
                </div>
                <div style="color: #F44336; margin-bottom: 2px;">
                  ✓ Momentum: \${lastMomentum?.toFixed(2) || 'N/A'} <span style="color: #FF9800;">(calc only)</span>
                </div>
              </div>
              <div style="margin-top: 8px; padding-top: 5px; border-top: 1px solid #444; color: #888; font-size: 10px;">
                Note: RSI/MACD/Momentum need separate panes<br/>
                (incompatible Y-axis scales with price chart)
              </div>
            \`;
            
            document.body.appendChild(indicatorDisplay);

            chart.timeScale().fitContent();

            // Handle window resize
            window.addEventListener('resize', () => {
              chart.applyOptions({
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight
              });
            });

          } catch (error) {
            console.error('Chart initialization error:', error);
            document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
          }
        </script>
      </body>
    </html>
  `;

  const styles = StyleSheet.create({
    container: {
      width: '100%',
      overflow: 'hidden',
    },
    webview: {
      flex: 1,
    },
  });

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView HTTP error: ', nativeEvent);
        }}
      />
    </View>
  );
};

export default TestLightweightChart;

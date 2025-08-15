import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import ReanimatedCandlestickChart from './ReanimatedCandlestickChart';

interface CandleTestData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

const ReanimatedCandlestickChartTest: React.FC<{
  testData?: CandleTestData[];
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
}> = ({ testData, width = 350, height = 400, theme = 'dark' }) => {
  // Generate sample data for testing
  const sampleData = useMemo(() => {
    if (testData && testData.length > 0) {
      return testData;
    }

    const data: CandleTestData[] = [];
    let currentPrice = 45000; // Start at $45,000
    const baseTime = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago

    // Generate 200 candles for comprehensive zoom testing
    for (let i = 0; i < 200; i++) {
      const timestamp = baseTime + i * 24 * 60 * 60 * 1000; // Daily candles
      const open = currentPrice;

      // Realistic market movement patterns
      const trendComponent = Math.sin(i / 30) * 0.002; // Long-term trend
      const volatility = 0.015 + Math.abs(Math.sin(i / 7)) * 0.025; // Weekly volatility cycle
      const randomComponent = (Math.random() - 0.5) * volatility;
      const totalChange = (trendComponent + randomComponent) * currentPrice;

      // Calculate OHLC with realistic relationships
      const close = open + totalChange;
      const rangeFactor = Math.random() * 0.025; // Random range size
      const highLowRange = Math.abs(totalChange) + currentPrice * rangeFactor;

      let high: number, low: number;

      if (close > open) {
        // Bullish candle
        high = Math.max(open, close) + Math.random() * highLowRange * 0.4;
        low = Math.min(open, close) - Math.random() * highLowRange * 0.6;
      } else {
        // Bearish candle
        high = Math.max(open, close) + Math.random() * highLowRange * 0.6;
        low = Math.min(open, close) - Math.random() * highLowRange * 0.4;
      }

      // Ensure high >= max(open, close) and low <= min(open, close)
      high = Math.max(high, Math.max(open, close));
      low = Math.min(low, Math.min(open, close));

      data.push({
        timestamp,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
      });

      currentPrice = close;
    }

    return data;
  }, [testData]);

  const styles = StyleSheet.create({
    container: {
      padding: 16,
    },
    header: {
      marginBottom: 16,
    },
    infoSection: {
      marginVertical: 10,
    },
    benefitsSection: {
      marginTop: 12,
    },
    instructionsSection: {
      marginTop: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant={TextVariant.HeadingMd} color={TextColor.InfoDefault}>
          🚀 Reanimated Smooth Zoom Chart
        </Text>

        <View style={styles.infoSection}>
          <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
            ✅ Smooth Reanimated Transforms: 60fps zoom & pan animations
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
            ✅ No Data Manipulation: All {sampleData.length} candles always
            rendered
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.InfoDefault}>
            📊 Visual Scaling: Transform-based zoom with spring animations
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.InfoDefault}>
            🎯 Gesture Handling: Simultaneous pinch-zoom and pan gestures
          </Text>
        </View>

        <View style={styles.instructionsSection}>
          <Text variant={TextVariant.BodyXs} color={TextColor.InfoDefault}>
            📱 Gestures: Pinch to zoom (0.5x - 5x) • Pan to navigate • Tap
            &quot;Reset Zoom&quot;
          </Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.InfoDefault}>
            🎬 Animations: Spring physics on gesture release for smooth feel
          </Text>
        </View>
      </View>

      <ReanimatedCandlestickChart
        allTransformedData={sampleData}
        width={width}
        height={height}
        theme={theme}
        testID="reanimated-candlestick-test"
      />

      <View style={styles.benefitsSection}>
        <Text variant={TextVariant.BodyXs} color={TextColor.InfoDefault}>
          🏆 Reanimated Advantages:
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.SuccessDefault}>
          • Zero data manipulation jank - Visual transforms only
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.SuccessDefault}>
          • 60fps native animations - Runs on UI thread
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.SuccessDefault}>
          • Smooth spring physics - Professional feel
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.SuccessDefault}>
          • Simultaneous gestures - Pinch + pan together
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.InfoDefault}>
          • Memory efficient - No duplicate data creation
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.InfoDefault}>
          • Constraint-based - Prevents over-panning/zooming
        </Text>
      </View>
    </View>
  );
};

export default ReanimatedCandlestickChartTest;

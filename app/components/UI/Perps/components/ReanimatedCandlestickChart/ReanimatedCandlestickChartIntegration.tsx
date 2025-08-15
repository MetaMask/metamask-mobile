import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import ReanimatedCandlestickChart from './ReanimatedCandlestickChart';

interface TransformedDataItem {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  [key: string]: unknown;
}

// Integration wrapper that matches existing chart component interface
interface ReanimatedCandlestickChartIntegrationProps {
  allTransformedData: TransformedDataItem[];
  width: number;
  height: number;
  isLoading?: boolean;
  theme?: 'dark' | 'light';
  selectedCandlePeriod?: unknown;
  selectedTimeDuration?: unknown;
  testID?: string;
  onCandleClick?: (timestamp: number) => void;
  onRangeChange?: (from: number, to: number) => void;
}

const ReanimatedCandlestickChartIntegration: React.FC<
  ReanimatedCandlestickChartIntegrationProps
> = ({
  allTransformedData,
  width,
  height,
  isLoading = false,
  theme = 'dark',
  selectedCandlePeriod: _selectedCandlePeriod,
  selectedTimeDuration: _selectedTimeDuration,
  testID,
  onCandleClick: _onCandleClick,
  onRangeChange: _onRangeChange,
}) => {
  const styles = StyleSheet.create({
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    debugInfo: {
      padding: 8,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    chartContainer: {
      flex: 1,
    },
  });

  if (isLoading) {
    return (
      <View
        style={[styles.loadingContainer, { width, height }]}
        testID={testID}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.InfoDefault}>
          Loading reanimated chart...
        </Text>
      </View>
    );
  }

  if (!allTransformedData || allTransformedData.length === 0) {
    return (
      <View
        style={[styles.loadingContainer, { width, height }]}
        testID={testID}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.InfoDefault}>
          No chart data available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text variant={TextVariant.BodyXs} color={TextColor.InfoDefault}>
          🚀 Reanimated Wagmi Chart: {allTransformedData.length} candles |
          Smooth zoom & pan
        </Text>
      </View>

      {/* Reanimated Chart */}
      <View style={styles.chartContainer}>
        <ReanimatedCandlestickChart
          allTransformedData={allTransformedData}
          width={width}
          height={height - 28} // Account for debug info height
          theme={theme}
          testID={testID || 'reanimated-candlestick-chart'}
        />
      </View>
    </View>
  );
};

export default ReanimatedCandlestickChartIntegration;

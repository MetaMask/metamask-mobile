import React from 'react';
import { View, Dimensions, TouchableOpacity } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';

interface CandleData {
  coin: string;
  interval: string;
  candles: {
    time: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }[];
}

interface CandlestickChartComponentProps {
  candleData: CandleData | null;
  isLoading?: boolean;
  height?: number;
  selectedInterval?: string;
  onIntervalChange?: (interval: string) => void;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      backgroundColor: colors.background.default,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    chartContainer: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      textAlign: 'center' as const,
    },
    noDataText: {
      textAlign: 'center' as const,
    },
    priceLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
      alignSelf: 'flex-start' as const,
    },
    priceText: {
      color: colors.text.default,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    dateLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
      alignSelf: 'flex-start' as const,
    },
    dateText: {
      color: colors.text.muted,
      fontSize: 12,
    },
    // Grid line styles
    gridLine: {
      color: colors.border.muted,
      opacity: 0.6,
    },
    majorGridLine: {
      color: colors.border.muted,
      opacity: 0.8,
    },
    gridContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      pointerEvents: 'none' as const,
    },
    gridLineWithLabel: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    gridLineBar: {
      flex: 1,
      height: 1,
    },
    gridPriceLabel: {
      position: 'absolute' as const,
      right: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      minWidth: 60,
    },
    gridPriceLabelText: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: colors.text.muted,
      textAlign: 'right' as const,
      textShadowColor: colors.background.default,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    },
    // Tooltip styling
    tooltipContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      shadowColor: colors.shadow.default,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    tooltipText: {
      color: colors.text.default,
      fontSize: 12,
      fontWeight: '600' as const,
    },
    tooltipDateText: {
      color: colors.text.muted,
      fontSize: 10,
      marginTop: 2,
    },
    // Interval selector styling
    intervalSelector: {
      flexDirection: 'row' as const,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 4,
      marginTop: 16,
      alignSelf: 'center' as const,
    },
    intervalTab: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginHorizontal: 2,
      minWidth: 40,
      alignItems: 'center' as const,
    },
    intervalTabActive: {
      backgroundColor: colors.primary.default,
    },
    intervalTabInactive: {
      backgroundColor: 'transparent',
    },
    intervalTabText: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    intervalTabTextActive: {
      color: colors.primary.inverse,
    },
    intervalTabTextInactive: {
      color: colors.text.muted,
    },
  };
};

const CandlestickChartComponent: React.FC<CandlestickChartComponentProps> = ({
  candleData,
  isLoading = false,
  height = 300,
  selectedInterval = '1h',
  onIntervalChange,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 48; // Account for padding

  // Available intervals
  const intervals = [
    { label: '1M', value: '1m' },
    { label: '5M', value: '5m' },
    { label: '15M', value: '15m' },
    { label: '30M', value: '30m' },
    { label: '1H', value: '1h' },
    { label: '2H', value: '2h' },
    { label: '4H', value: '4h' },
    { label: '8H', value: '8h' },
  ];

  // Transform data to wagmi-charts format
  const transformedData = React.useMemo(() => {
    if (!candleData?.candles || candleData.candles.length === 0) {
      return [];
    }

    return candleData.candles.map((candle) => ({
      timestamp: candle.time,
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
    }));
  }, [candleData]);

  // Calculate evenly spaced horizontal lines with better visibility
  const gridLines = React.useMemo(() => {
    if (transformedData.length === 0) return [];

    const prices = transformedData.flatMap((d) => [
      d.open,
      d.high,
      d.low,
      d.close,
    ]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Create 6 horizontal grid lines (including top and bottom)
    const gridLineCount = 6;
    const lines = [];

    for (let i = 0; i < gridLineCount; i++) {
      const price = minPrice + (priceRange * i) / (gridLineCount - 1);
      const isEdgeLine = i === 0 || i === gridLineCount - 1;

      lines.push({
        price: price,
        isEdge: isEdgeLine,
        position: (i / (gridLineCount - 1)) * (height - 120), // Direct pixel positioning
      });
    }

    return lines;
  }, [transformedData, height]);

  if (isLoading) {
    return (
      <View style={[styles.container, { height: height + 60 }]}>
        <View style={styles.chartContainer}>
          {/* Chart placeholder with same height */}
          <View style={{ position: 'relative' }}>
            <View
              style={{
                height: height - 120,
                width: chartWidth,
                backgroundColor: 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Muted}
                style={styles.loadingText}
              >
                Loading chart data...
              </Text>
            </View>
          </View>

          {/* Interval Selector - same as non-loading state */}
          <View style={styles.intervalSelector}>
            {intervals.map((interval) => (
              <TouchableOpacity
                key={interval.value}
                style={[
                  styles.intervalTab,
                  selectedInterval === interval.value
                    ? styles.intervalTabActive
                    : styles.intervalTabInactive,
                ]}
                onPress={() => onIntervalChange?.(interval.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.intervalTabText,
                    selectedInterval === interval.value
                      ? styles.intervalTabTextActive
                      : styles.intervalTabTextInactive,
                  ]}
                >
                  {interval.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (!candleData || transformedData.length === 0) {
    return (
      <View style={[styles.container, { height: height + 60 }]}>
        <View style={styles.chartContainer}>
          {/* Chart placeholder with same height */}
          <View style={{ position: 'relative' }}>
            <View
              style={{
                height: height - 120,
                width: chartWidth,
                backgroundColor: 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Muted}
                style={styles.noDataText}
              >
                No chart data available
              </Text>
            </View>
          </View>

          {/* Interval Selector - same as non-loading state */}
          <View style={styles.intervalSelector}>
            {intervals.map((interval) => (
              <TouchableOpacity
                key={interval.value}
                style={[
                  styles.intervalTab,
                  selectedInterval === interval.value
                    ? styles.intervalTabActive
                    : styles.intervalTabInactive,
                ]}
                onPress={() => onIntervalChange?.(interval.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.intervalTabText,
                    selectedInterval === interval.value
                      ? styles.intervalTabTextActive
                      : styles.intervalTabTextInactive,
                  ]}
                >
                  {interval.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: height + 60 }]}>
      <CandlestickChart.Provider data={transformedData}>
        <View style={styles.chartContainer}>
          {/* Chart with Custom Grid Lines */}
          <View style={{ position: 'relative' }}>
            {/* Custom Horizontal Grid Lines */}
            <View style={styles.gridContainer}>
              {gridLines.map((line, index) => (
                <View
                  key={`grid-${index}`}
                  style={{
                    position: 'absolute',
                    top: line.position,
                    left: 0,
                    right: 60, // Leave space for price label
                    height: line.isEdge ? 2 : 1,
                    backgroundColor: line.isEdge
                      ? styles.majorGridLine.color
                      : styles.gridLine.color,
                    opacity: line.isEdge
                      ? styles.majorGridLine.opacity
                      : styles.gridLine.opacity,
                  }}
                />
              ))}

              {/* Price Labels */}
              {gridLines.map((line, index) => (
                <View
                  key={`label-${index}`}
                  style={{
                    position: 'absolute',
                    top: line.position - 8, // Center the label on the line
                    right: 4,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                    borderRadius: 4,
                    minWidth: 50,
                  }}
                >
                  <Text style={styles.gridPriceLabelText}>
                    ${Number(line.price).toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Main Candlestick Chart */}
            <CandlestickChart
              height={height - 120} // Account for labels and padding
              width={chartWidth}
            >
              {/* Candlestick Data */}
              <CandlestickChart.Candles
                positiveColor="#00D68F" // Green for positive candles
                negativeColor="#FF6B6B" // Red for negative candles
              />

              {/* Interactive Crosshair */}
              <CandlestickChart.Crosshair>
                <CandlestickChart.Tooltip
                  style={styles.tooltipContainer}
                  tooltipTextProps={{
                    style: styles.tooltipText,
                  }}
                />
              </CandlestickChart.Crosshair>
            </CandlestickChart>
          </View>

          {/* Interval Selector */}
          <View style={styles.intervalSelector}>
            {intervals.map((interval) => (
              <TouchableOpacity
                key={interval.value}
                style={[
                  styles.intervalTab,
                  selectedInterval === interval.value
                    ? styles.intervalTabActive
                    : styles.intervalTabInactive,
                ]}
                onPress={() => onIntervalChange?.(interval.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.intervalTabText,
                    selectedInterval === interval.value
                      ? styles.intervalTabTextActive
                      : styles.intervalTabTextInactive,
                  ]}
                >
                  {interval.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </CandlestickChart.Provider>
    </View>
  );
};

export default CandlestickChartComponent;

import React from 'react';
import { View, Dimensions } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { styleSheet, getGridLineStyle } from './PerpsCandlestickChart.styles';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  PERPS_CHART_CONFIG,
  getCandlestickColors,
} from '../../constants/chartConfig';
import PerpsCandlestickChartIntervalSelector from '../PerpsCandlestickChartIntervalSelector';
import { strings } from '../../../../../../locales/i18n';
import type { CandleData } from '../../types';

interface CandlestickChartComponentProps {
  candleData: CandleData | null;
  isLoading?: boolean;
  height?: number;
  selectedInterval?: string;
  onIntervalChange?: (interval: string) => void;
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - PERPS_CHART_CONFIG.PADDING.HORIZONTAL * 2; // Account for padding

const CandlestickChartComponent: React.FC<CandlestickChartComponentProps> = ({
  candleData,
  isLoading = false,
  height = PERPS_CHART_CONFIG.DEFAULT_HEIGHT,
  selectedInterval = '1h',
  onIntervalChange,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});

  // Get candlestick colors from centralized configuration
  // This allows for easy customization and potential user settings integration
  // useMemo prevents object recreation on every render
  const candlestickColors = React.useMemo(
    () => getCandlestickColors(theme.colors),
    [theme.colors],
  );

  // Transform data to wagmi-charts format with validation
  const transformedData = React.useMemo(() => {
    if (!candleData?.candles || candleData.candles.length === 0) {
      return [];
    }

    return candleData.candles
      .map((candle) => {
        const open = parseFloat(candle.open);
        const high = parseFloat(candle.high);
        const low = parseFloat(candle.low);
        const close = parseFloat(candle.close);

        // Validate numeric values
        if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
          console.warn(`Invalid candle data for time ${candle.time}`, {
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          });
          return null;
        }

        return { timestamp: candle.time, open, high, low, close };
      })
      .filter(
        (candle): candle is NonNullable<typeof candle> => candle !== null,
      ); // Remove invalid candles
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
    const gridLineCount = PERPS_CHART_CONFIG.GRID_LINE_COUNT;
    const lines = [];

    for (let i = 0; i < gridLineCount; i++) {
      const price = minPrice + (priceRange * i) / (gridLineCount - 1);
      const isEdgeLine = i === 0 || i === gridLineCount - 1;

      lines.push({
        price,
        isEdge: isEdgeLine,
        position:
          (i / (gridLineCount - 1)) *
          (height - PERPS_CHART_CONFIG.PADDING.VERTICAL), // Direct pixel positioning
      });
    }

    return lines;
  }, [transformedData, height]);

  if (isLoading) {
    return (
      <View style={styles.chartContainer}>
        {/* Chart placeholder with same height */}
        <View style={styles.relativeContainer}>
          <View
            style={[
              styles.chartLoadingContainer,
              {
                height: height - PERPS_CHART_CONFIG.PADDING.VERTICAL, // Same as loaded chart
                width: chartWidth, // Same as loaded chart
              },
            ]}
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

        {/* Interval Selector */}
        <PerpsCandlestickChartIntervalSelector
          selectedInterval={selectedInterval}
          onIntervalChange={onIntervalChange}
          testID="perps-chart-interval-selector-loading"
        />
      </View>
    );
  }

  if (!candleData || transformedData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        {/* Chart placeholder with same height */}
        <View style={styles.relativeContainer}>
          <View
            style={[
              styles.noDataContainer,
              {
                height: height - 120,
                width: chartWidth,
              },
            ]}
          >
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              style={styles.noDataText}
            >
              {strings('perps.chart.no_data')}
            </Text>
          </View>
        </View>

        {/* Interval Selector */}
        <PerpsCandlestickChartIntervalSelector
          selectedInterval={selectedInterval}
          onIntervalChange={onIntervalChange}
          testID="perps-chart-interval-selector-no-data"
        />
      </View>
    );
  }

  return (
    <CandlestickChart.Provider data={transformedData}>
      <View style={styles.chartContainer}>
        {/* Chart with Custom Grid Lines */}
        <View style={styles.relativeContainer}>
          {/* Custom Horizontal Grid Lines */}
          <View style={styles.gridContainer}>
            {gridLines.map((line, index) => (
              <View
                key={`grid-${index}`}
                style={getGridLineStyle(
                  theme.colors,
                  line.isEdge,
                  line.position,
                )}
              />
            ))}
          </View>

          {/* Main Candlestick Chart */}
          <CandlestickChart
            height={height - PERPS_CHART_CONFIG.PADDING.VERTICAL} // Account for labels and padding
            width={chartWidth}
          >
            {/* Candlestick Data */}
            <CandlestickChart.Candles
              positiveColor={candlestickColors.positive} // Green for positive candles
              negativeColor={candlestickColors.negative} // Red for negative candles
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
        <PerpsCandlestickChartIntervalSelector
          selectedInterval={selectedInterval}
          onIntervalChange={onIntervalChange}
          testID="perps-chart-interval-selector"
        />
      </View>
    </CandlestickChart.Provider>
  );
};

export default CandlestickChartComponent;

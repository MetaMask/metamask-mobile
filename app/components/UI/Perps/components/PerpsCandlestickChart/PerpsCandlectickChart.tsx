import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { getGridLineStyle, styleSheet } from './PerpsCandlestickChart.styles';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  PERPS_CHART_CONFIG,
  TimeDuration,
  getCandlestickColors,
} from '../../constants/chartConfig';
import { PerpsCandlestickChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsTimeDurationSelector from '../PerpsTimeDurationSelector';
import PerpsCandlestickChartSkeleton from './PerpsCandlestickChartSkeleton';
import { strings } from '../../../../../../locales/i18n';
import type { CandleData } from '../../types';

interface TPSLLines {
  takeProfitPrice?: string;
  stopLossPrice?: string;
}

interface CandlestickChartComponentProps {
  candleData: CandleData | null;
  isLoading?: boolean;
  height?: number;
  selectedDuration?: TimeDuration;
  tpslLines?: TPSLLines;

  onDurationChange?: (duration: TimeDuration) => void;
  onGearPress?: () => void;
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - PERPS_CHART_CONFIG.PADDING.HORIZONTAL * 2; // Account for padding

const CandlestickChartComponent: React.FC<CandlestickChartComponentProps> = ({
  candleData,
  isLoading = false,
  height = PERPS_CHART_CONFIG.DEFAULT_HEIGHT,
  selectedDuration = TimeDuration.ONE_DAY,
  tpslLines,
  onDurationChange,
  onGearPress,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [showTPSLLines, setShowTPSLLines] = React.useState(false);

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

  // Show TP/SL lines after a short delay to ensure chart is rendered
  useEffect(() => {
    if (tpslLines && !isLoading && transformedData.length > 0) {
      const timeout = setTimeout(() => {
        setShowTPSLLines(true);
      }, 10);

      return () => clearTimeout(timeout);
    }
    setShowTPSLLines(false);
  }, [tpslLines, isLoading, transformedData.length]);

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

  // Calculate TP/SL line positions if they exist and are within chart bounds
  // Use the same calculation method as grid lines for consistency
  const tpslLinePositions = React.useMemo(() => {
    if (!tpslLines || transformedData.length === 0) return null;

    const prices = transformedData.flatMap((d) => [
      d.open,
      d.high,
      d.low,
      d.close,
    ]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const chartHeight = height - PERPS_CHART_CONFIG.PADDING.VERTICAL;

    const lines: { type: 'tp' | 'sl'; price: number; position: number }[] = [];

    // Take Profit line
    if (tpslLines.takeProfitPrice) {
      const tpPrice = parseFloat(tpslLines.takeProfitPrice);
      if (tpPrice >= minPrice && tpPrice <= maxPrice && priceRange > 0) {
        // Use exact same calculation as grid lines but for specific price with some additional number tweaks to account for wagmi chart positioning
        const normalizedPosition = (tpPrice - minPrice) / priceRange;
        const position = chartHeight * (1.012 - normalizedPosition);
        lines.push({ type: 'tp', price: tpPrice, position });
      }
    }

    // Stop Loss line
    if (tpslLines.stopLossPrice) {
      const slPrice = parseFloat(tpslLines.stopLossPrice);
      if (slPrice >= minPrice && slPrice <= maxPrice && priceRange > 0) {
        // Use exact same calculation as grid lines but for specific price
        const normalizedPosition = (slPrice - minPrice) / priceRange;
        const position = chartHeight * (0.98 - normalizedPosition);
        lines.push({ type: 'sl', price: slPrice, position });
      }
    }

    return lines.length > 0 ? lines : null;
  }, [tpslLines, transformedData, height]);

  if (isLoading) {
    return (
      <View style={styles.chartContainer}>
        {/* Chart placeholder with same height */}
        <View style={styles.relativeContainer}>
          <PerpsCandlestickChartSkeleton
            height={height}
            testID={PerpsCandlestickChartSelectorsIDs.LOADING_SKELETON}
          />
        </View>

        {/* Time Duration Selector */}
        <PerpsTimeDurationSelector
          selectedDuration={selectedDuration}
          onDurationChange={onDurationChange}
          onGearPress={onGearPress}
          testID={PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR_LOADING}
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

        {/* Time Duration Selector */}
        <PerpsTimeDurationSelector
          selectedDuration={selectedDuration}
          onDurationChange={onDurationChange}
          onGearPress={onGearPress}
          testID={PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR_NO_DATA}
        />
      </View>
    );
  }

  return (
    <CandlestickChart.Provider data={transformedData}>
      <View style={styles.chartContainer}>
        {/* Chart with Custom Grid Lines */}
        <View style={styles.relativeContainer}>
          {/* Main Candlestick Chart */}
          <CandlestickChart
            height={height - PERPS_CHART_CONFIG.PADDING.VERTICAL} // Account for labels and padding
            width={chartWidth}
          >
            {/* TP/SL Lines - Render first so they're behind everything */}
            {tpslLinePositions && showTPSLLines && (
              <View style={styles.tpslContainer}>
                {tpslLinePositions.map((line, index) => (
                  <View
                    key={`tpsl-${line.type}-${index}`}
                    testID={`tpsl-${line.type}-${index}`}
                    style={[
                      styles.tpslLine,
                      {
                        top: line.position,
                        borderTopColor:
                          line.type === 'tp'
                            ? theme.colors.success.default // Green for Take Profit
                            : theme.colors.error.default, // Red for Stop Loss
                      },
                    ]}
                  />
                ))}
              </View>
            )}

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

        {/* Time Duration Selector */}
        <PerpsTimeDurationSelector
          selectedDuration={selectedDuration}
          onDurationChange={onDurationChange}
          onGearPress={onGearPress}
          testID={PerpsCandlestickChartSelectorsIDs.DURATION_SELECTOR}
        />
      </View>
    </CandlestickChart.Provider>
  );
};

export default CandlestickChartComponent;

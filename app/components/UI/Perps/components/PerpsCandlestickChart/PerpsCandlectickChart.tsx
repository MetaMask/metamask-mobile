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
  entryPrice?: string;
  liquidationPrice?: string | null;
  currentPrice?: string;
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
const chartWidth = screenWidth; // Full screen width, no horizontal padding

// Helper function to format price for y-axis labels
const formatPriceForAxis = (price: number): string =>
  // Round to whole number and add commas for thousands
  Math.round(price).toLocaleString('en-US');

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
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);

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

  // Track when data has been initially loaded
  useEffect(() => {
    if (!isLoading && transformedData.length > 0 && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [isLoading, transformedData.length, hasInitiallyLoaded]);

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
          ((gridLineCount - 1 - i) / (gridLineCount - 1)) *
          (height - PERPS_CHART_CONFIG.PADDING.VERTICAL), // Inverted positioning: higher prices at top
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

    const lines: {
      type: 'tp' | 'sl' | 'entry' | 'liquidation' | 'current';
      price: number;
      position: number;
    }[] = [];

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

    // Entry Price line
    if (tpslLines.entryPrice) {
      const entryPrice = parseFloat(tpslLines.entryPrice);
      if (entryPrice >= minPrice && entryPrice <= maxPrice && priceRange > 0) {
        // Use exact same calculation as grid lines but for specific price
        const normalizedPosition = (entryPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'entry', price: entryPrice, position });
      }
    }

    // Liquidation Price line
    if (tpslLines.liquidationPrice) {
      const liquidationPrice = parseFloat(tpslLines.liquidationPrice);
      if (
        liquidationPrice >= minPrice &&
        liquidationPrice <= maxPrice &&
        priceRange > 0
      ) {
        // Use exact same calculation as grid lines but for specific price
        const normalizedPosition = (liquidationPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'liquidation', price: liquidationPrice, position });
      }
    }

    // Current Price line
    if (tpslLines.currentPrice) {
      const currentPrice = parseFloat(tpslLines.currentPrice);
      if (
        currentPrice >= minPrice &&
        currentPrice <= maxPrice &&
        priceRange > 0
      ) {
        // Use exact same calculation as grid lines but for specific price
        const normalizedPosition = (currentPrice - minPrice) / priceRange;
        const position = chartHeight * (1 - normalizedPosition);
        lines.push({ type: 'current', price: currentPrice, position });
      }
    }

    return lines.length > 0 ? lines : null;
  }, [tpslLines, transformedData, height]);

  // Only show skeleton on initial load, not on interval changes
  if (isLoading && !hasInitiallyLoaded) {
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
      {/* Custom Horizontal Grid Lines with Price Labels */}
      <View style={styles.gridContainer}>
        {gridLines.map((line, index) => (
          <View key={`grid-${index}`}>
            {/* Grid Line */}
            <View
              style={getGridLineStyle(theme.colors, line.isEdge, line.position)}
            />
            {/* Price Label */}
            <View
              style={[
                styles.gridPriceLabel,
                {
                  top: line.position - 10, // Center the label on the line
                  backgroundColor: theme.colors.background.default,
                  borderColor: theme.colors.border.muted,
                },
              ]}
            >
              <Text variant={TextVariant.BodyXS} color={TextColor.Alternative}>
                ${formatPriceForAxis(line.price)}
              </Text>
            </View>
          </View>
        ))}
      </View>
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
                  width: chartWidth - 65, // Match the chart width
                  // eslint-disable-next-line react-native/no-color-literals, react-native/no-inline-styles
                  borderTopColor:
                    line.type === 'tp'
                      ? theme.colors.success.default // Green for Take Profit
                      : line.type === 'sl'
                      ? theme.colors.border.default // Gray for Stop Loss
                      : line.type === 'entry'
                      ? theme.colors.text.alternative // Light Gray for Entry Price
                      : line.type === 'liquidation'
                      ? theme.colors.error.default // Pink/Red for Liquidation Price
                      : theme.colors.text.default, // White for Current Price
                },
              ]}
            />
          ))}
        </View>
      )}
      <View style={styles.chartContainer}>
        {/* Chart with Custom Grid Lines */}
        <View style={styles.relativeContainer}>
          {/* Main Candlestick Chart */}
          <CandlestickChart
            height={height - PERPS_CHART_CONFIG.PADDING.VERTICAL} // Account for labels and padding
            width={chartWidth - 65}
            style={styles.chartWithPadding}
          >
            {/* Candlestick Data */}
            <CandlestickChart.Candles
              positiveColor={candlestickColors.positive} // Green for positive candles
              negativeColor={candlestickColors.negative} // Red for negative candles
            />
          </CandlestickChart>
        </View>

        {/* X-Axis Time Labels */}
        <View style={styles.timeAxisContainer}>
          {transformedData.length > 0 &&
            (() => {
              // Create 5 evenly spaced time points from actual data
              const intervals = [];
              const dataLength = transformedData.length;
              const chartWidthForLabels = chartWidth - 65; // Account for y-axis space

              for (let i = 0; i < 5; i++) {
                const dataIndex = Math.floor((i / 4) * (dataLength - 1));
                const time = transformedData[dataIndex].timestamp;
                const position = (i / 4) * chartWidthForLabels;
                intervals.push({ time, position, index: i });
              }

              return intervals.map((interval) => (
                <Text
                  key={`time-${interval.index}`}
                  variant={TextVariant.BodyXS}
                  color={TextColor.Alternative}
                  style={[
                    styles.timeLabel,
                    {
                      left: interval.position,
                    },
                  ]}
                >
                  {(() => {
                    const date = new Date(interval.time);
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date
                      .getMinutes()
                      .toString()
                      .padStart(2, '0');
                    const monthNames = [
                      'Jan',
                      'Feb',
                      'Mar',
                      'Apr',
                      'May',
                      'Jun',
                      'Jul',
                      'Aug',
                      'Sep',
                      'Oct',
                      'Nov',
                      'Dec',
                    ];
                    const month = monthNames[date.getMonth()];
                    const day = date.getDate();
                    return `${hours}:${minutes}\n${month} ${day}`;
                  })()}
                </Text>
              ));
            })()}
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

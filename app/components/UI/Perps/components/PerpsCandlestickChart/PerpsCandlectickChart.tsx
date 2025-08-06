import React, { useEffect, useCallback } from 'react';
import { View, Dimensions, ActivityIndicator } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
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
  CandlePeriod,
  getCandlestickColors,
  calculateCandleCount,
} from '../../constants/chartConfig';
import { PerpsCandlestickChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsTimeDurationSelector from '../PerpsTimeDurationSelector';
import PerpsCandlestickChartSkeleton from './PerpsCandlestickChartSkeleton';
import { strings } from '../../../../../../locales/i18n';
import type { CandleData } from '../../types';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

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
  selectedInterval?: CandlePeriod;
  tpslLines?: TPSLLines;

  onDurationChange?: (duration: TimeDuration) => void;
  onGearPress?: () => void;
  // Pan navigation props
  onPanNavigate?: (direction: 'left' | 'right') => void;
  onLoadMoreData?: (direction: 'left' | 'right') => Promise<void>;
  isPanEnabled?: boolean;
  isLoadingMoreData?: boolean;
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
  selectedInterval = CandlePeriod.ONE_HOUR,
  tpslLines,
  onDurationChange,
  onGearPress,
  // Pan navigation props
  onPanNavigate,
  onLoadMoreData,
  isPanEnabled = true,
  isLoadingMoreData = false,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [showTPSLLines, setShowTPSLLines] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);

  // Data windowing state
  const [dataWindowStart, setDataWindowStart] = React.useState(0);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);

  // Get candlestick colors from centralized configuration
  // This allows for easy customization and potential user settings integration
  // useMemo prevents object recreation on every render
  const candlestickColors = React.useMemo(
    () => getCandlestickColors(theme.colors),
    [theme.colors],
  );

  // Full transformed data without windowing
  const fullTransformedData = React.useMemo(() => {
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

  // Fixed window size based on duration and interval selection
  const dataWindowSize = React.useMemo(() => {
    const calculatedSize = calculateCandleCount(
      selectedDuration,
      selectedInterval,
    );

    DevLogger.log('Data window size calculated:', {
      selectedDuration,
      selectedInterval,
      calculatedSize,
      availableData: fullTransformedData?.length || 0,
    });

    return calculatedSize;
  }, [selectedDuration, selectedInterval, fullTransformedData?.length]);

  // Calculate if we can navigate in each direction
  const canNavigateLeft = React.useMemo(
    () => dataWindowStart > 0,
    [dataWindowStart],
  );

  const canNavigateRight = React.useMemo(() => {
    // Can navigate right (to newer data) if we're not already showing the most recent data
    // Most recent data is when dataWindowStart is at its maximum possible value
    const maxDataWindowStart = Math.max(
      0,
      (fullTransformedData?.length || 0) - dataWindowSize,
    );
    return dataWindowStart < maxDataWindowStart;
  }, [dataWindowStart, dataWindowSize, fullTransformedData?.length]);

  // Windowed data for display (show subset of data)
  const transformedData = React.useMemo(() => {
    if (!fullTransformedData || fullTransformedData.length === 0) return [];

    const endIndex = Math.min(
      dataWindowStart + dataWindowSize,
      fullTransformedData.length,
    );
    const startIndex = Math.max(0, dataWindowStart);

    const windowedData = fullTransformedData.slice(startIndex, endIndex);

    // Debug logging to track data changes
    DevLogger.log('Chart data window changed:', {
      dataWindowStart,
      startIndex,
      endIndex,
      windowedDataLength: windowedData.length,
      firstTimestamp: windowedData[0]?.timestamp,
      lastTimestamp: windowedData[windowedData.length - 1]?.timestamp,
      firstDate: windowedData[0]
        ? new Date(windowedData[0].timestamp).toISOString()
        : 'N/A',
      lastDate: windowedData[windowedData.length - 1]
        ? new Date(
            windowedData[windowedData.length - 1].timestamp,
          ).toISOString()
        : 'N/A',
      fullDataFirstTimestamp: fullTransformedData[0]?.timestamp,
      fullDataLastTimestamp:
        fullTransformedData[fullTransformedData.length - 1]?.timestamp,
      fullDataFirstDate: fullTransformedData[0]
        ? new Date(fullTransformedData[0].timestamp).toISOString()
        : 'N/A',
      fullDataLastDate: fullTransformedData[fullTransformedData.length - 1]
        ? new Date(
            fullTransformedData[fullTransformedData.length - 1].timestamp,
          ).toISOString()
        : 'N/A',
    });

    return windowedData;
  }, [fullTransformedData, dataWindowStart, dataWindowSize]);

  // JavaScript callback wrappers for use in gesture handlers
  const setPanningJS = useCallback((panning: boolean) => {
    setIsPanning(panning);
  }, []);

  // JavaScript callback wrapper for logging
  const logJS = useCallback((message: string, ...args: unknown[]) => {
    DevLogger.log(message, ...args);
  }, []);

  const updateDataWindowStartJS = useCallback(
    (direction: 'left' | 'right') => {
      DevLogger.log('updateDataWindowStartJS called:', {
        direction,
        canNavigateLeft,
        canNavigateRight,
        currentDataWindowStart: dataWindowStart,
        fullTransformedDataLength: fullTransformedData?.length || 0,
        dataWindowSize,
      });

      const stepSize = 1; // Move by single candle/time period per swipe
      const loadMoreThreshold = 10; // Trigger loading when within 10 candles of boundary

      if (direction === 'left' && canNavigateLeft) {
        // Going back in time - show older data (decrease dataWindowStart toward 0)
        DevLogger.log('Navigating left (older data)');
        setDataWindowStart((prev) => {
          const newStart = Math.max(0, prev - stepSize);

          // Check if we're getting close to the beginning of available data (older data)
          if (
            newStart <= loadMoreThreshold &&
            onLoadMoreData &&
            !isLoadingMoreData
          ) {
            runOnJS(logJS)(
              'Near beginning of data, triggering load more (left/older)',
            );
            onLoadMoreData('left').catch((error) => {
              runOnJS(logJS)('Failed to load more data (left):', error);
            });
          }

          runOnJS(logJS)(
            'Left navigation - prev:',
            prev,
            'newStart:',
            newStart,
          );
          return newStart;
        });
      } else if (direction === 'right' && canNavigateRight) {
        // Going forward in time - show newer data (increase dataWindowStart toward max)
        runOnJS(logJS)('Navigating right (newer data)');
        setDataWindowStart((prev) => {
          const maxStart = Math.max(
            0,
            (fullTransformedData?.length || 0) - dataWindowSize,
          );
          const newStart = Math.min(maxStart, prev + stepSize);

          // Check if we're getting close to the beginning of available data (newer data)
          if (
            newStart <= loadMoreThreshold &&
            onLoadMoreData &&
            !isLoadingMoreData
          ) {
            runOnJS(logJS)(
              'Near beginning of data, triggering load more (right/newer)',
            );
            onLoadMoreData('right').catch((error) => {
              runOnJS(logJS)('Failed to load more data (right):', error);
            });
          }

          runOnJS(logJS)(
            'Right navigation - prev:',
            prev,
            'newStart:',
            newStart,
          );
          return newStart;
        });
      } else {
        runOnJS(logJS)('Navigation blocked:', {
          direction,
          canNavigateLeft,
          canNavigateRight,
        });

        // Even if navigation is blocked, check if we need to load more data
        if (
          direction === 'left' &&
          !canNavigateLeft &&
          onLoadMoreData &&
          !isLoadingMoreData
        ) {
          // We're at the very end of available data, try to load more
          runOnJS(logJS)(
            'At end of data, attempting to load more (left/older)',
          );
          onLoadMoreData('left').catch((error) => {
            runOnJS(logJS)(
              'Failed to load more data at boundary (left):',
              error,
            );
          });
        } else if (
          direction === 'right' &&
          !canNavigateRight &&
          onLoadMoreData &&
          !isLoadingMoreData
        ) {
          // We're at the very beginning of available data, try to load more
          runOnJS(logJS)(
            'At beginning of data, attempting to load more (right/newer)',
          );
          onLoadMoreData('right').catch((error) => {
            runOnJS(logJS)(
              'Failed to load more data at boundary (right):',
              error,
            );
          });
        }
      }
    },
    [
      canNavigateLeft,
      canNavigateRight,
      fullTransformedData?.length,
      dataWindowSize,
      dataWindowStart,
      onLoadMoreData,
      isLoadingMoreData,
      logJS,
    ],
  );

  const handlePanNavigateJS = useCallback(
    (direction: 'left' | 'right') => {
      onPanNavigate?.(direction);
    },
    [onPanNavigate],
  );

  // Pan gesture using new Gesture API
  const panGesture = React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(isPanEnabled && !isLoading && !isLoadingMoreData)
        .activeOffsetX([-20, 20]) // Only trigger on horizontal movement
        .failOffsetY([-20, 20]) // Don't interfere with vertical scrolling
        .onUpdate((event) => {
          if (!isPanEnabled || isPanning) return;
          runOnJS(logJS)('PANNING ACTIVE');

          const { translationX, velocityX } = event;

          // Detect horizontal swipe direction
          const minSwipeDistance = 50; // Minimum distance to trigger navigation
          const minVelocity = 500; // Minimum velocity for quick swipes

          if (
            Math.abs(translationX) > minSwipeDistance ||
            Math.abs(velocityX) > minVelocity
          ) {
            runOnJS(setPanningJS)(true);

            // Swipe right (translationX > 0) = go back in time (show older data)
            // Swipe left (translationX < 0) = go forward in time (show newer data)
            const direction = translationX > 0 ? 'left' : 'right';

            runOnJS(logJS)('Gesture detected:', {
              translationX,
              velocityX,
              direction,
              meaning:
                direction === 'right'
                  ? 'forward in time (newer)'
                  : 'back in time (older)',
            });

            runOnJS(updateDataWindowStartJS)(direction);

            // Call the optional navigation callback for additional logic (loading more data, etc.)
            runOnJS(handlePanNavigateJS)(direction);
          }
        })
        .onEnd(() => {
          runOnJS(setPanningJS)(false);
        }),
    [
      isPanEnabled,
      isLoading,
      isLoadingMoreData,
      isPanning,
      setPanningJS,
      logJS,
      updateDataWindowStartJS,
      handlePanNavigateJS,
    ],
  );

  // Initialize data window to show most recent data (only on first load or when settings change)
  const hasInitializedWindow = React.useRef(false);
  const lastDuration = React.useRef(selectedDuration);
  const lastInterval = React.useRef(selectedInterval);

  // Immediate reset when interval/duration changes (before new data loads)
  useEffect(() => {
    const settingsChanged =
      lastDuration.current !== selectedDuration ||
      lastInterval.current !== selectedInterval;

    if (settingsChanged) {
      // Immediately reset window position and panning state
      setDataWindowStart(0); // Reset to most recent position
      setIsPanning(false);
      hasInitializedWindow.current = false; // Allow re-initialization with new data

      DevLogger.log('Settings changed - immediate reset:', {
        previousDuration: lastDuration.current,
        newDuration: selectedDuration,
        previousInterval: lastInterval.current,
        newInterval: selectedInterval,
      });

      lastDuration.current = selectedDuration;
      lastInterval.current = selectedInterval;
    }
  }, [selectedDuration, selectedInterval]);

  // Initialize/adjust window when data is available
  useEffect(() => {
    if (fullTransformedData.length > 0 && !hasInitializedWindow.current) {
      // Start from the most recent data (end of array) - default view
      const initialStart = Math.max(
        0,
        fullTransformedData.length - dataWindowSize,
      );
      setDataWindowStart(initialStart);
      hasInitializedWindow.current = true;

      DevLogger.log('Data window initialized with new data:', {
        initialStart,
        dataLength: fullTransformedData.length,
        dataWindowSize,
        selectedDuration,
        selectedInterval,
      });
    }
  }, [
    fullTransformedData.length,
    dataWindowSize,
    selectedDuration,
    selectedInterval,
  ]);
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
    <CandlestickChart.Provider
      data={transformedData}
      key={`chart-${dataWindowStart}-${transformedData.length}`}
    >
      <GestureDetector gesture={panGesture}>
        <View>
          {/* Custom Horizontal Grid Lines with Price Labels */}
          <View style={styles.gridContainer}>
            {gridLines.map((line, index) => (
              <View key={`grid-${index}`}>
                {/* Grid Line */}
                <View
                  style={getGridLineStyle(
                    theme.colors,
                    line.isEdge,
                    line.position,
                  )}
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
                  <Text
                    variant={TextVariant.BodyXS}
                    color={TextColor.Alternative}
                  >
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
                key={`candlestick-${dataWindowStart}-${transformedData.length}`}
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

              {/* Loading indicators at chart edges */}
              {isLoadingMoreData && (
                <>
                  {/* Left edge loading (older data) */}
                  <View
                    style={[
                      styles.loadingIndicator,
                      styles.loadingIndicatorLeft,
                      {
                        top:
                          (height - PERPS_CHART_CONFIG.PADDING.VERTICAL) / 2 -
                          10,
                      },
                    ]}
                  >
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary.default}
                    />
                  </View>

                  {/* Right edge loading (newer data) */}
                  <View
                    style={[
                      styles.loadingIndicator,
                      styles.loadingIndicatorRight,
                      {
                        top:
                          (height - PERPS_CHART_CONFIG.PADDING.VERTICAL) / 2 -
                          10,
                      },
                    ]}
                  >
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary.default}
                    />
                  </View>
                </>
              )}
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
                        const hours = date
                          .getHours()
                          .toString()
                          .padStart(2, '0');
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
        </View>
      </GestureDetector>
    </CandlestickChart.Provider>
  );
};

export default CandlestickChartComponent;

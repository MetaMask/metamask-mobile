import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { View, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedGestureHandler,
  runOnJS,
} from 'react-native-reanimated';

import {
  PanGestureHandler,
  State,
  PanGestureHandlerEventPayload,
  HandlerStateChangeEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { CandlestickChart } from 'react-native-wagmi-charts';
import { Line, Rect } from 'react-native-svg';
import { styleSheet } from './PerpsCandlestickChart.styles';
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
import {
  PerpsCandlestickChartSelectorsIDs,
  PerpsChartAdditionalSelectorsIDs,
} from '../../../../../../e2e/selectors/Perps/Perps.selectors';
import PerpsTimeDurationSelector from '../PerpsTimeDurationSelector';
import PerpsCandlestickChartSkeleton from './PerpsCandlestickChartSkeleton';
import { strings } from '../../../../../../locales/i18n';
import type { CandleData } from '../../types';
import CandlestickChartAuxiliaryLines, {
  TPSLLines,
} from './CandlestickChartAuxiliaryLines';
import CandlestickChartGridLines from './CandlestickChartGridLines';
import CandlestickChartXAxis from './CandlestickChartXAxis';

interface CandlestickChartComponentProps {
  candleData: CandleData | null;
  isLoading?: boolean;
  height?: number;
  selectedDuration?: TimeDuration;
  tpslLines?: TPSLLines;
  candleCount?: number; // Current zoom level (number of candles to display)

  onDurationChange?: (duration: TimeDuration) => void;
  onGearPress?: () => void;
  onZoomChange?: (candleCount: number) => void; // Callback when zoom changes
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth; // Full screen width, no horizontal padding

const CandlestickChartComponent: React.FC<CandlestickChartComponentProps> = ({
  candleData,
  isLoading = false,
  height = PERPS_CHART_CONFIG.DEFAULT_HEIGHT,
  selectedDuration = TimeDuration.ONE_DAY,
  tpslLines,
  candleCount = 60, // Default zoom level: 60 candles (1hr/1min period)
  onDurationChange,
  onGearPress,
  onZoomChange,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [showTPSLLines, setShowTPSLLines] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // ✨ NEW: Display state for debug info (synced with reanimated values)
  const [displayScale, setDisplayScale] = useState(1);

  // Zoom constants (optimized for 1hr/1min period)
  const MIN_CANDLES = 10;
  const MAX_CANDLES = 60; // Max 2 hours worth of 1min candles
  const ZOOM_STEP = 1; // How many candles to add/remove per zoom action

  // Pinch-to-zoom state
  const [isGesturing, setIsGesturing] = useState(false);
  const [gestureScale, setGestureScale] = useState(1);
  const baseCandleCount = useRef(candleCount);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Pan gesture state for horizontal scrolling
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState(0); // Offset in number of candles
  const [visualPanX, setVisualPanX] = useState(0); // Visual transform during gesture
  const [baselineVisibleData, setBaselineVisibleData] = useState<CandleData[]>(
    [],
  ); // Y-axis baseline during pan
  const basePanOffset = useRef(0); // Base offset when gesture starts
  const maxPanOffset = useRef(0); // Maximum offset based on available historical data

  // ✨ NEW: Reanimated values for candle-level scaling (not container scaling)
  const candleScaleX = useSharedValue(1); // Horizontal candle scaling (width/spacing)
  const candleScaleY = useSharedValue(1); // Vertical candle scaling (height)
  const baseCandleScaleX = useSharedValue(1);
  const baseCandleScaleY = useSharedValue(1);
  const translateX = useSharedValue(0); // Keep translation for panning
  const translateY = useSharedValue(0);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const candleTranslateX = useSharedValue(0); // ✨ NEW: Individual candle translation (not chart container)

  // Gesture handler ref
  const panRef = useRef(null);

  // ✨ NEW: Custom candle rendering with reanimated scaling + horizontal spacing
  const renderCustomCandle = useCallback(
    ({
      x,
      y,
      width,
      height: rectHeight,
      fill,
      useAnimations: _useAnimations,
      candle,
    }: {
      x: any;
      y: any;
      width: any;
      height: any;
      fill: any;
      useAnimations: boolean;
      candle: any;
    }) => {
      'worklet';
      // Apply reanimated scaling to both width and horizontal position
      const scaledWidth = width * candleScaleX.value;
      const scaledHeight = rectHeight * candleScaleY.value;

      // Scale horizontal position to create spacing - candles move farther apart as they grow
      const chartCenter = (chartWidth - 65) / 2; // Get chart center (subtract Y-axis space)
      const originalCandleCenter = x + width / 2; // Get original candle center (not left edge)
      const distanceFromCenter = originalCandleCenter - chartCenter; // How far this candle center is from chart center
      const scaledDistanceFromCenter = distanceFromCenter * candleScaleX.value; // Scale the distance
      const scaledCandleCenter = chartCenter + scaledDistanceFromCenter; // New candle center position
      const scaledX =
        scaledCandleCenter - scaledWidth / 2 + candleTranslateX.value; // Convert center to left edge + apply candle translation

      const scaledY = y - (scaledHeight - rectHeight) / 2; // Keep vertically centered

      return (
        <Rect
          x={scaledX}
          y={scaledY}
          width={scaledWidth}
          height={scaledHeight}
          fill={fill}
        />
      );
    },
    [candleScaleX, candleScaleY, chartWidth, candleTranslateX],
  );

  const renderCustomWick = useCallback(
    ({
      x1,
      x2,
      y1,
      y2,
      stroke,
      strokeWidth,
      useAnimations: _useAnimations,
      candle,
    }: {
      x1: any;
      x2: any;
      y1: any;
      y2: any;
      stroke: any;
      strokeWidth: any;
      useAnimations: boolean;
      candle: any;
    }) => {
      'worklet';
      // Apply same horizontal scaling as candle bodies to keep wicks aligned
      const originalWickCenter = (x1 + x2) / 2; // Get original wick center point

      // Use IDENTICAL scaling logic as candle bodies for perfect alignment
      const chartCenter = (chartWidth - 65) / 2; // Get chart center (subtract Y-axis space)
      const distanceFromCenter = originalWickCenter - chartCenter; // How far wick center is from chart center
      const scaledDistanceFromCenter = distanceFromCenter * candleScaleX.value; // Scale the distance
      const scaledWickCenter =
        chartCenter + scaledDistanceFromCenter + candleTranslateX.value; // New wick center position + candle translation

      // Apply Y scaling to the wick length
      const wickLength = Math.abs(y2 - y1);
      const scaledWickLength = wickLength * candleScaleY.value;
      const wickCenter = (y1 + y2) / 2;

      const scaledY1 = wickCenter - scaledWickLength / 2;
      const scaledY2 = wickCenter + scaledWickLength / 2;

      return (
        <Line
          x1={scaledWickCenter}
          x2={scaledWickCenter}
          y1={scaledY1}
          y2={scaledY2}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      );
    },
    [candleScaleX, candleScaleY, chartWidth, candleTranslateX],
  );

  // ✨ NEW: Reanimated zoom functions (smooth candle scaling + coordinated translation)
  const handleZoomIn = useCallback(() => {
    const newScaleX = Math.min(5, candleScaleX.value * 1.2); // Zoom in = wider candles
    const newScaleY = Math.min(3, candleScaleY.value * 1.1); // Zoom in = taller candles (less aggressive)

    // ✨ COORDINATED TRANSLATION: Scale candles + move all candles left simultaneously
    const scaleIncrease = newScaleX / candleScaleX.value; // How much wider candles are getting
    const translationStep = 60 * (scaleIncrease - 1); // More noticeable translation (increased from 30 to 60)
    const newTranslateX = candleTranslateX.value - translationStep; // Move all candles left

    candleScaleX.value = withSpring(newScaleX, { damping: 12, stiffness: 100 });
    candleScaleY.value = withSpring(newScaleY, { damping: 12, stiffness: 100 });
    candleTranslateX.value = withSpring(newTranslateX, {
      damping: 12,
      stiffness: 100,
    }); // Smooth coordinated translation
    setDisplayScale(newScaleX); // Use X scale for debug display
  }, [candleScaleX, candleScaleY, candleTranslateX]);

  const handleZoomOut = useCallback(() => {
    const newScaleX = Math.max(0.3, candleScaleX.value / 1.2); // Zoom out = narrower candles
    const newScaleY = Math.max(0.5, candleScaleY.value / 1.1); // Zoom out = shorter candles

    // ✨ COORDINATED TRANSLATION: Scale candles + move all candles right to re-center
    const scaleDecrease = candleScaleX.value / newScaleX; // How much smaller candles are getting
    const translationStep = 60 * (scaleDecrease - 1); // More noticeable translation (increased from 30 to 60)
    const newTranslateX = candleTranslateX.value + translationStep; // Move all candles right

    candleScaleX.value = withSpring(newScaleX, { damping: 12, stiffness: 100 });
    candleScaleY.value = withSpring(newScaleY, { damping: 12, stiffness: 100 });
    candleTranslateX.value = withSpring(newTranslateX, {
      damping: 12,
      stiffness: 100,
    }); // Smooth coordinated translation
    setDisplayScale(newScaleX); // Use X scale for debug display
  }, [candleScaleX, candleScaleY, candleTranslateX]);

  const canZoomIn = true; // Always allow zoom in (scale up to 5x)
  const canZoomOut = true; // Always allow zoom out (scale down to 0.5x)

  // ✨ NEW: Reanimated pan functions (smooth translation transforms)
  const handlePanLeft = useCallback(() => {
    const panStep = 100; // Pixels to pan per button press
    const newTranslateX = translateX.value - panStep; // Pan left = negative translation

    translateX.value = withSpring(newTranslateX, {
      damping: 12,
      stiffness: 100,
    });
  }, [translateX]);

  const handlePanRight = useCallback(() => {
    const panStep = 100; // Pixels to pan per button press
    const newTranslateX = translateX.value + panStep; // Pan right = positive translation

    translateX.value = withSpring(newTranslateX, {
      damping: 12,
      stiffness: 100,
    });
  }, [translateX]);

  // ✨ NEW: Move all candles to the left function
  const moveAllCandlesLeft = useCallback(() => {
    const moveStep = 50; // Pixels to move candles left
    const newCandleTranslateX = candleTranslateX.value - moveStep; // Move individual candles left

    candleTranslateX.value = withSpring(newCandleTranslateX, {
      damping: 12,
      stiffness: 100,
    });
  }, [candleTranslateX]);

  const canPanLeft = true; // Always allow pan (constraints handled in transform)
  const canPanRight = true; // Always allow pan (constraints handled in transform)

  // Scale-to-candle-count mapping with 5-candle increments
  const scaleToCandles = useCallback(
    (scale: number, currentCandles: number) => {
      // Convert scale to zoom steps (5-candle increments)
      // Pinch in (scale < 1) = zoom OUT = more candles
      // Pinch out (scale > 1) = zoom IN = fewer candles

      // Calculate how many 5-candle steps to apply based on scale
      // Scale 0.8 = zoom out 1 step (5 candles more)
      // Scale 1.2 = zoom in 1 step (5 candles less)
      const scaleThreshold = 0.15; // Require 15% scale change for each step
      const steps = Math.round((1 - scale) / scaleThreshold);

      // Apply steps in 5-candle increments (+ steps = add candles, - steps = remove candles)
      const newCandles = currentCandles + steps * ZOOM_STEP;

      return Math.max(MIN_CANDLES, Math.min(MAX_CANDLES, newCandles));
    },
    [],
  );

  // Preview candle count during gesture
  const previewCandleCount = useMemo(() => {
    if (isGesturing) {
      return scaleToCandles(gestureScale, baseCandleCount.current);
    }
    return candleCount;
  }, [isGesturing, gestureScale, candleCount, scaleToCandles]);

  // ✨ NEW: Simple pan gesture handler (no complex scaling constraints)
  const panGestureHandler =
    useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
      onStart: () => {
        'worklet';
        baseTranslateX.value = translateX.value;
        baseTranslateY.value = translateY.value;
      },
      onActive: (event) => {
        'worklet';
        const gestureTranslationX = event.translationX ?? 0;
        const gestureTranslationY = event.translationY ?? 0;

        if (
          typeof gestureTranslationX === 'number' &&
          typeof gestureTranslationY === 'number'
        ) {
          const newTranslateX = baseTranslateX.value + gestureTranslationX;
          const newTranslateY = baseTranslateY.value + gestureTranslationY;

          // Simple constraints for smooth panning
          const maxPanRange = 1000; // Fixed panning range since scaling is at candle level
          const maxTranslateY = 200;

          translateX.value = Math.max(
            -maxPanRange,
            Math.min(maxPanRange, newTranslateX),
          );
          translateY.value = Math.max(
            -maxTranslateY,
            Math.min(maxTranslateY, newTranslateY),
          );
        }
      },
      onEnd: () => {
        'worklet';
        translateX.value = withSpring(translateX.value, {
          damping: 12,
          stiffness: 100,
        });
        translateY.value = withSpring(translateY.value, {
          damping: 12,
          stiffness: 100,
        });
      },
    });

  // Reset transform function (will be updated with proper initial position later)
  const resetTransform = useCallback(() => {
    candleScaleX.value = withSpring(1);
    candleScaleY.value = withSpring(1);
    translateX.value = withSpring(initialChartTransform);
    translateY.value = withSpring(0);
    candleTranslateX.value = withSpring(0); // ✨ Reset individual candle translation
    setDisplayScale(1);
  }, [candleScaleX, candleScaleY, translateX, translateY, candleTranslateX]);

  // Cleanup debounce timeout on unmount
  useEffect(
    () => () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    },
    [],
  );

  // Get candlestick colors from centralized configuration
  // This allows for easy customization and potential user settings integration
  // useMemo prevents object recreation on every render
  const candlestickColors = useMemo(
    () => getCandlestickColors(theme.colors),
    [theme.colors],
  );

  // Transform all data to wagmi-charts format with validation
  const allTransformedData = useMemo(() => {
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
      .filter((candle): candle is NonNullable<typeof candle> => candle !== null) // Remove invalid candles
      .sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically - critical for correct display
  }, [candleData]);

  // Update max pan offset based on available data
  useEffect(() => {
    if (allTransformedData.length > 0) {
      const currentCandleCount = previewCandleCount;
      const newMaxPanOffset = Math.max(
        0,
        allTransformedData.length - currentCandleCount,
      );
      maxPanOffset.current = newMaxPanOffset;

      // Reset pan offset if it exceeds new maximum
      setPanOffset((current) => Math.min(current, maxPanOffset.current));
    }
  }, [allTransformedData.length, previewCandleCount]);

  // Limit to 60 candles for 1hr/1min period - render most recent candles
  const chartTransformedData = useMemo(() => {
    // For 1hr/1min period, limit to exactly 60 candles (most recent)
    const maxCandles = 60;
    if (allTransformedData.length <= maxCandles) {
      return allTransformedData;
    }
    // Take the last 60 candles (most recent)
    return allTransformedData.slice(-maxCandles);
  }, [allTransformedData]);

  // ✨ NEW: Calculate chart width based on target candles to show, not entire dataset
  const fullChartWidth = useMemo(() => {
    if (chartTransformedData.length === 0) return chartWidth - 65;

    const availableWidth = chartWidth - 65; // Account for Y-axis space
    const totalCandles = chartTransformedData.length;
    const targetCandlesToShow = Math.min(candleCount, totalCandles);

    // Make chart width accommodate the target candles comfortably
    // Add 20% extra width for smooth panning without immediate edge hit
    const chartWidthForTarget = availableWidth * 1.2;

    return chartWidthForTarget;
  }, [chartTransformedData.length, candleCount, chartWidth]);

  // ✨ NEW: Simple initial positioning - chart is now right-sized!
  const initialChartTransform = useMemo(() => {
    if (chartTransformedData.length === 0) return 0;

    const availableWidth = chartWidth - 65; // Account for Y-axis space

    // Since fullChartWidth is now 1.2x availableWidth, center it slightly
    // This gives a small negative offset to center the content
    const centerOffset = -(fullChartWidth - availableWidth) / 2;

    return centerOffset;
  }, [fullChartWidth, chartWidth]);

  // ✨ NEW: Animated style for smooth translation only (scaling happens at candle level)
  const animatedChartStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Set initial position when chart data changes
  useEffect(() => {
    if (chartTransformedData.length > 0) {
      translateX.value = initialChartTransform;
      baseTranslateX.value = initialChartTransform; // Also update base for gestures
    }
  }, [
    chartTransformedData.length,
    initialChartTransform,
    translateX,
    baseTranslateX,
  ]);

  // Current visible data for Y-axis scaling (based on viewport window)
  const visibleTransformedData = useMemo(() => {
    if (chartTransformedData.length === 0) {
      return [];
    }

    const totalCandles = chartTransformedData.length;
    const visibleCandles = previewCandleCount;

    // Calculate the visible window based on panOffset
    const endIndex = totalCandles - panOffset;
    const startIndex = Math.max(0, endIndex - visibleCandles);

    const visibleData = chartTransformedData.slice(startIndex, endIndex);

    return visibleData;
  }, [chartTransformedData, previewCandleCount, panOffset]);

  // Y-axis scaling data - use visible data for proper scaling
  const yAxisScalingData = useMemo(() => {
    const shouldUseVisible = visibleTransformedData.length > 0;
    const scalingData = shouldUseVisible
      ? visibleTransformedData
      : chartTransformedData;

    // Debug: Uncomment for Y-axis scaling troubleshooting
    // console.log('📊 Y-Axis Scaling Debug:', {
    //   totalCandles: chartTransformedData.length,
    //   visibleCandles: visibleTransformedData.length,
    //   previewCandleCount,
    //   panOffset,
    //   usingVisibleData: shouldUseVisible,
    // });

    return scalingData;
  }, [visibleTransformedData, chartTransformedData]);

  // Clear baseline when panning stops
  useEffect(() => {
    if (!isPanning && baselineVisibleData.length > 0) {
      setBaselineVisibleData([]);
    }
  }, [isPanning, baselineVisibleData.length]);

  // Track when data has been initially loaded
  useEffect(() => {
    if (!isLoading && yAxisScalingData.length > 0 && !hasInitiallyLoaded) {
      setHasInitiallyLoaded(true);
    }
  }, [isLoading, yAxisScalingData.length, hasInitiallyLoaded]);

  // Show TP/SL lines after a short delay to ensure chart is rendered
  useEffect(() => {
    if (tpslLines && !isLoading && yAxisScalingData.length > 0) {
      const timeout = setTimeout(() => {
        setShowTPSLLines(true);
      }, 10);

      return () => clearTimeout(timeout);
    }
    setShowTPSLLines(false);
  }, [tpslLines, isLoading, yAxisScalingData.length]);

  // Custom candle rect renderer for proper zoom Y-axis scaling

  // Only show skeleton on initial load, not on interval changes.
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

  if (!candleData || chartTransformedData.length === 0) {
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
    <CandlestickChart.Provider data={chartTransformedData}>
      {/* Custom Horizontal Grid Lines with Price Labels - Use Y-axis scaling data to keep range fixed during pan */}
      <CandlestickChartGridLines
        transformedData={yAxisScalingData}
        height={height}
        testID={PerpsChartAdditionalSelectorsIDs.CHART_GRID}
      />
      {/* TP/SL Lines - Render first so they're behind everything */}
      <CandlestickChartAuxiliaryLines
        tpslLines={tpslLines}
        transformedData={yAxisScalingData}
        height={height}
        chartWidth={chartWidth}
        visible={showTPSLLines}
        testID={PerpsChartAdditionalSelectorsIDs.CANDLESTICK_AUXILIARY_LINES}
      />
      <View style={styles.chartContainer}>
        {/* ✨ NEW: Single Pan Gesture Handler for smooth panning */}
        <View style={styles.relativeContainer}>
          <PanGestureHandler
            ref={panRef}
            onGestureEvent={panGestureHandler}
            minPointers={1}
            maxPointers={2}
          >
            <Animated.View
              style={[
                {
                  width: fullChartWidth,
                },
                animatedChartStyle, // ✨ NEW: Smooth reanimated transforms (includes initial positioning)!
              ]}
            >
              {/* Main Candlestick Chart - Extended width for historical buffer */}
              <CandlestickChart
                key={`no-anim-${previewCandleCount}`} // Stable key since live candle always included
                height={height - PERPS_CHART_CONFIG.PADDING.VERTICAL} // Account for labels and padding
                width={fullChartWidth}
                style={styles.chartWithPadding}
              >
                {/* Candlestick Data with Custom Reanimated Scaling */}
                <CandlestickChart.Candles
                  positiveColor={candlestickColors.positive} // Green for positive candles
                  negativeColor={candlestickColors.negative} // Red for negative candles
                  renderRect={renderCustomCandle} // ✨ Custom candle body scaling
                  renderLine={renderCustomWick} // ✨ Custom wick scaling
                  testID={PerpsCandlestickChartSelectorsIDs.CANDLES}
                />
                {/* Tooltip for price display */}
                <View testID={PerpsCandlestickChartSelectorsIDs.TOOLTIP} />
              </CandlestickChart>
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* X-Axis Time Labels - Uses same reanimated transform as chart */}
        <View style={{ overflow: 'hidden', width: chartWidth - 65 }}>
          {/* Clip X-axis to chart bounds */}
          <Animated.View
            style={[
              {
                width: fullChartWidth, // Full width for proper label distribution
                marginLeft: 50, // Align with chart
              },
              animatedChartStyle, // ✨ NEW: Sync with chart transforms!
            ]}
          >
            <CandlestickChartXAxis
              transformedData={yAxisScalingData}
              chartWidth={fullChartWidth} // Use full width to match chart
              labelCount={4} // Explicit label count for better visibility
              testID={PerpsChartAdditionalSelectorsIDs.CANDLESTICK_X_AXIS}
            />
          </Animated.View>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <Pressable
            style={[
              styles.zoomButton,
              !canZoomOut && styles.zoomButtonDisabled,
            ]}
            onPress={handleZoomOut}
            disabled={!canZoomOut}
          >
            <Text
              variant={TextVariant.BodySM}
              color={canZoomOut ? TextColor.Default : TextColor.Muted}
            >
              -
            </Text>
          </Pressable>

          <Text
            variant={TextVariant.BodyXS}
            color={TextColor.Primary}
            style={styles.candleCountText}
          >
            ✨ Smooth Zoom: {(displayScale * 100).toFixed(0)}%
          </Text>

          <Pressable
            style={[styles.zoomButton, !canZoomIn && styles.zoomButtonDisabled]}
            onPress={handleZoomIn}
            disabled={!canZoomIn}
          >
            <Text
              variant={TextVariant.BodySM}
              color={canZoomIn ? TextColor.Default : TextColor.Muted}
            >
              +
            </Text>
          </Pressable>
        </View>

        {/* Pan Controls */}
        <View style={styles.zoomControls}>
          <Pressable
            style={[
              styles.zoomButton,
              !canPanLeft && styles.zoomButtonDisabled,
            ]}
            onPress={handlePanLeft}
            disabled={!canPanLeft}
          >
            <Text
              variant={TextVariant.BodySM}
              color={canPanLeft ? TextColor.Default : TextColor.Muted}
            >
              ←
            </Text>
          </Pressable>

          <Text
            variant={TextVariant.BodyXS}
            color={panOffset > 0 ? TextColor.Warning : TextColor.Muted}
            style={styles.candleCountText}
          >
            {panOffset > 0 ? `${panOffset} candles back` : 'Live data'}
          </Text>

          <Pressable
            style={[
              styles.zoomButton,
              !canPanRight && styles.zoomButtonDisabled,
            ]}
            onPress={handlePanRight}
            disabled={!canPanRight}
          >
            <Text
              variant={TextVariant.BodySM}
              color={canPanRight ? TextColor.Default : TextColor.Muted}
            >
              →
            </Text>
          </Pressable>
        </View>

        {/* Pan Reset Button - Show when panned away from live data */}
        {panOffset > 0 && (
          <View style={styles.panResetContainer}>
            <Pressable
              style={styles.panResetButton}
              onPress={() => {
                setPanOffset(0);
                setVisualPanX(0);
                setBaselineVisibleData([]); // Clear Y-axis baseline
                setGestureScale(1); // Reset any lingering gesture scale
              }}
            >
              <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
                ↻ Return to Live
              </Text>
            </Pressable>
          </View>
        )}

        {/* ✨ NEW: Move Candles Left Button */}
        <View style={styles.panResetContainer}>
          <Pressable style={styles.panResetButton} onPress={moveAllCandlesLeft}>
            <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
              ⬅️ Move All Candles Left
            </Text>
          </Pressable>
          <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
            Testing leftward movement with smooth animation
          </Text>
        </View>

        {/* ✨ NEW: Reset Zoom Button */}
        <View style={styles.panResetContainer}>
          <Pressable style={styles.panResetButton} onPress={resetTransform}>
            <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
              ⚡ Reset Zoom & Pan
            </Text>
          </Pressable>
          <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
            Reanimated smooth transforms - no data manipulation!
          </Text>
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

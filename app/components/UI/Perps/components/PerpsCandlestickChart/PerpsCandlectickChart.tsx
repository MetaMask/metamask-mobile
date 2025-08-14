import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { View, Dimensions, Pressable } from 'react-native';

import {
  PinchGestureHandler,
  PanGestureHandler,
  State,
  PinchGestureHandlerEventPayload,
  PanGestureHandlerEventPayload,
  HandlerStateChangeEvent,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import { CandlestickChart } from 'react-native-wagmi-charts';
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
  candleCount = 45, // Default zoom level: 45 candles
  onDurationChange,
  onGearPress,
  onZoomChange,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [showTPSLLines, setShowTPSLLines] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Zoom constants
  const MIN_CANDLES = 10;
  const MAX_CANDLES = 250;
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
  const [baselineVisibleData, setBaselineVisibleData] = useState<
    CandlestickData[]
  >([]); // Y-axis baseline during pan
  const basePanOffset = useRef(0); // Base offset when gesture starts
  const maxPanOffset = useRef(0); // Maximum offset based on available historical data

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    const newCandleCount = Math.max(MIN_CANDLES, candleCount - ZOOM_STEP);

    setPanOffset(0); // Reset pan when zooming
    setVisualPanX(0); // Reset visual transform
    setBaselineVisibleData([]); // Clear Y-axis baseline
    setGestureScale(1); // Reset any lingering gesture scale
    onZoomChange?.(newCandleCount);
  }, [candleCount, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newCandleCount = Math.min(MAX_CANDLES, candleCount + ZOOM_STEP);
    setPanOffset(0); // Reset pan when zooming
    setVisualPanX(0); // Reset visual transform
    setBaselineVisibleData([]); // Clear Y-axis baseline
    setGestureScale(1); // Reset any lingering gesture scale
    onZoomChange?.(newCandleCount);
  }, [candleCount, onZoomChange]);

  const canZoomIn = candleCount > MIN_CANDLES;
  const canZoomOut = candleCount < MAX_CANDLES;

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

  // Pinch gesture handlers
  const handlePinchGesture = useCallback(
    (event: PinchGestureHandlerGestureEvent) => {
      const { scale } = event.nativeEvent;
      setGestureScale(scale);
    },
    [],
  );

  const handlePinchStateChange = useCallback(
    (event: HandlerStateChangeEvent<PinchGestureHandlerEventPayload>) => {
      const { state, scale } = event.nativeEvent;

      switch (state) {
        case State.BEGAN:
          setIsGesturing(true);
          baseCandleCount.current = candleCount;
          // Clear any existing debounce to handle rapid pinch gestures
          if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
            setGestureScale(1); // Reset any stale gesture scale from previous interaction
          }
          break;

        case State.END:
        case State.CANCELLED: {
          // Debounce the zoom change to prevent excessive API calls
          const newCandleCount = scaleToCandles(scale, baseCandleCount.current);
          if (newCandleCount !== candleCount) {
            // Keep gestureScale applied until data actually changes to prevent visual snap-back
            setPanOffset(0); // Reset pan when pinch-zooming
            setVisualPanX(0); // Reset visual transform
            setBaselineVisibleData([]); // Clear Y-axis baseline
            // DON'T set isGesturing to false yet - keep applying gestureScale until data updates

            debounceTimeout.current = setTimeout(() => {
              setIsGesturing(false); // Reset gesturing state when data actually changes
              setGestureScale(1); // Reset gestureScale when data actually changes
              onZoomChange?.(newCandleCount);
            }, 500); // 500ms debounce - reduces jank during "rage zooming"
          } else {
            // No zoom change needed, reset immediately
            setIsGesturing(false);
            setGestureScale(1);
          }
          break;
        }
      }
    },
    [candleCount, scaleToCandles, onZoomChange],
  );

  // Pan gesture handlers - CSS transform approach
  const handlePanGesture = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { translationX } = event.nativeEvent;

      // Apply immediate visual transform for smooth gesture feedback on X-axis pan
      // Don't update actual data during gesture - just visual movement
      setVisualPanX(translationX);

      // Debug: Show gesture movement
      if (Math.abs(translationX) % 50 < 2) {
        // Log every ~50px to reduce noise
      }
    },
    [], // Include previewCandleCount for debug logging
  );

  const handlePanStateChange = useCallback(
    (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
      const { state, translationX } = event.nativeEvent;

      switch (state) {
        case State.BEGAN:
          setIsPanning(true); // This will trigger buffer creation in extendedTransformedData
          basePanOffset.current = panOffset;
          setVisualPanX(0); // Reset visual transform at start
          break;

        case State.END:
        case State.CANCELLED:
          setIsPanning(false); // This will remove buffer and return chart to normal width

          // Convert final gesture distance to candle offset
          const pixelsPerStep = 40; // Require significant gesture for step
          const candlesPerStep = 3; // Move in 3-candle increments
          const steps = Math.round(translationX / pixelsPerStep);
          const gestureDelta = steps * candlesPerStep;

          const finalOffset = Math.max(
            0,
            Math.min(
              maxPanOffset.current,
              basePanOffset.current + gestureDelta,
            ),
          );

          // Update actual chart data and reset visual transform
          setPanOffset(finalOffset);
          setVisualPanX(0); // Reset visual transform - chart shows new data at normal position

          // Note: baselineVisibleData will be cleared by the useEffect when isPanning becomes false
          break;
      }
    },
    [panOffset],
  );

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

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

  // Prepare chart data - extend only when panning to avoid empty space
  const extendedTransformedData = useMemo(() => {
    if (allTransformedData.length === 0) {
      return [];
    }

    const currentCandleCount = previewCandleCount;
    const totalCandles = allTransformedData.length;

    // Only add buffer when panning to prevent empty space when not panning
    const shouldExtend = isPanning || panOffset > 0;
    const bufferCandles = shouldExtend
      ? Math.min(Math.floor(currentCandleCount * 0.5), 10)
      : 0;
    const extendedCandleCount = currentCandleCount + bufferCandles;

    // Calculate data window
    const endIndex = totalCandles - panOffset;
    const startIndex = Math.max(0, endIndex - extendedCandleCount);

    const extendedData = allTransformedData.slice(startIndex, endIndex);

    return extendedData;
  }, [allTransformedData, panOffset, previewCandleCount, isPanning]);

  // Calculate chart width - account for live candle space + buffer when panning
  const extendedChartWidth = useMemo(() => {
    if (extendedTransformedData.length === 0) return chartWidth - 65;

    const currentCandleCount = previewCandleCount;
    const actualExtendedCandleCount = extendedTransformedData.length;
    const normalChartWidth = chartWidth - 65;

    // Always account for live candle space + Y-axis clearance
    const candlesWithLiveSpace = currentCandleCount + 2; // Extra 1 full candle width for Y-axis clearance

    // No buffer case - normal width plus space for live candle + Y-axis
    if (actualExtendedCandleCount <= currentCandleCount) {
      const liveSpaceWidth =
        normalChartWidth * (candlesWithLiveSpace / currentCandleCount);
      return liveSpaceWidth;
    }

    // Extended width with buffer data (already includes live candle space)
    const widthMultiplier = actualExtendedCandleCount / currentCandleCount;
    const calculatedWidth = normalChartWidth * widthMultiplier;

    return calculatedWidth;
  }, [previewCandleCount, extendedTransformedData.length]);

  // Calculate base positioning - account for live candle space and buffer
  const baseChartTransform = useMemo(() => {
    if (extendedTransformedData.length === 0) return 0;

    const currentCandleCount = previewCandleCount;
    const actualExtendedCandleCount = extendedTransformedData.length;
    const actualBufferCandles = Math.max(
      0,
      actualExtendedCandleCount - currentCandleCount,
    );

    // No buffer case - position to account for live candle space + Y-axis clearance
    if (actualBufferCandles === 0) {
      // Larger offset to ensure live candle fully clears the Y-axis
      const liveCandleSpaceOffset = -(extendedChartWidth * 0.167); // 16.7% offset (1/6) for generous Y-axis clearance
      return liveCandleSpaceOffset;
    }

    // With buffer = offset to show current candles in viewport, live candle space included
    const bufferRatio = actualBufferCandles / actualExtendedCandleCount;
    const bufferWidth = extendedChartWidth * bufferRatio;
    const baseOffset = -bufferWidth;

    return baseOffset;
  }, [previewCandleCount, extendedTransformedData.length, extendedChartWidth]);

  // Current visible data for Y-axis scaling (rightmost portion of extended data)
  const visibleTransformedData = useMemo(() => {
    if (extendedTransformedData.length === 0) {
      return [];
    }

    const currentCandleCount = previewCandleCount;
    // Take rightmost candles (most recent) for proper Y-axis scaling
    const visibleData = extendedTransformedData.slice(-currentCandleCount);

    return visibleData;
  }, [extendedTransformedData, previewCandleCount]);

  // Y-axis scaling data - use baseline during panning to keep Y-axis fixed
  const yAxisScalingData = useMemo(() => {
    if (isPanning && baselineVisibleData.length > 0) {
      return baselineVisibleData;
    }

    return visibleTransformedData;
  }, [isPanning, baselineVisibleData, visibleTransformedData]);

  // Capture baseline when panning starts
  useEffect(() => {
    if (
      isPanning &&
      visibleTransformedData.length > 0 &&
      baselineVisibleData.length === 0
    ) {
      setBaselineVisibleData([...visibleTransformedData]); // Create copy
    }

    // Clear baseline when panning stops
    if (!isPanning && baselineVisibleData.length > 0) {
      setBaselineVisibleData([]);
    }
  }, [isPanning, visibleTransformedData, baselineVisibleData.length]);

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

  if (!candleData || extendedTransformedData.length === 0) {
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
    <CandlestickChart.Provider data={extendedTransformedData}>
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
        {/* Chart with Custom Grid Lines */}
        <PinchGestureHandler
          onGestureEvent={handlePinchGesture}
          onHandlerStateChange={handlePinchStateChange}
        >
          <View style={styles.relativeContainer}>
            {/* Extended Chart Container for Historical Buffer */}
            <View
              style={[
                {
                  width: extendedChartWidth,
                  transform: [
                    {
                      translateX:
                        baseChartTransform + (isPanning ? visualPanX : 0),
                    },
                  ],
                },
                (isGesturing || isPanning) && styles.chartGesturing,
              ]}
            >
              {/* Main Candlestick Chart - Extended width for historical buffer */}
              <CandlestickChart
                key={`no-anim-${extendedTransformedData.length}-${panOffset}`} // Force re-render to skip animations when debounced
                height={height - PERPS_CHART_CONFIG.PADDING.VERTICAL} // Account for labels and padding
                width={extendedChartWidth}
                style={styles.chartWithPadding}
              >
                {/* Candlestick Data */}
                <CandlestickChart.Candles
                  positiveColor={candlestickColors.positive} // Green for positive candles
                  negativeColor={candlestickColors.negative} // Red for negative candles
                  testID={PerpsCandlestickChartSelectorsIDs.CANDLES}
                />
                {/* Tooltip for price display */}
                <View testID={PerpsCandlestickChartSelectorsIDs.TOOLTIP} />
              </CandlestickChart>
            </View>
          </View>
        </PinchGestureHandler>

        {/* X-Axis Time Labels with Pan Gesture - Swipe left/right on time axis to navigate */}
        <View style={{ overflow: 'hidden', width: chartWidth - 65 }}>
          {' '}
          {/* Clip X-axis to chart bounds */}
          <PanGestureHandler
            onGestureEvent={handlePanGesture}
            onHandlerStateChange={handlePanStateChange}
            activeOffsetX={[-10, 10]} // More sensitive since it's only on X-axis
            shouldCancelWhenOutside={false}
          >
            <View
              style={{
                width: extendedChartWidth, // Full extended width for proper label distribution
                transform: [
                  {
                    translateX:
                      baseChartTransform + (isPanning ? visualPanX : 0),
                  },
                ],
                marginLeft: 50, // Remove left offset to align with chart (matches paddingRight in X-axis styles)
              }}
            >
              <CandlestickChartXAxis
                transformedData={yAxisScalingData}
                chartWidth={extendedChartWidth} // Use extended width to match chart
                testID={PerpsChartAdditionalSelectorsIDs.CANDLESTICK_X_AXIS}
              />
            </View>
          </PanGestureHandler>
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
            color={
              isGesturing
                ? TextColor.Primary
                : isPanning
                ? TextColor.Warning
                : TextColor.Muted
            }
            style={[
              styles.candleCountText,
              (isGesturing || isPanning) && styles.candleCountPreview,
            ]}
          >
            {previewCandleCount} candles
            {isGesturing && ' (preview)'}
            {isPanning && ` (visual panning...)`}
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

        {/* DEBUG: Manual pan test buttons */}
        <View style={styles.panResetContainer}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={styles.panResetButton}
              onPress={() => {
                const newOffset = Math.max(0, panOffset - 5);
                setPanOffset(newOffset);
              }}
            >
              <Text variant={TextVariant.BodyXS} color={TextColor.Primary}>
                ← Back to Live (newer)
              </Text>
            </Pressable>
            <Pressable
              style={styles.panResetButton}
              onPress={() => {
                const newOffset = Math.min(maxPanOffset.current, panOffset + 5);
                setPanOffset(newOffset);
              }}
            >
              <Text variant={TextVariant.BodyXS} color={TextColor.Primary}>
                Historical →
              </Text>
            </Pressable>
          </View>
          <Text variant={TextVariant.BodyXS} color={TextColor.Muted}>
            panOffset: {panOffset} / {maxPanOffset.current}
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

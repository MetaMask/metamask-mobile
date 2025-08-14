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
  Directions,
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
  const ZOOM_STEP = 15; // How many candles to add/remove per zoom action

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    const newCandleCount = Math.max(MIN_CANDLES, candleCount - ZOOM_STEP);
    setPanOffset(0); // Reset pan when zooming
    onZoomChange?.(newCandleCount);
  }, [candleCount, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newCandleCount = Math.min(MAX_CANDLES, candleCount + ZOOM_STEP);
    setPanOffset(0); // Reset pan when zooming
    onZoomChange?.(newCandleCount);
  }, [candleCount, onZoomChange]);

  const canZoomIn = candleCount > MIN_CANDLES;
  const canZoomOut = candleCount < MAX_CANDLES;

  // Pinch-to-zoom state
  const [isGesturing, setIsGesturing] = useState(false);
  const [gestureScale, setGestureScale] = useState(1);
  const baseCandleCount = useRef(candleCount);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Pan gesture state for horizontal scrolling
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState(0); // Offset in number of candles
  const [cumulativePanX, setCumulativePanX] = useState(0);
  const basePanOffset = useRef(0); // Base offset when gesture starts
  const maxPanOffset = useRef(0); // Maximum offset based on available historical data

  // Scale-to-candle-count mapping
  const scaleToCandles = useCallback(
    (scale: number, currentCandles: number) => {
      // Invert scale: pinch in (scale < 1) = zoom in = fewer candles
      // pinch out (scale > 1) = zoom out = more candles
      const factor = 1 / scale;
      const newCandles = Math.round(currentCandles * factor);
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
          // Clear any existing debounce
          if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
          }
          break;

        case State.END:
        case State.CANCELLED:
          setIsGesturing(false);
          setGestureScale(1);

          // Debounce the zoom change to prevent excessive API calls
          const newCandleCount = scaleToCandles(scale, baseCandleCount.current);
          if (newCandleCount !== candleCount) {
            setPanOffset(0); // Reset pan when pinch-zooming
            debounceTimeout.current = setTimeout(() => {
              onZoomChange?.(newCandleCount);
            }, 150); // 150ms debounce
          }
          break;
      }
    },
    [candleCount, scaleToCandles, onZoomChange],
  );

  // Pan gesture handlers for horizontal scrolling
  const handlePanGesture = useCallback(
    (event: PanGestureHandlerGestureEvent) => {
      const { translationX } = event.nativeEvent;

      // Convert horizontal pixel movement to candle offset
      // CORRECTED DIRECTION: positive translationX (pan right) = want historical data (positive offset)
      const pixelsPerCandle = 15; // Make more sensitive
      const gestureDelta = Math.round(translationX / pixelsPerCandle); // REMOVED negative sign

      // Calculate new offset from base + gesture delta
      const newOffset = Math.max(
        0,
        Math.min(maxPanOffset.current, basePanOffset.current + gestureDelta),
      );

      // FORCE DEBUG: Always log pan attempts
      console.log('🔥 PAN GESTURE ACTIVE:', {
        translationX, // positive = pan right = want historical data
        pixelsPerCandle,
        gestureDelta, // should be POSITIVE when translationX is positive
        basePanOffset: basePanOffset.current,
        currentPanOffset: panOffset,
        newOffset, // should INCREASE when panning right
        maxPanOffset: maxPanOffset.current,
        'should change': newOffset !== panOffset,
        direction: translationX > 0 ? 'RIGHT→historical' : 'LEFT→newer',
      });

      // Try immediate state update to see if this is the issue
      if (newOffset !== panOffset) {
        console.log('🚀 CALLING setPanOffset from', panOffset, 'to', newOffset);
        setPanOffset(newOffset);
      }
    },
    [panOffset], // Add panOffset as dependency to see current value
  );

  const handlePanStateChange = useCallback(
    (event: HandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
      const { state, translationX } = event.nativeEvent;

      console.log('🎯 PAN STATE CHANGE:', {
        state,
        translationX,
        currentPanOffset: panOffset,
      });

      switch (state) {
        case State.BEGAN:
          console.log('📍 PAN BEGAN - setting base to:', panOffset);
          setIsPanning(true);
          basePanOffset.current = panOffset;
          setCumulativePanX(0);
          break;

        case State.END:
        case State.CANCELLED:
          console.log('🏁 PAN ENDED/CANCELLED');
          setIsPanning(false);

          // Calculate final offset
          const pixelsPerCandle = 15;
          const gestureDelta = Math.round(translationX / pixelsPerCandle); // REMOVED negative sign
          const finalOffset = Math.max(
            0,
            Math.min(
              maxPanOffset.current,
              basePanOffset.current + gestureDelta,
            ),
          );

          console.log('🔚 FINAL PAN OFFSET:', {
            gestureDelta,
            basePanOffset: basePanOffset.current,
            finalOffset,
            'will change': finalOffset !== panOffset,
          });

          setPanOffset(finalOffset);
          setCumulativePanX(0);
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

      // Debug: Log max pan offset calculation
      console.log('Max pan offset updated:', {
        totalData: allTransformedData.length,
        displayCandles: currentCandleCount,
        maxPanOffset: newMaxPanOffset,
      });

      // Reset pan offset if it exceeds new maximum
      setPanOffset((current) => Math.min(current, maxPanOffset.current));
    }
  }, [allTransformedData.length, previewCandleCount]);

  // Apply panning window to show subset of data
  const transformedData = useMemo(() => {
    if (allTransformedData.length === 0) {
      return [];
    }

    const currentCandleCount = previewCandleCount;
    const totalCandles = allTransformedData.length;

    // Calculate window bounds
    // Pan offset of 0 = most recent data
    // Higher pan offset = older data
    const endIndex = totalCandles - panOffset;
    const startIndex = Math.max(0, endIndex - currentCandleCount);

    const windowedData = allTransformedData.slice(startIndex, endIndex);

    // Debug: Log panning state
    const latestCandle = allTransformedData[totalCandles - 1];
    const now = Date.now();
    const isLiveCandle =
      latestCandle && latestCandle.timestamp > now - 60 * 60 * 1000;

    console.log('Chart panning data:', {
      totalCandles,
      displayCandles: windowedData.length,
      panOffset,
      maxPanOffset: maxPanOffset.current,
      startIndex,
      endIndex,
      isLiveCandle: isLiveCandle && panOffset === 0, // Only live if showing most recent
      allDataRange:
        allTransformedData.length > 0
          ? {
              first: new Date(allTransformedData[0].timestamp).toLocaleString(),
              last: new Date(
                allTransformedData[allTransformedData.length - 1].timestamp,
              ).toLocaleString(),
            }
          : null,
      windowedDataRange:
        windowedData.length > 0
          ? {
              first: new Date(windowedData[0].timestamp).toLocaleString(),
              last: new Date(
                windowedData[windowedData.length - 1].timestamp,
              ).toLocaleString(),
            }
          : null,
    });

    return windowedData;
  }, [allTransformedData, panOffset, previewCandleCount]);

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
      <CandlestickChartGridLines
        transformedData={transformedData}
        height={height}
        testID={PerpsChartAdditionalSelectorsIDs.CHART_GRID}
      />
      {/* TP/SL Lines - Render first so they're behind everything */}
      <CandlestickChartAuxiliaryLines
        tpslLines={tpslLines}
        transformedData={transformedData}
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
          <PanGestureHandler
            onGestureEvent={handlePanGesture}
            onHandlerStateChange={handlePanStateChange}
            activeOffsetX={[-5, 5]}
            shouldCancelWhenOutside={false}
          >
            <View
              style={[
                styles.relativeContainer,
                (isGesturing || isPanning) && styles.chartGesturing,
              ]}
            >
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
                  testID={PerpsCandlestickChartSelectorsIDs.CANDLES}
                />
                {/* Tooltip for price display */}
                <View testID={PerpsCandlestickChartSelectorsIDs.TOOLTIP} />
              </CandlestickChart>
            </View>
          </PanGestureHandler>
        </PinchGestureHandler>

        {/* X-Axis Time Labels */}
        <CandlestickChartXAxis
          transformedData={transformedData}
          chartWidth={chartWidth}
          testID={PerpsChartAdditionalSelectorsIDs.CANDLESTICK_X_AXIS}
        />

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
            {isPanning && ` (panning)`}
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
              onPress={() => setPanOffset(0)}
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
                console.log(
                  '🧪 MANUAL PAN TO NEWER/LIVE:',
                  panOffset,
                  '->',
                  newOffset,
                );
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
                console.log(
                  '🧪 MANUAL PAN TO HISTORICAL:',
                  panOffset,
                  '->',
                  newOffset,
                );
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

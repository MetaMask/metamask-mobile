import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Dimensions, Pressable } from 'react-native';
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
    onZoomChange?.(newCandleCount);
  }, [candleCount, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const newCandleCount = Math.min(MAX_CANDLES, candleCount + ZOOM_STEP);
    onZoomChange?.(newCandleCount);
  }, [candleCount, onZoomChange]);

  const canZoomIn = candleCount > MIN_CANDLES;
  const canZoomOut = candleCount < MAX_CANDLES;

  // Get candlestick colors from centralized configuration
  // This allows for easy customization and potential user settings integration
  // useMemo prevents object recreation on every render
  const candlestickColors = useMemo(
    () => getCandlestickColors(theme.colors),
    [theme.colors],
  );

  // Transform data to wagmi-charts format with validation
  const transformedData = useMemo(() => {
    if (!candleData?.candles || candleData.candles.length === 0) {
      return [];
    }

    // Debug: Log candle data including any live candles
    const latestCandle = candleData.candles[candleData.candles.length - 1];
    const now = Date.now();
    const isLiveCandle =
      latestCandle && latestCandle.time > now - 60 * 60 * 1000; // Within last hour

    console.log('Chart candle data:', {
      totalCandles: candleData.candles.length,
      latestCandle,
      isLiveCandle,
      latestCandleTime: latestCandle
        ? new Date(latestCandle.time).toLocaleString()
        : null,
    });

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
              testID={PerpsCandlestickChartSelectorsIDs.CANDLES}
            />
            {/* Tooltip for price display */}
            <View testID={PerpsCandlestickChartSelectorsIDs.TOOLTIP} />
          </CandlestickChart>
        </View>

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
            color={TextColor.Muted}
            style={styles.candleCountText}
          >
            {candleCount} candles
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

import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PanGestureHandler,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import {
  CandlestickChart,
  CandlestickChartCandles,
  CandlestickChartProvider,
} from 'react-native-wagmi-charts';
import { Text } from '@metamask/design-system-react-native';

interface TransformedDataItem {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  [key: string]: unknown;
}

interface ReanimatedCandlestickChartProps {
  allTransformedData: TransformedDataItem[];
  width: number;
  height: number;
  theme?: 'dark' | 'light';
  testID?: string;
}

const ReanimatedCandlestickChart: React.FC<ReanimatedCandlestickChartProps> = ({
  allTransformedData,
  width,
  height,
  //   theme = 'dark',
  testID,
}) => {
  // Reanimated shared values for transforms
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Base values for gesture calculations
  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);

  // Refs for gesture handlers
  const pinchRef = useRef(null);
  const panRef = useRef(null);

  // Chart configuration
  const chartWidth = useMemo(() => width - 60, [width]); // Account for Y-axis
  const chartHeight = useMemo(() => height - 40, [height]); // Account for X-axis

  // Pinch gesture handler for zooming
  const pinchGestureHandler =
    useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
      onStart: () => {
        'worklet';
        baseScale.value = scale.value;
      },
      onActive: (event) => {
        'worklet';
        // Apply pinch scale with limits
        const gestureScale = event.scale ?? 1;
        if (typeof gestureScale === 'number' && gestureScale > 0) {
          const newScale = baseScale.value * gestureScale;
          scale.value = Math.max(0.5, Math.min(5, newScale)); // Min 0.5x, Max 5x zoom
        }
      },
      onEnd: () => {
        'worklet';
        // Optional: Add spring animation on release
        scale.value = withSpring(scale.value, {
          damping: 12,
          stiffness: 100,
        });
      },
    });

  // Pan gesture handler for panning
  const panGestureHandler =
    useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
      onStart: () => {
        'worklet';
        baseTranslateX.value = translateX.value;
        baseTranslateY.value = translateY.value;
      },
      onActive: (event) => {
        'worklet';
        // Apply pan translation with constraints
        const maxTranslateX = (scale.value - 1) * chartWidth * 0.5;
        const maxTranslateY = (scale.value - 1) * chartHeight * 0.5;

        const gestureTranslationX = event.translationX ?? 0;
        const gestureTranslationY = event.translationY ?? 0;

        if (
          typeof gestureTranslationX === 'number' &&
          typeof gestureTranslationY === 'number'
        ) {
          const newTranslateX = baseTranslateX.value + gestureTranslationX;
          const newTranslateY = baseTranslateY.value + gestureTranslationY;

          // Constrain panning to prevent going too far off-screen
          translateX.value = Math.max(
            -maxTranslateX,
            Math.min(maxTranslateX, newTranslateX),
          );

          translateY.value = Math.max(
            -maxTranslateY,
            Math.min(maxTranslateY, newTranslateY),
          );
        }
      },
      onEnd: () => {
        'worklet';
        // Optional: Add spring animation on release
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

  // Animated style for the chart container
  const animatedChartStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  // Reset zoom function
  const resetZoom = useCallback(() => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }, [scale, translateX, translateY]);

  // Double tap to reset (could be added later)
  const handleDoubleTap = useCallback(() => {
    resetZoom();
  }, [resetZoom]);

  const styles = StyleSheet.create({
    container: {
      overflow: 'hidden',
    },
    chartContainer: {
      flex: 1,
    },
    debugInfo: {
      position: 'absolute',
      top: 10,
      right: 10,
      padding: 8,
      borderRadius: 4,
      zIndex: 1000,
    },
    resetButton: {
      position: 'absolute',
      top: 10,
      left: 10,
      padding: 8,
      borderRadius: 4,
      zIndex: 1000,
    },
    animatedChart: {
      flex: 1,
    },
  });

  if (!allTransformedData || allTransformedData.length === 0) {
    return (
      <View style={[styles.container, { width, height }]} testID={testID}>
        <View
          style={StyleSheet.flatten([
            styles.chartContainer,
            { justifyContent: 'center', alignItems: 'center' },
          ])}
        >
          <Text>No chart data available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height }]} testID={testID}>
      {/* Debug Info */}
      <View style={styles.debugInfo}>
        <Text>🚀 Reanimated Zoom: {allTransformedData.length} candles</Text>
      </View>

      {/* Reset Button */}
      <View style={styles.resetButton}>
        <Text onPress={handleDoubleTap}>Reset Zoom</Text>
      </View>

      {/* Chart with Gesture Handlers */}
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={panGestureHandler}
        minPointers={1}
        maxPointers={1}
        avgTouches
      >
        <Animated.View style={styles.chartContainer}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={pinchGestureHandler}
          >
            <Animated.View style={styles.chartContainer}>
              <Animated.View style={[animatedChartStyle, styles.animatedChart]}>
                <CandlestickChartProvider data={allTransformedData}>
                  <CandlestickChart height={chartHeight} width={chartWidth}>
                    <CandlestickChartCandles />
                  </CandlestickChart>
                </CandlestickChartProvider>
              </Animated.View>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

export default ReanimatedCandlestickChart;

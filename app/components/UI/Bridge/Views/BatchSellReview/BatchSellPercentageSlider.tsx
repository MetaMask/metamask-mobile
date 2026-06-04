import React, { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './BatchSellPercentageSlider.styles';

const HANDLE_SIZE = 32;
const PERCENTAGE_STEPS = [0, 25, 50, 75, 100] as const;
export const MARKER_POINTS = [25, 50, 75, 100];
const MIN_PERCENTAGE = 0;
const MAX_PERCENTAGE = 100;

export function clampToPercentage(value: number): number {
  return Math.max(MIN_PERCENTAGE, Math.min(MAX_PERCENTAGE, Math.round(value)));
}

interface BatchSellPercentageSliderProps {
  value: number;
  /** Called on every 1% change during drag for live display updates. */
  onValueChange: (value: number) => void;
  /** Called when the user lifts their finger or taps the track. */
  onDragEnd?: (value: number) => void;
  testID?: string;
}

export function BatchSellPercentageSlider({
  value,
  onValueChange,
  onDragEnd,
  testID,
}: BatchSellPercentageSliderProps) {
  const { styles } = useStyles(styleSheet, {});
  const clampedValue = clampToPercentage(value);
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const widthRef = useRef(0);

  const updatePosition = useCallback(
    (nextValue: number, width = widthRef.current) => {
      const nextClampedValue = clampToPercentage(nextValue);
      translateX.value = (nextClampedValue / MAX_PERCENTAGE) * width;
    },
    [translateX],
  );

  const updateValueFromPosition = useCallback(
    (position: number, width: number) => {
      if (width === 0) {
        return;
      }

      const clampedPosition = Math.max(0, Math.min(position, width));
      const nextValue = clampToPercentage(
        (clampedPosition / width) * MAX_PERCENTAGE,
      );

      updatePosition(nextValue, width);

      if (nextValue !== value) {
        onValueChange(nextValue);
      }
    },
    [onValueChange, updatePosition, value],
  );

  const commitFromPosition = useCallback(
    (position: number, width: number) => {
      if (width === 0 || !onDragEnd) {
        return;
      }

      const clampedPosition = Math.max(0, Math.min(position, width));
      const nextValue = clampToPercentage(
        (clampedPosition / width) * MAX_PERCENTAGE,
      );

      onDragEnd(nextValue);
    },
    [onDragEnd],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      widthRef.current = width;
      sliderWidth.value = width;
      updatePosition(clampedValue, width);
    },
    [sliderWidth, clampedValue, updatePosition],
  );

  useEffect(() => {
    updatePosition(clampedValue);
  }, [clampedValue, updatePosition]);

  const progressStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  const handleStyle = useAnimatedStyle(() => {
    const handleOffset = Math.max(
      0,
      Math.min(
        translateX.value - HANDLE_SIZE / 2,
        sliderWidth.value - HANDLE_SIZE,
      ),
    );

    return {
      transform: [{ translateX: handleOffset }],
    };
  });

  const gesture = Gesture.Simultaneous(
    Gesture.Tap().onEnd((event) => {
      scheduleOnRN(updateValueFromPosition, event.x, sliderWidth.value);
      scheduleOnRN(commitFromPosition, event.x, sliderWidth.value);
    }),
    Gesture.Pan()
      .onUpdate((event) => {
        scheduleOnRN(updateValueFromPosition, event.x, sliderWidth.value);
      })
      .onEnd((event) => {
        scheduleOnRN(commitFromPosition, event.x, sliderWidth.value);
      }),
  );

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const nextValue =
        event.nativeEvent.actionName === 'increment'
          ? clampToPercentage(clampedValue + 1)
          : clampToPercentage(clampedValue - 1);

      if (nextValue !== clampedValue) {
        onValueChange(nextValue);
        onDragEnd?.(nextValue);
      }
    },
    [onDragEnd, onValueChange, clampedValue],
  );

  return (
    <GestureHandlerRootView
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: MIN_PERCENTAGE,
        max: MAX_PERCENTAGE,
        now: clampedValue,
        text: `${clampedValue}%`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
      style={styles.container}
    >
      <View style={styles.trackContainer}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            onLayout={handleLayout}
            style={styles.gestureArea}
            testID={testID ? `${testID}-gesture-area` : undefined}
          >
            <Animated.View style={styles.track} />
            <Animated.View style={[styles.progress, progressStyle]} />
            <Animated.View style={[styles.thumb, handleStyle]} />
          </Animated.View>
        </GestureDetector>

        {PERCENTAGE_STEPS.map((percent) => (
          <View
            key={`dot-${percent}`}
            pointerEvents="none"
            testID={
              testID && MARKER_POINTS.includes(percent)
                ? `${testID}-marker-point-${percent}`
                : undefined
            }
            style={[styles.dot, styles[`dot${percent}` as keyof typeof styles]]}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
}

import React, { useCallback, useEffect, useRef } from 'react';
import { AccessibilityActionEvent, LayoutChangeEvent } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const HANDLE_SIZE = 24;
const MARKER_SIZE = 4;
const PERCENTAGE_STEP = 25;
export const SNAP_POINTS = [0, 25, 50, 75, 100];

export function snapToPercentageStep(value: number): number {
  const snappedValue = Math.round(value / PERCENTAGE_STEP) * PERCENTAGE_STEP;
  return Math.max(0, Math.min(100, snappedValue));
}

interface BatchSellPercentageSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  testID?: string;
}

export function BatchSellPercentageSlider({
  value,
  onValueChange,
  testID,
}: BatchSellPercentageSliderProps) {
  const tw = useTailwind();
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const widthRef = useRef(0);

  const updatePosition = useCallback(
    (nextValue: number, width = widthRef.current) => {
      const snappedValue = snapToPercentageStep(nextValue);
      translateX.value = (snappedValue / 100) * width;
    },
    [translateX],
  );

  const updateValueFromPosition = useCallback(
    (position: number, width: number) => {
      if (width === 0) {
        return;
      }

      const clampedPosition = Math.max(0, Math.min(position, width));
      const nextValue = snapToPercentageStep((clampedPosition / width) * 100);

      updatePosition(nextValue, width);
      onValueChange(nextValue);
    },
    [onValueChange, updatePosition],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      widthRef.current = width;
      sliderWidth.value = width;
      updatePosition(value, width);
    },
    [sliderWidth, updatePosition, value],
  );

  useEffect(() => {
    updatePosition(value);
  }, [updatePosition, value]);

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
      runOnJS(updateValueFromPosition)(event.x, sliderWidth.value);
    }),
    Gesture.Pan().onUpdate((event) => {
      runOnJS(updateValueFromPosition)(event.x, sliderWidth.value);
    }),
  );

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const nextValue =
        event.nativeEvent.actionName === 'increment'
          ? snapToPercentageStep(value + PERCENTAGE_STEP)
          : snapToPercentageStep(value - PERCENTAGE_STEP);

      onValueChange(nextValue);
    },
    [onValueChange, value],
  );

  return (
    <GestureHandlerRootView
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
      style={tw.style('h-6 w-full')}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          onLayout={handleLayout}
          style={tw.style('h-6 w-full justify-center')}
        >
          <Animated.View
            style={tw.style(
              'absolute left-0 right-0 h-1 rounded-full bg-icon-muted',
            )}
          />
          <Animated.View
            style={[
              tw.style('absolute left-0 h-1 rounded-full bg-icon-default'),
              progressStyle,
            ]}
          />
          {SNAP_POINTS.map((snapPoint) => (
            <Animated.View
              key={snapPoint}
              pointerEvents="none"
              testID={testID ? `${testID}-snap-point-${snapPoint}` : undefined}
              style={[
                tw.style('absolute h-1 w-1 rounded-full bg-icon-muted'),
                {
                  left: `${snapPoint}%`,
                  transform: [{ translateX: -MARKER_SIZE / 2 }],
                },
              ]}
            />
          ))}
          <Animated.View
            style={[
              tw.style('absolute h-6 w-6 rounded-full bg-icon-default'),
              handleStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

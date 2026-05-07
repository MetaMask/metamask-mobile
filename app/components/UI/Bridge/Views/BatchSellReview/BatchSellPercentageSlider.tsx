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
const ACCESSIBILITY_STEP = 1;

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
      const clampedValue = Math.max(0, Math.min(100, nextValue));
      translateX.value = (clampedValue / 100) * width;
    },
    [translateX],
  );

  const updateValueFromPosition = useCallback(
    (position: number, width: number) => {
      if (width === 0) {
        return;
      }

      const clampedPosition = Math.max(0, Math.min(position, width));
      const nextValue = Math.round((clampedPosition / width) * 100);

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
          ? Math.min(value + ACCESSIBILITY_STEP, 100)
          : Math.max(value - ACCESSIBILITY_STEP, 0);

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

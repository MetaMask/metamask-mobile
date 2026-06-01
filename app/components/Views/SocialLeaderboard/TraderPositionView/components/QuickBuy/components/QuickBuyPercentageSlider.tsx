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
import { playImpact, ImpactMoment } from '../../../../../../../util/haptics';

const HANDLE_SIZE = 24;
const MARKER_SIZE = 4;
const ACCESSIBILITY_STEP = 1;
export const SNAP_POINTS = [0, 25, 50, 75, 100];
const HAPTIC_THRESHOLDS = [25, 50, 75];

interface QuickBuyPercentageSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  testID?: string;
}

export function QuickBuyPercentageSlider({
  value,
  onValueChange,
  disabled = false,
  testID = 'quick-buy-percentage-slider',
}: QuickBuyPercentageSliderProps) {
  const tw = useTailwind();
  const sliderWidth = useSharedValue(0);
  const translateX = useSharedValue(0);
  const widthRef = useRef(0);
  const previousValueRef = useRef(value);

  const updatePosition = useCallback(
    (nextValue: number, width = widthRef.current) => {
      const clampedValue = Math.max(0, Math.min(100, Math.round(nextValue)));
      translateX.value = (clampedValue / 100) * width;
    },
    [translateX],
  );

  const checkThresholdCrossing = useCallback((nextValue: number) => {
    const prevValue = previousValueRef.current;
    for (const threshold of HAPTIC_THRESHOLDS) {
      if (
        (prevValue < threshold && nextValue >= threshold) ||
        (prevValue > threshold && nextValue <= threshold)
      ) {
        playImpact(ImpactMoment.SliderTick);
        break;
      }
    }
    previousValueRef.current = nextValue;
  }, []);

  const updateValueFromPosition = useCallback(
    (position: number, width: number) => {
      if (width === 0 || disabled) return;
      const clampedPosition = Math.max(0, Math.min(position, width));
      const nextValue = Math.max(
        0,
        Math.min(100, Math.round((clampedPosition / width) * 100)),
      );
      updatePosition(nextValue, width);
      checkThresholdCrossing(nextValue);
      if (nextValue !== value) {
        onValueChange(nextValue);
      }
    },
    [disabled, onValueChange, updatePosition, checkThresholdCrossing, value],
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
    return { transform: [{ translateX: handleOffset }] };
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
          ? Math.min(100, value + ACCESSIBILITY_STEP)
          : Math.max(0, value - ACCESSIBILITY_STEP);
      if (nextValue !== value) {
        checkThresholdCrossing(nextValue);
        onValueChange(nextValue);
      }
    },
    [onValueChange, checkThresholdCrossing, value],
  );

  return (
    <GestureHandlerRootView
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityState={{ disabled }}
      accessibilityValue={{ min: 0, max: 100, now: value, text: `${value}%` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
      style={tw.style('h-6 w-full', disabled && 'opacity-40')}
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

import React, { useCallback, useEffect, useRef } from 'react';
import {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { playImpact, ImpactMoment } from '../../../../../../../util/haptics';

const HANDLE_SIZE = 24;
const MARKER_SIZE = 4;
const ACCESSIBILITY_STEP = 1;
// Decorative reference markers rendered on the track. The slider itself does
// not snap to these positions, they exist purely as visual anchors so users
// can eyeball quarter-balance amounts. Only the interior quarter marks are
// drawn — 0 and 100 would sit under the handle and the track ends.
const VISUAL_MARKERS = [25, 50, 75];
const HAPTIC_THRESHOLDS = [25, 50, 75];

interface QuickBuyPercentageSliderProps {
  value: number;
  /** Called on every 1% change during drag, for display state only. */
  onValueChange: (value: number) => void;
  /**
   * Called once when the user lifts their finger (pan end) or taps the track.
   * Use this to trigger expensive side-effects (quote re-fetches, analytics).
   * When omitted, the slider falls back to `onValueChange` so commit semantics
   * still work for consumers that only need a single callback.
   */
  onDragEnd?: (value: number) => void;
  disabled?: boolean;
  testID?: string;
}

export function QuickBuyPercentageSlider({
  value,
  onValueChange,
  onDragEnd,
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

  // Fired when the user grabs the handle (pan start) and again when they let
  // go (pan end) — a tactile "pick up / drop" pair distinct from the per-tick
  // SliderTick crossings.
  const handleGrip = useCallback(() => {
    if (disabled) return;
    playImpact(ImpactMoment.SliderGrip);
  }, [disabled]);

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

  /**
   * Commit the final value when the user lifts their finger (pan end or tap).
   * Only calls onDragEnd — no onValueChange fallback needed here because:
   * - For Pan: onValueChange was already called on the last onUpdate tick.
   * - For Tap: updateValueFromPosition already called onValueChange.
   * Consumers that omit onDragEnd rely solely on onValueChange (already fired).
   */
  const commitFromPosition = useCallback(
    (position: number, width: number) => {
      if (width === 0 || disabled || !onDragEnd) return;
      const clampedPosition = Math.max(0, Math.min(position, width));
      const nextValue = Math.max(
        0,
        Math.min(100, Math.round((clampedPosition / width) * 100)),
      );
      onDragEnd(nextValue);
    },
    [disabled, onDragEnd],
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
    // Keep haptic ref in sync so an external value reset (e.g. token switch)
    // doesn't make the next drag look like a threshold crossing from the
    // previous position.
    previousValueRef.current = value;
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
      scheduleOnRN(updateValueFromPosition, event.x, sliderWidth.value);
    }),
    Gesture.Pan()
      .onStart(() => {
        // Pick up — fire the grip haptic the moment the drag is recognized.
        scheduleOnRN(handleGrip);
      })
      .onUpdate((event) => {
        scheduleOnRN(updateValueFromPosition, event.x, sliderWidth.value);
      })
      .onEnd((event) => {
        // Commit the final position when the user lifts their finger.
        scheduleOnRN(commitFromPosition, event.x, sliderWidth.value);
        // Drop — fire the grip haptic again on release.
        scheduleOnRN(handleGrip);
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
        onDragEnd?.(nextValue);
      }
    },
    [onValueChange, onDragEnd, checkThresholdCrossing, value],
  );

  return (
    <View
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
              'absolute left-0 right-0 h-1 rounded-full bg-background-muted',
            )}
          />
          <Animated.View
            style={[
              tw.style('absolute left-0 h-1 rounded-full bg-icon-default'),
              progressStyle,
            ]}
          />
          {VISUAL_MARKERS.map((marker) => (
            <Animated.View
              key={marker}
              pointerEvents="none"
              style={[
                tw.style('absolute h-1 w-1 rounded-full bg-background-pressed'),
                {
                  left: `${marker}%`,
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
    </View>
  );
}

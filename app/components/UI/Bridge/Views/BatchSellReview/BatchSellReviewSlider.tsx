import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityActionEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

/**
 * Thumb diameter. Matches the design-system slider so this row stays visually
 * the same, except the thumb stays fully on the track at 0% and 100%.
 */
export const THUMB_SIZE = 32;

/** Track row height. The thumb is centered on the 8px track and overflows it. */
const TRACK_ROW_HEIGHT = 19;

const THUMB_TOP = -13;

const HAPTIC_MARKS = [25, 50, 75];

const MARKS = [0, 25, 50, 75, 100];

const styles = StyleSheet.create({
  trackRow: {
    height: TRACK_ROW_HEIGHT,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    top: THUMB_TOP,
    elevation: 4,
  },
});

interface BatchSellReviewSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onDragEnd?: (value: number) => void;
  onGrip?: () => void;
  onMark?: () => void;
  testID?: string;
}

/**
 * Pixel offset of the thumb's left edge so the thumb stays inside the track.
 * At 0% the left edge is the track start. At 100% the right edge is the track end.
 *
 * @param percent - Slider value from 0 to 100.
 * @param width - Laid-out track width in pixels.
 */
export function percentToThumbLeft(percent: number, width: number): number {
  'worklet';
  const travel = Math.max(width - THUMB_SIZE, 0);
  const clamped = Math.max(0, Math.min(100, percent));
  return (clamped / 100) * travel;
}

/**
 * Maps a touch x, treated as the desired thumb center, to a 0–100 value.
 *
 * @param x - Touch x relative to the track.
 * @param width - Laid-out track width in pixels.
 */
export function touchXToPercent(x: number, width: number): number {
  'worklet';
  const travel = width - THUMB_SIZE;
  if (travel <= 0) {
    return 0;
  }
  const minCenter = THUMB_SIZE / 2;
  const maxCenter = width - THUMB_SIZE / 2;
  const center = Math.max(minCenter, Math.min(maxCenter, x));
  return Math.round(((center - minCenter) / travel) * 100);
}

/**
 * Marks whose thresholds a drag crossed. 0 and 100 are silent, matching the
 * design-system slider.
 *
 * @param previous - Value before this update.
 * @param next - Value after this update.
 */
export function getCrossedHapticMarks(
  previous: number,
  next: number,
): number[] {
  return HAPTIC_MARKS.filter(
    (mark) =>
      (previous < mark && next >= mark) || (previous > mark && next <= mark),
  );
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Batch-sell percent slider. The design-system slider centers the thumb on the
 * track ends, which leaves half the thumb past the bar. This one shortens the
 * travel by the thumb diameter so the thumb stays on the track.
 */
export function BatchSellReviewSlider({
  value,
  onValueChange,
  onDragEnd,
  onGrip,
  onMark,
  testID,
}: BatchSellReviewSliderProps) {
  const tw = useTailwind();
  const [trackWidth, setTrackWidth] = useState(0);
  const widthSV = useSharedValue(0);
  const thumbLeftSV = useSharedValue(0);
  const thumbScaleSV = useSharedValue(1);
  const isDraggingRef = useRef(false);
  const didStartDragRef = useRef(false);
  const valueRef = useRef(value);
  const lastPercentRef = useRef(value);
  const onValueChangeRef = useRef(onValueChange);
  const onDragEndRef = useRef(onDragEnd);
  const onGripRef = useRef(onGrip);
  const onMarkRef = useRef(onMark);

  valueRef.current = value;
  onValueChangeRef.current = onValueChange;
  onDragEndRef.current = onDragEnd;
  onGripRef.current = onGrip;
  onMarkRef.current = onMark;

  const publishValue = useCallback((next: number) => {
    const crossed = getCrossedHapticMarks(lastPercentRef.current, next);
    if (next !== lastPercentRef.current) {
      lastPercentRef.current = next;
      onValueChangeRef.current(next);
    }
    crossed.forEach(() => {
      onMarkRef.current?.();
    });
  }, []);

  const beginDrag = useCallback(() => {
    isDraggingRef.current = true;
    didStartDragRef.current = true;
    onGripRef.current?.();
  }, []);

  const endDrag = useCallback(
    (next: number) => {
      publishValue(next);
      onDragEndRef.current?.(next);
    },
    [publishValue],
  );

  const releaseDrag = useCallback(() => {
    isDraggingRef.current = false;
    if (!didStartDragRef.current) {
      return;
    }
    didStartDragRef.current = false;
    onGripRef.current?.();
  }, []);

  useEffect(() => {
    if (isDraggingRef.current) {
      return;
    }
    lastPercentRef.current = value;
    thumbLeftSV.value = percentToThumbLeft(value, widthSV.value);
  }, [thumbLeftSV, value, widthSV]);

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width;
      setTrackWidth(nextWidth);
      widthSV.value = nextWidth;
      if (!isDraggingRef.current) {
        thumbLeftSV.value = percentToThumbLeft(valueRef.current, nextWidth);
      }
    },
    [thumbLeftSV, widthSV],
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbLeftSV.value + THUMB_SIZE / 2,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbLeftSV.value },
      { scale: thumbScaleSV.value },
    ],
  }));

  const gesture = useMemo(() => {
    const applyTouch = (x: number) => {
      'worklet';
      const next = touchXToPercent(x, widthSV.value);
      thumbLeftSV.value = percentToThumbLeft(next, widthSV.value);
      return next;
    };

    const panGesture = Gesture.Pan()
      .activeOffsetX([-4, 4])
      .failOffsetY([-12, 12])
      .onStart(() => {
        'worklet';
        thumbScaleSV.value = withTiming(1.12, { duration: 100 });
        scheduleOnRN(beginDrag);
      })
      .onUpdate((event) => {
        'worklet';
        const next = applyTouch(event.x);
        scheduleOnRN(publishValue, next);
      })
      .onEnd((event) => {
        'worklet';
        const next = applyTouch(event.x);
        scheduleOnRN(endDrag, next);
      })
      .onFinalize(() => {
        'worklet';
        thumbScaleSV.value = withTiming(1, { duration: 100 });
        scheduleOnRN(releaseDrag);
      });

    const tapGesture = Gesture.Tap()
      .maxDistance(12)
      .onEnd((event) => {
        'worklet';
        const next = applyTouch(event.x);
        scheduleOnRN(endDrag, next);
      });

    return Gesture.Exclusive(panGesture, tapGesture);
  }, [
    beginDrag,
    endDrag,
    publishValue,
    releaseDrag,
    thumbLeftSV,
    thumbScaleSV,
    widthSV,
  ]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const delta = event.nativeEvent.actionName === 'increment' ? 1 : -1;
      const next = clampPercent(valueRef.current + delta);
      if (next === valueRef.current) {
        return;
      }
      publishValue(next);
      onDragEndRef.current?.(next);
    },
    [publishValue],
  );

  return (
    <View
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: value,
        text: `${Math.round(value)}%`,
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={handleAccessibilityAction}
      onLayout={handleLayout}
      style={tw.style('relative self-stretch py-2')}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.trackRow}>
          <View
            style={tw.style(
              'absolute left-0 top-0 h-2 w-full rounded-full bg-border-muted',
            )}
          />
          <Animated.View
            style={[
              tw.style(
                'absolute left-0 top-0 h-2 rounded-full bg-icon-alternative',
              ),
              fillStyle,
            ]}
          />
          {trackWidth > 0 &&
            MARKS.map((mark) => (
              <View
                key={mark}
                pointerEvents="none"
                style={[
                  tw.style(
                    'absolute top-0.5 h-1 w-1 rounded-full bg-text-muted',
                  ),
                  {
                    left:
                      percentToThumbLeft(mark, trackWidth) + THUMB_SIZE / 2 - 2,
                  },
                ]}
              />
            ))}
          <Animated.View
            style={[
              tw.style('absolute rounded-full bg-icon-default'),
              styles.thumb,
              thumbStyle,
            ]}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../../../../../util/theme';
import { playImpact, ImpactMoment } from '../../../../../../util/haptics';

/**
 * Geometry constants mirrored from `@metamask/design-system-react-native`'s
 * `Slider.constants.mjs` (THUMB_SIZE = 32, THUMB_TOP_OFFSET = -13). The design
 * system `Slider` does not expose a dual-thumb variant, so this component
 * reuses the same geometry so the thumbs/track line up with the rest of the
 * app's sliders. Keep in sync if that package's Slider geometry changes.
 */
const THUMB_SIZE = 32;
const THUMB_HIT_SIZE = 44; // Larger than visual thumb for touch accessibility.
const TRACK_HEIGHT = 8;
const TRACK_VERTICAL_PADDING = 8;
const THUMB_TOP_OFFSET = -13;
const THUMB_BOTTOM_OFFSET = THUMB_TOP_OFFSET + THUMB_SIZE;
/** Natural (unscaled) height of the track+thumb area, no range labels. */
const SLIDER_TRACK_AREA_HEIGHT =
  TRACK_VERTICAL_PADDING * 2 + THUMB_BOTTOM_OFFSET;

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  trackArea: {
    position: 'relative',
    height: SLIDER_TRACK_AREA_HEIGHT,
    paddingVertical: TRACK_VERTICAL_PADDING,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top:
      TRACK_VERTICAL_PADDING +
      THUMB_TOP_OFFSET +
      THUMB_SIZE / 2 -
      TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  fill: {
    position: 'absolute',
    top:
      TRACK_VERTICAL_PADDING +
      THUMB_TOP_OFFSET +
      THUMB_SIZE / 2 -
      TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumbAnchor: {
    position: 'absolute',
    top: TRACK_VERTICAL_PADDING + THUMB_TOP_OFFSET,
    left: 0,
    width: 0,
    height: THUMB_SIZE,
  },
  thumbHitArea: {
    position: 'absolute',
    top: -((THUMB_HIT_SIZE - THUMB_SIZE) / 2),
    left: -(THUMB_HIT_SIZE / 2),
    width: THUMB_HIT_SIZE,
    height: THUMB_HIT_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbVisual: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
  },
});

export interface RangeSliderProps {
  /** Lower bound of the range (inclusive). */
  minimumValue: number;
  /** Upper bound of the range (inclusive). */
  maximumValue: number;
  /** Current selection. `min` and `max` are clamped to the bounds. */
  value: { min: number; max: number };
  /** Called on every change during a drag. */
  onValueChange: (value: { min: number; max: number }) => void;
  /** Called once when a drag ends. Use for expensive side effects. */
  onDragEnd?: (value: { min: number; max: number }) => void;
  /** Step increment. Defaults to 1. */
  step?: number;
  /** Optional accessibility label for the lower thumb. */
  minThumbAccessibilityLabel?: string;
  /** Optional accessibility label for the upper thumb. */
  maxThumbAccessibilityLabel?: string;
  testID?: string;
}

interface ResolvedValue {
  min: number;
  max: number;
}

/** UI-thread clamp — gesture handlers run as worklets and cannot call plain JS. */
function clampWorklet(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** UI-thread percent → domain value conversion for gesture handlers. */
function percentToValueWorklet(
  percent: number,
  minimumValue: number,
  maximumValue: number,
  span: number,
  step: number,
) {
  'worklet';
  const raw = minimumValue + (percent / 100) * span;
  const stepped = Math.round(raw / step) * step;
  return clampWorklet(stepped, minimumValue, maximumValue);
}

/**
 * Dual-thumb range slider. The design system `Slider` only exposes a single
 * thumb, so this component composes the same geometry constants into a
 * two-thumb control. Thumbs cannot cross; the active thumb always wins ties.
 *
 * The track and thumb colors come from the MMDS theme via `useTheme()` so the
 * control stays in sync with the rest of the app's dark/light surfaces.
 */
const RangeSlider: React.FC<RangeSliderProps> = ({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  onDragEnd,
  step = 1,
  minThumbAccessibilityLabel,
  maxThumbAccessibilityLabel,
  testID,
}) => {
  const { colors } = useTheme();

  const span = maximumValue - minimumValue;
  const minPercent = useSharedValue(
    span > 0 ? ((value.min - minimumValue) / span) * 100 : 0,
  );
  const maxPercent = useSharedValue(
    span > 0 ? ((value.max - minimumValue) / span) * 100 : 100,
  );
  const trackWidth = useSharedValue(0);
  const dragStartPercent = useSharedValue(0);

  // Keep the animated percents in sync when the `value` prop changes externally
  // (e.g. reset to defaults). Reanimated reactions run on the UI thread.
  useAnimatedReaction(
    () => value.min,
    (next) => {
      if (span > 0) {
        minPercent.value = ((next - minimumValue) / span) * 100;
      }
    },
    [value.min, span, minimumValue],
  );
  useAnimatedReaction(
    () => value.max,
    (next) => {
      if (span > 0) {
        maxPercent.value = ((next - minimumValue) / span) * 100;
      }
    },
    [value.max, span, minimumValue],
  );

  const reportChange = useCallback(
    (next: ResolvedValue) => {
      onValueChange(next);
    },
    [onValueChange],
  );

  const reportDragEnd = useCallback(
    (next: ResolvedValue) => {
      onDragEnd?.(next);
    },
    [onDragEnd],
  );

  const buildThumbGesture = useCallback(
    (which: 'min' | 'max') =>
      Gesture.Pan()
        .onBegin(() => {
          dragStartPercent.value =
            which === 'min' ? minPercent.value : maxPercent.value;
          runOnJS(playImpact)(ImpactMoment.SliderGrip);
        })
        .onUpdate((event) => {
          if (trackWidth.value === 0) {
            return;
          }
          const deltaPercent = (event.translationX / trackWidth.value) * 100;
          const percent = clampWorklet(
            dragStartPercent.value + deltaPercent,
            0,
            100,
          );
          if (which === 'min') {
            const clamped = Math.min(percent, maxPercent.value);
            minPercent.value = clamped;
            runOnJS(reportChange)({
              min: percentToValueWorklet(
                clamped,
                minimumValue,
                maximumValue,
                span,
                step,
              ),
              max: percentToValueWorklet(
                maxPercent.value,
                minimumValue,
                maximumValue,
                span,
                step,
              ),
            });
          } else {
            const clamped = Math.max(percent, minPercent.value);
            maxPercent.value = clamped;
            runOnJS(reportChange)({
              min: percentToValueWorklet(
                minPercent.value,
                minimumValue,
                maximumValue,
                span,
                step,
              ),
              max: percentToValueWorklet(
                clamped,
                minimumValue,
                maximumValue,
                span,
                step,
              ),
            });
          }
        })
        .onEnd(() => {
          runOnJS(reportDragEnd)({
            min: percentToValueWorklet(
              minPercent.value,
              minimumValue,
              maximumValue,
              span,
              step,
            ),
            max: percentToValueWorklet(
              maxPercent.value,
              minimumValue,
              maximumValue,
              span,
              step,
            ),
          });
        }),
    [
      dragStartPercent,
      maxPercent,
      minPercent,
      minimumValue,
      maximumValue,
      reportChange,
      reportDragEnd,
      span,
      step,
      trackWidth,
    ],
  );

  const minGesture = useMemo(
    () => buildThumbGesture('min'),
    [buildThumbGesture],
  );
  const maxGesture = useMemo(
    () => buildThumbGesture('max'),
    [buildThumbGesture],
  );

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      trackWidth.value = event.nativeEvent.layout.width;
    },
    [trackWidth],
  );

  const trackFillStyle = useAnimatedStyle(() => {
    const left = minPercent.value;
    const width = maxPercent.value - minPercent.value;
    return {
      left: `${left}%`,
      width: `${Math.max(width, 0)}%`,
    };
  });

  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${minPercent.value}%` }],
  }));
  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${maxPercent.value}%` }],
  }));

  const baseTestID = testID ?? 'range-slider';

  return (
    <GestureHandlerRootView style={styles.root}>
      <View
        style={styles.trackArea}
        onLayout={handleLayout}
        testID={baseTestID}
        accessibilityRole="adjustable"
      >
        {/* Track */}
        <View
          style={[styles.track, { backgroundColor: colors.background.muted }]}
        />
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: colors.icon.default },
            trackFillStyle,
          ]}
        />
        {/* Min thumb */}
        <Animated.View
          style={[styles.thumbAnchor, minThumbStyle]}
          testID={`${baseTestID}-min-thumb`}
        >
          <GestureDetector gesture={minGesture}>
            <View
              style={styles.thumbHitArea}
              accessibilityLabel={minThumbAccessibilityLabel}
              accessibilityRole="adjustable"
            >
              <View
                style={[
                  styles.thumbVisual,
                  {
                    backgroundColor: colors.background.default,
                    borderColor: colors.icon.default,
                  },
                ]}
              />
            </View>
          </GestureDetector>
        </Animated.View>
        {/* Max thumb */}
        <Animated.View
          style={[styles.thumbAnchor, maxThumbStyle]}
          testID={`${baseTestID}-max-thumb`}
        >
          <GestureDetector gesture={maxGesture}>
            <View
              style={styles.thumbHitArea}
              accessibilityLabel={maxThumbAccessibilityLabel}
              accessibilityRole="adjustable"
            >
              <View
                style={[
                  styles.thumbVisual,
                  {
                    backgroundColor: colors.background.default,
                    borderColor: colors.icon.default,
                  },
                ]}
              />
            </View>
          </GestureDetector>
        </Animated.View>
      </View>
    </GestureHandlerRootView>
  );
};

export default RangeSlider;

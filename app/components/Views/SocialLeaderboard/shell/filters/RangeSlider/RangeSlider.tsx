import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../../../../../util/theme';
import { playImpact, ImpactMoment } from '../../../../../../util/haptics';

/**
 * Geometry constants mirrored from `@metamask/design-system-react-native`'s
 * `Slider.constants.mjs`. Keep in sync if that package's Slider geometry changes.
 */
const THUMB_SIZE = 32;
const THUMB_TOP_OFFSET = -13;
/** Negative offset so the thumb center aligns with the track start at 0%. */
const THUMB_LEFT_OFFSET = -16;
const THUMB_BOTTOM_OFFSET = THUMB_TOP_OFFSET + THUMB_SIZE;
const TRACK_HEIGHT = 8;
const SLIDER_VERTICAL_PADDING = 8;
/**
 * Default horizontal inset on the root container; equals |THUMB_LEFT_OFFSET| so
 * the thumb can overhang at min/max without clipping.
 */
const SLIDER_TRACK_INSET = Math.abs(THUMB_LEFT_OFFSET);
const SLIDER_TRACK_AREA_HEIGHT =
  SLIDER_VERTICAL_PADDING * 2 + THUMB_BOTTOM_OFFSET;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    marginHorizontal: SLIDER_TRACK_INSET,
    overflow: 'visible',
  },
  trackArea: {
    position: 'relative',
    height: SLIDER_TRACK_AREA_HEIGHT,
    paddingVertical: SLIDER_VERTICAL_PADDING,
    overflow: 'visible',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top:
      SLIDER_VERTICAL_PADDING +
      THUMB_TOP_OFFSET +
      THUMB_SIZE / 2 -
      TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  fill: {
    position: 'absolute',
    top:
      SLIDER_VERTICAL_PADDING +
      THUMB_TOP_OFFSET +
      THUMB_SIZE / 2 -
      TRACK_HEIGHT / 2,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    top: SLIDER_VERTICAL_PADDING + THUMB_TOP_OFFSET,
    left: THUMB_LEFT_OFFSET,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    elevation: 4,
  },
});

export interface RangeSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: { min: number; max: number };
  onValueChange: (value: { min: number; max: number }) => void;
  onDragEnd?: (value: { min: number; max: number }) => void;
  step?: number;
  minThumbAccessibilityLabel?: string;
  maxThumbAccessibilityLabel?: string;
  testID?: string;
}

interface ResolvedValue {
  min: number;
  max: number;
}

type ActiveThumb = 'min' | 'max';

function clampTrackPercent(trackPercent: number) {
  'worklet';
  return Math.max(0, Math.min(100, trackPercent));
}

function trackPercentToPosition(trackPercent: number, width: number) {
  'worklet';
  if (width === 0) {
    return 0;
  }
  return (clampTrackPercent(trackPercent) / 100) * width;
}

function positionToTrackPercent(position: number, width: number) {
  'worklet';
  if (width === 0) {
    return 0;
  }
  return clampTrackPercent((position / width) * 100);
}

function clampGesturePosition(position: number, width: number) {
  'worklet';
  return Math.max(0, Math.min(position, width));
}

function percentToValueWorklet(
  percent: number,
  minimumValue: number,
  maximumValue: number,
  span: number,
  step: number,
) {
  'worklet';
  const raw = minimumValue + (clampTrackPercent(percent) / 100) * span;
  const stepped = Math.round(raw / step) * step;
  return Math.max(minimumValue, Math.min(maximumValue, stepped));
}

function valueToPercentWorklet(
  domainValue: number,
  minimumValue: number,
  span: number,
) {
  'worklet';
  if (span <= 0) {
    return 0;
  }
  return clampTrackPercent(((domainValue - minimumValue) / span) * 100);
}

function resolvedValueWorklet(
  minPercent: number,
  maxPercent: number,
  minimumValue: number,
  maximumValue: number,
  span: number,
  step: number,
): ResolvedValue {
  'worklet';
  return {
    min: percentToValueWorklet(
      minPercent,
      minimumValue,
      maximumValue,
      span,
      step,
    ),
    max: percentToValueWorklet(
      maxPercent,
      minimumValue,
      maximumValue,
      span,
      step,
    ),
  };
}

/**
 * Dual-thumb range slider. MMDS `Slider` is single-thumb only, so this mirrors
 * its geometry and gesture patterns (pixel `translateX`, track inset, full-track
 * pan) with separate min/max thumbs.
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
  const isDragging = useSharedValue(false);
  const activeThumb = useSharedValue<ActiveThumb>('min');
  const propMinPercent = useSharedValue(minPercent.value);
  const propMaxPercent = useSharedValue(maxPercent.value);
  const isDraggingRef = useRef(false);

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

  const setDragging = useCallback((dragging: boolean) => {
    isDraggingRef.current = dragging;
  }, []);

  const syncPercentsFromValue = useCallback(
    (nextValue: ResolvedValue) => {
      if (span <= 0) {
        return;
      }
      const nextMin = valueToPercentWorklet(nextValue.min, minimumValue, span);
      const nextMax = valueToPercentWorklet(nextValue.max, minimumValue, span);
      minPercent.value = nextMin;
      maxPercent.value = nextMax;
      propMinPercent.value = nextMin;
      propMaxPercent.value = nextMax;
    },
    [
      maxPercent,
      minPercent,
      minimumValue,
      propMaxPercent,
      propMinPercent,
      span,
    ],
  );

  useEffect(() => {
    if (span <= 0 || isDraggingRef.current) {
      return;
    }
    const nextMin = ((value.min - minimumValue) / span) * 100;
    const nextMax = ((value.max - minimumValue) / span) * 100;
    propMinPercent.value = nextMin;
    propMaxPercent.value = nextMax;
  }, [
    value.min,
    value.max,
    minimumValue,
    span,
    propMinPercent,
    propMaxPercent,
  ]);

  useAnimatedReaction(
    () => ({
      min: propMinPercent.value,
      max: propMaxPercent.value,
    }),
    (current, previous) => {
      if (isDragging.value) {
        return;
      }
      if (
        previous &&
        current.min === previous.min &&
        current.max === previous.max
      ) {
        return;
      }
      minPercent.value = current.min;
      maxPercent.value = current.max;
    },
    [],
  );

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = event.nativeEvent.layout;
      const previousWidth = trackWidth.value;
      trackWidth.value = width;
      if (previousWidth > 0 || width === 0) {
        return;
      }
      syncPercentsFromValue(value);
    },
    [syncPercentsFromValue, trackWidth, value],
  );

  const gesture = useMemo(() => {
    const updateThumbAtPosition = (position: number) => {
      'worklet';
      const width = trackWidth.value;
      if (width === 0) {
        return;
      }
      const trackPercent = positionToTrackPercent(
        clampGesturePosition(position, width),
        width,
      );
      if (activeThumb.value === 'min') {
        minPercent.value = Math.min(trackPercent, maxPercent.value);
      } else {
        maxPercent.value = Math.max(trackPercent, minPercent.value);
      }
      runOnJS(reportChange)(
        resolvedValueWorklet(
          minPercent.value,
          maxPercent.value,
          minimumValue,
          maximumValue,
          span,
          step,
        ),
      );
    };

    const pickActiveThumb = (position: number) => {
      'worklet';
      const width = trackWidth.value;
      if (width === 0) {
        activeThumb.value = 'min';
        return;
      }
      const touchX = clampGesturePosition(position, width);
      const minPosition = trackPercentToPosition(minPercent.value, width);
      const maxPosition = trackPercentToPosition(maxPercent.value, width);
      activeThumb.value =
        Math.abs(touchX - minPosition) <= Math.abs(touchX - maxPosition)
          ? 'min'
          : 'max';
    };

    return Gesture.Pan()
      .onStart((event) => {
        'worklet';
        isDragging.value = true;
        runOnJS(setDragging)(true);
        runOnJS(playImpact)(ImpactMoment.SliderGrip);
        pickActiveThumb(event.x);
        updateThumbAtPosition(event.x);
      })
      .onUpdate((event) => {
        'worklet';
        updateThumbAtPosition(event.x);
      })
      .onEnd(() => {
        'worklet';
        runOnJS(reportDragEnd)(
          resolvedValueWorklet(
            minPercent.value,
            maxPercent.value,
            minimumValue,
            maximumValue,
            span,
            step,
          ),
        );
      })
      .onFinalize(() => {
        'worklet';
        isDragging.value = false;
        runOnJS(setDragging)(false);
      });
  }, [
    activeThumb,
    isDragging,
    maxPercent,
    maximumValue,
    minPercent,
    minimumValue,
    reportChange,
    reportDragEnd,
    setDragging,
    span,
    step,
    trackWidth,
  ]);

  const trackFillStyle = useAnimatedStyle(() => {
    const width = trackWidth.value;
    const left = trackPercentToPosition(minPercent.value, width);
    const right = trackPercentToPosition(maxPercent.value, width);
    return {
      left,
      width: Math.max(right - left, 0),
    };
  });

  const minThumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: trackPercentToPosition(minPercent.value, trackWidth.value),
      },
    ],
  }));

  const maxThumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: trackPercentToPosition(maxPercent.value, trackWidth.value),
      },
    ],
  }));

  const baseTestID = testID ?? 'range-slider';

  return (
    <View style={styles.root} onLayout={handleLayout} testID={baseTestID}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={styles.trackArea} accessibilityRole="adjustable">
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
          <Animated.View
            style={[
              styles.thumb,
              minThumbStyle,
              {
                backgroundColor: colors.background.default,
                borderColor: colors.icon.default,
                zIndex: 1,
              },
            ]}
            pointerEvents="none"
            accessibilityLabel={minThumbAccessibilityLabel}
            accessibilityRole="adjustable"
            testID={`${baseTestID}-min-thumb`}
          />
          <Animated.View
            style={[
              styles.thumb,
              maxThumbStyle,
              {
                backgroundColor: colors.background.default,
                borderColor: colors.icon.default,
                zIndex: 2,
              },
            ]}
            pointerEvents="none"
            accessibilityLabel={maxThumbAccessibilityLabel}
            accessibilityRole="adjustable"
            testID={`${baseTestID}-max-thumb`}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

export default RangeSlider;

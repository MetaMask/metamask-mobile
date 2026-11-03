import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { playImpact, ImpactMoment } from '../../../../../../util/haptics';

/**
 * Geometry from `@metamask/design-system-react-native` `Slider`. The package
 * slider draws one thumb, so this control reuses that track, fill, and thumb
 * and adds a second thumb. Keep in sync if the package slider geometry changes.
 */
const THUMB_SIZE = 32;
const THUMB_TOP_OFFSET = -13;
/** Negative offset so the thumb center aligns with the track start at 0%. */
const THUMB_LEFT_OFFSET = -16;
const THUMB_BOTTOM_OFFSET = THUMB_TOP_OFFSET + THUMB_SIZE;
/**
 * Default horizontal inset on the root container; equals |THUMB_LEFT_OFFSET| so
 * the thumb can overhang at min/max without clipping.
 */
const SLIDER_TRACK_INSET = Math.abs(THUMB_LEFT_OFFSET);

const THUMB_LAYOUT = {
  width: THUMB_SIZE,
  height: THUMB_SIZE,
  top: THUMB_TOP_OFFSET,
  left: THUMB_LEFT_OFFSET,
  elevation: 4,
};
const MIN_THUMB_LAYOUT = {
  ...THUMB_LAYOUT,
  zIndex: 1,
};
const MAX_THUMB_LAYOUT = {
  ...THUMB_LAYOUT,
  zIndex: 2,
};
const THUMB_ACCESSIBILITY_ACTIONS = [
  { name: 'increment' },
  { name: 'decrement' },
] as const;

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
 * Dual-thumb range slider. Uses the design-system `Slider` track (`border-muted`),
 * fill (`icon-alternative`), and 32px `icon-default` thumb, with a second thumb
 * so a range can be selected.
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
  const tw = useTailwind();

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

  const stepThumbFromAccessibility = useCallback(
    (thumb: ActiveThumb, actionName: string) => {
      const direction = actionName === 'increment' ? 1 : -1;
      if (actionName !== 'increment' && actionName !== 'decrement') {
        return;
      }
      const nextMin =
        thumb === 'min'
          ? Math.min(
              value.max,
              Math.max(minimumValue, value.min + direction * step),
            )
          : value.min;
      const nextMax =
        thumb === 'max'
          ? Math.max(
              value.min,
              Math.min(maximumValue, value.max + direction * step),
            )
          : value.max;
      const next = { min: nextMin, max: nextMax };
      onValueChange(next);
      onDragEnd?.(next);
    },
    [
      maximumValue,
      minimumValue,
      onDragEnd,
      onValueChange,
      step,
      value.max,
      value.min,
    ],
  );

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
      if (current.min === previous?.min && current.max === previous?.max) {
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
      scheduleOnRN(
        reportChange,
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

    // Horizontal activation so the sheet pan and the scroll view keep
    // vertical drags, and this slider keeps min/max drags.
    return Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-12, 12])
      .hitSlop({
        top: -THUMB_TOP_OFFSET,
        bottom: 8,
        left: SLIDER_TRACK_INSET,
        right: SLIDER_TRACK_INSET,
      })
      .onStart((event) => {
        'worklet';
        isDragging.value = true;
        scheduleOnRN(setDragging, true);
        scheduleOnRN(playImpact, ImpactMoment.SliderGrip);
        pickActiveThumb(event.x);
        updateThumbAtPosition(event.x);
      })
      .onUpdate((event) => {
        'worklet';
        updateThumbAtPosition(event.x);
      })
      .onEnd(() => {
        'worklet';
        scheduleOnRN(
          reportDragEnd,
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
        scheduleOnRN(setDragging, false);
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
    <Box
      testID={baseTestID}
      onLayout={handleLayout}
      twClassName="relative self-stretch overflow-visible pb-2"
      // The thumb is drawn 13px above the track. That top padding keeps the
      // thumb inside this box so the section's 8px margin stays visible.
      style={{
        marginHorizontal: SLIDER_TRACK_INSET,
        paddingTop: -THUMB_TOP_OFFSET,
      }}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            tw.style('relative overflow-visible'),
            { height: THUMB_BOTTOM_OFFSET },
          ]}
        >
          <Animated.View
            style={tw.style(
              'absolute left-0 top-0 h-2 w-full rounded-full bg-border-muted',
            )}
          />
          <Animated.View
            style={[
              tw.style('absolute top-0 h-2 rounded-full bg-icon-alternative'),
              trackFillStyle,
            ]}
          />
          <Animated.View
            style={[
              tw.style('absolute rounded-full bg-icon-default'),
              MIN_THUMB_LAYOUT,
              minThumbStyle,
            ]}
            pointerEvents="none"
            accessible
            accessibilityLabel={minThumbAccessibilityLabel}
            accessibilityRole="adjustable"
            accessibilityValue={{
              min: minimumValue,
              max: maximumValue,
              now: value.min,
            }}
            accessibilityActions={THUMB_ACCESSIBILITY_ACTIONS}
            onAccessibilityAction={(event) => {
              stepThumbFromAccessibility('min', event.nativeEvent.actionName);
            }}
            testID={`${baseTestID}-min-thumb`}
          />
          <Animated.View
            style={[
              tw.style('absolute rounded-full bg-icon-default'),
              MAX_THUMB_LAYOUT,
              maxThumbStyle,
            ]}
            pointerEvents="none"
            accessible
            accessibilityLabel={maxThumbAccessibilityLabel}
            accessibilityRole="adjustable"
            accessibilityValue={{
              min: minimumValue,
              max: maximumValue,
              now: value.max,
            }}
            accessibilityActions={THUMB_ACCESSIBILITY_ACTIONS}
            onAccessibilityAction={(event) => {
              stepThumbFromAccessibility('max', event.nativeEvent.actionName);
            }}
            testID={`${baseTestID}-max-thumb`}
          />
        </Animated.View>
      </GestureDetector>
    </Box>
  );
};

export default RangeSlider;

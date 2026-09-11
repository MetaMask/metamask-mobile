import { useRef, useCallback, useEffect } from 'react';
import { type LayoutChangeEvent } from 'react-native';
import {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_DURATION = 280;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const COLLAPSED_BUTTON_HEIGHT = 56;

interface UseExpandableFormAnimationOptions {
  duration?: number;
  easing?: (value: number) => number;
}

/**
 * Drives a height + opacity expand/collapse animation on the UI thread via
 * Reanimated so parent containers (e.g. BottomSheet) resize smoothly without
 * JS-thread Yoga layout work each frame.
 *
 * Returns pre-built animated styles for the expandable content wrapper and an
 * optional "toggle button" that crossfades out as the content grows in.
 */
export function useExpandableFormAnimation(
  isExpanded: boolean,
  options: UseExpandableFormAnimationOptions = {},
) {
  const { duration = DEFAULT_DURATION, easing = DEFAULT_EASING } = options;

  const heightSv = useSharedValue(0);
  const opacitySv = useSharedValue(0);
  const measuredHeight = useRef(0);

  const expand = useCallback(
    (target: number) => {
      heightSv.value = withTiming(target, { duration, easing });
      opacitySv.value = withTiming(1, { duration, easing });
    },
    [heightSv, opacitySv, duration, easing],
  );

  const collapse = useCallback(() => {
    heightSv.value = withTiming(0, { duration, easing });
    opacitySv.value = withTiming(0, {
      duration: duration * 0.5,
      easing,
    });
  }, [heightSv, opacitySv, duration, easing]);

  useEffect(() => {
    if (isExpanded && measuredHeight.current > 0) {
      expand(measuredHeight.current);
    } else if (!isExpanded) {
      collapse();
    }
  }, [isExpanded, expand, collapse]);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        measuredHeight.current = h;
        if (isExpanded) {
          expand(h);
        }
      }
    },
    [isExpanded, expand],
  );

  const contentWrapperStyle = useAnimatedStyle(() => ({
    overflow: 'hidden' as const,
    height: heightSv.value,
    opacity: opacitySv.value,
  }));

  const toggleButtonStyle = useAnimatedStyle(() => ({
    overflow: 'hidden' as const,
    opacity: interpolate(
      opacitySv.value,
      [0, 0.4],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    maxHeight: interpolate(
      opacitySv.value,
      [0, 1],
      [COLLAPSED_BUTTON_HEIGHT, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return {
    onContentLayout,
    contentWrapperStyle,
    toggleButtonStyle,
  };
}

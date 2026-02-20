import { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';

const DEFAULT_DURATION = 280;
const DEFAULT_EASING = Easing.out(Easing.cubic);
const COLLAPSED_BUTTON_HEIGHT = 56;

interface UseExpandableFormAnimationOptions {
  duration?: number;
  easing?: (value: number) => number;
}

/**
 * Drives a height + opacity expand/collapse animation that participates in
 * Yoga layout (useNativeDriver: false) so parent containers (e.g. BottomSheet)
 * resize smoothly.
 *
 * Returns pre-built animated styles for the expandable content wrapper and an
 * optional "toggle button" that crossfades out as the content grows in.
 */
export function useExpandableFormAnimation(
  isExpanded: boolean,
  options: UseExpandableFormAnimationOptions = {},
) {
  const { duration = DEFAULT_DURATION, easing = DEFAULT_EASING } = options;

  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const measuredHeight = useRef(0);

  const expand = useCallback(
    (target: number) => {
      Animated.parallel([
        Animated.timing(heightAnim, {
          toValue: target,
          duration,
          easing,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration,
          easing,
          useNativeDriver: false,
        }),
      ]).start();
    },
    [heightAnim, opacityAnim, duration, easing],
  );

  const collapse = useCallback(() => {
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: 0,
        duration,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: duration * 0.5,
        easing,
        useNativeDriver: false,
      }),
    ]).start();
  }, [heightAnim, opacityAnim, duration, easing]);

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

  const contentWrapperStyle: Animated.WithAnimatedObject<ViewStyle> = useMemo(
    () => ({
      overflow: 'hidden' as const,
      height: heightAnim,
      opacity: opacityAnim,
    }),
    [heightAnim, opacityAnim],
  );

  const toggleButtonStyle: Animated.WithAnimatedObject<ViewStyle> = useMemo(
    () => ({
      overflow: 'hidden' as const,
      opacity: opacityAnim.interpolate({
        inputRange: [0, 0.4],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }),
      maxHeight: opacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [COLLAPSED_BUTTON_HEIGHT, 0],
        extrapolate: 'clamp',
      }),
    }),
    [opacityAnim],
  );

  return {
    onContentLayout,
    contentWrapperStyle,
    toggleButtonStyle,
  };
}

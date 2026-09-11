import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { KEYPAD_REVEAL_TIMING } from '../keypadAnimation';

const styles = StyleSheet.create({
  measuredContent: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

interface CollapsibleRevealProps {
  /** When true, animates to the measured content height; when false, to 0. */
  expanded: boolean;
  /**
   * When true (default), initially-expanded content lays out naturally first
   * then locks height (no 0→snap). Avoids stuttering the bottom-sheet open.
   * Keypad should pass false so the first open animates 0 → height.
   */
  snapExpandedOnMount?: boolean;
  /**
   * When false, stays mounted at height 0 while collapsed so intrinsic height
   * can be pre-measured and the next expand starts in sync with a sibling
   * collapse (keypad + footer).
   */
  unmountWhenCollapsed?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Animates container height and opacity between collapsed and expanded.
 * Used by keypad (expand) and footer (collapse) so both share one timing curve
 * and the bottom sheet never dips then grows. Opacity softens the clipped edge
 * as the surface reveals over content beneath.
 */
const CollapsibleReveal: React.FC<CollapsibleRevealProps> = ({
  expanded,
  snapExpandedOnMount = true,
  unmountWhenCollapsed = true,
  children,
  style,
  testID,
}) => {
  // Natural layout first when starting expanded — avoids a height-0 frame that
  // makes BottomSheetDialog stutter on open. Switch to animated once measured.
  const [layoutMode, setLayoutMode] = useState<'natural' | 'animated'>(
    snapExpandedOnMount && expanded ? 'natural' : 'animated',
  );
  const [isMounted, setIsMounted] = useState(expanded || !unmountWhenCollapsed);
  const measuredHeightSV = useSharedValue(0);
  const animatedHeightSV = useSharedValue(0);
  const opacitySV = useSharedValue(expanded ? 1 : 0);
  const isNatural = layoutMode === 'natural';

  useEffect(() => {
    if (isNatural) {
      // Collapse requested before natural onLayout — switch to animated so the
      // footer/keypad sync doesn't leave full-opacity content visible.
      if (!expanded) {
        setLayoutMode('animated');
        opacitySV.value = withTiming(0, KEYPAD_REVEAL_TIMING);
        animatedHeightSV.value = withTiming(0, KEYPAD_REVEAL_TIMING);
      }
      return;
    }

    if (expanded) {
      setIsMounted(true);
      opacitySV.value = withTiming(1, KEYPAD_REVEAL_TIMING);
      if (measuredHeightSV.value > 0) {
        animatedHeightSV.value = withTiming(
          measuredHeightSV.value,
          KEYPAD_REVEAL_TIMING,
        );
      }
      return;
    }

    opacitySV.value = withTiming(0, KEYPAD_REVEAL_TIMING);
    animatedHeightSV.value = withTiming(0, KEYPAD_REVEAL_TIMING, (finished) => {
      if (finished && unmountWhenCollapsed) {
        // Reanimated v3 API — scheduleOnRN is v4-only and not available here.
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- runOnJS is the v3 bridge
        runOnJS(setIsMounted)(false);
      }
    });
  }, [
    animatedHeightSV,
    expanded,
    isNatural,
    measuredHeightSV,
    opacitySV,
    unmountWhenCollapsed,
  ]);

  const handleNaturalLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (nextHeight <= 0) {
        return;
      }
      measuredHeightSV.value = nextHeight;
      animatedHeightSV.value = nextHeight;
      opacitySV.value = 1;
      setLayoutMode('animated');
    },
    [animatedHeightSV, measuredHeightSV, opacitySV],
  );

  const handleAnimatedContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = event.nativeEvent.layout.height;
      if (nextHeight <= 0) {
        return;
      }

      const previousHeight = measuredHeightSV.value;
      measuredHeightSV.value = nextHeight;

      if (!expanded) {
        return;
      }

      if (previousHeight === 0) {
        animatedHeightSV.value = withTiming(nextHeight, KEYPAD_REVEAL_TIMING);
        opacitySV.value = withTiming(1, KEYPAD_REVEAL_TIMING);
        return;
      }

      if (Math.abs(previousHeight - nextHeight) > 1) {
        animatedHeightSV.value = withTiming(nextHeight, KEYPAD_REVEAL_TIMING);
      }
    },
    [animatedHeightSV, expanded, measuredHeightSV, opacitySV],
  );

  const revealStyle = useAnimatedStyle(() => {
    if (isNatural) {
      return { opacity: 1 };
    }
    return {
      height: animatedHeightSV.value,
      opacity: opacitySV.value,
      overflow: 'hidden',
    };
  }, [isNatural]);

  if (!isMounted) {
    return null;
  }

  return (
    <Animated.View
      style={[revealStyle, style]}
      onLayout={isNatural ? handleNaturalLayout : undefined}
      testID={testID}
    >
      <View
        style={isNatural ? undefined : styles.measuredContent}
        onLayout={isNatural ? undefined : handleAnimatedContentLayout}
        pointerEvents={expanded ? 'auto' : 'none'}
        testID={testID ? `${testID}-content` : undefined}
      >
        {children}
      </View>
    </Animated.View>
  );
};

export default CollapsibleReveal;

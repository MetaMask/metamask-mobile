import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

/** Duration of the slide transition between texts in ms. */
export const SLIDE_DURATION_MS = 350;

/** Interval between text rotations in ms. */
export const ROTATE_INTERVAL_MS = 5000;

const styles = StyleSheet.create({
  overflowHidden: {
    overflow: 'hidden',
  },
  slidingText: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  sizer: {
    opacity: 0,
  },
});

export interface SlidingTextCarouselProps {
  /** List of text strings to cycle through. */
  texts: string[];
  /** Called when a slide transition begins (after rotation gates pass). */
  onSlideStart?: () => void;
  /** Called after each slide transition completes. */
  onSlideComplete?: () => void;
  /** Optional test ID applied to the animated container. */
  testID?: string;
}

/**
 * Shows one text item at a time, sliding each one out to the left and bringing
 * the next in from the right every ROTATE_INTERVAL_MS milliseconds.
 * When there is only one item, it renders statically without animation.
 *
 * Uses a double-buffer approach: two slots (A and B) alternate roles between
 * "front" (visible, about to slide out) and "back" (off-screen right, about
 * to slide in). After each slide the departing slot is teleported off-screen
 * right and its text is refreshed while invisible — avoiding any flash.
 *
 * Important: all useRef mutations must happen inside onSlideEnd (JS thread)
 * rather than directly in the withTiming worklet callback, because worklets
 * run on the UI thread and writes to useRef objects there do not propagate
 * back to the JS thread.
 */
const SlidingTextCarousel: React.FC<SlidingTextCarouselProps> = ({
  texts,
  onSlideStart,
  onSlideComplete,
  testID,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerWidthRef = useRef(0);
  const isAnimating = useRef(false);

  // Each slot owns its text content directly — no index-based lookup during render
  const [slotAText, setSlotAText] = useState(texts[0] ?? '');
  const [slotBText, setSlotBText] = useState(texts[1] ?? texts[0] ?? '');

  // Slot A starts visible (x=0); slot B starts well off-screen right so there is
  // no overlap before the layout event fires and sets the real containerWidth.
  const slotAX = useSharedValue(0);
  const slotBX = useSharedValue(9999);

  // Track which slot is the current "front" (visible) and which text comes next
  const frontIsA = useRef(true);
  const upcomingIndex = useRef(2);

  useEffect(() => {
    if (containerWidth > 0) {
      slotBX.value = containerWidth;
    }
  }, [containerWidth, slotBX]);

  const slotAStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slotAX.value }],
  }));
  const slotBStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slotBX.value }],
  }));

  /**
   * Runs on the JS thread after a slide animation completes.
   * Centralises all ref mutations so they stay on the JS thread.
   */
  const onSlideEnd = useCallback(
    (wasAFront: boolean, capturedIdx: number) => {
      frontIsA.current = !wasAFront;
      const nextText = texts[capturedIdx % texts.length];
      if (wasAFront) {
        setSlotAText(nextText);
      } else {
        setSlotBText(nextText);
      }
      upcomingIndex.current = (capturedIdx + 1) % texts.length;
      onSlideComplete?.();
      isAnimating.current = false;
    },
    [texts, setSlotAText, setSlotBText, onSlideComplete],
  );

  const advanceSlide = useCallback(() => {
    const cw = containerWidthRef.current;
    if (texts.length <= 1 || isAnimating.current || cw === 0) {
      return;
    }
    isAnimating.current = true;
    onSlideStart?.();

    // Snapshot JS-thread values before entering the worklet
    const aIsFront = frontIsA.current;
    const capturedIdx = upcomingIndex.current;
    const frontX = aIsFront ? slotAX : slotBX;
    const backX = aIsFront ? slotBX : slotAX;

    // Slide the front slot out to the left, the back slot in from the right
    frontX.value = withTiming(-cw, { duration: SLIDE_DURATION_MS });
    backX.value = withTiming(0, { duration: SLIDE_DURATION_MS }, (finished) => {
      if (finished) {
        // Teleport the departing slot off-screen right while still invisible
        frontX.value = cw;
        // Hand off all ref mutations back to the JS thread
        runOnJS(onSlideEnd)(aIsFront, capturedIdx);
      }
    });
  }, [texts.length, slotAX, slotBX, onSlideEnd, onSlideStart]);

  useEffect(() => {
    if (texts.length <= 1) return undefined;
    const interval = setInterval(advanceSlide, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [texts.length, advanceSlide]);

  const handleContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      const { width } = e.nativeEvent.layout;
      if (width !== containerWidthRef.current) {
        containerWidthRef.current = width;
        setContainerWidth(width);
      }
    },
    [],
  );

  if (texts.length <= 1) {
    return (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        numberOfLines={2}
      >
        {texts[0] ?? ''}
      </Text>
    );
  }

  return (
    <Box
      style={styles.overflowHidden}
      onLayout={handleContainerLayout}
      testID={testID}
    >
      {/* Invisible sizer that establishes the container height based on
          actual font metrics, so the card adapts to Dynamic Type scaling. */}
      <Text
        variant={TextVariant.BodySm}
        numberOfLines={2}
        style={styles.sizer}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {'Mg\nMg'}
      </Text>
      <Animated.View style={[styles.slidingText, slotAStyle]}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          numberOfLines={2}
        >
          {slotAText}
        </Text>
      </Animated.View>
      <Animated.View style={[styles.slidingText, slotBStyle]}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          numberOfLines={2}
        >
          {slotBText}
        </Text>
      </Animated.View>
    </Box>
  );
};

export default SlidingTextCarousel;

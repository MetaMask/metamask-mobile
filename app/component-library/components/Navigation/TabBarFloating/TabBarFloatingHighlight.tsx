import React from 'react';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  HIGHLIGHT_LEADING_SPRING,
  HIGHLIGHT_MAX_STRETCH,
  HIGHLIGHT_TRAILING_SPRING,
  TAB_BAR_FLOATING_TEST_IDS,
} from './TabBarFloating.constants';

/** Horizontal extent of one tab slot, in pill-relative coordinates. */
export interface HighlightSlot {
  x: number;
  width: number;
}

/**
 * Resting box of the bubble. Taken from a measured slot rather than stretched
 * to the pill, so the pill's own padding can't leave the highlight oversized.
 */
export interface HighlightBox {
  width: number;
  top: number;
  height: number;
}

export interface TabBarFloatingHighlightProps {
  /** Measured slot extents, indexed by tab. Written from each item's layout. */
  slots: SharedValue<HighlightSlot[]>;
  /** Slot the highlight should occupy. Set on press, before navigation commits. */
  targetIndex: SharedValue<number>;
  /** Slots are `flex-1` and share a row, so one slot's box describes them all. */
  box: HighlightBox;
}

/**
 * The moving selection bubble behind the tab row.
 *
 * Only `translateX` and `scaleX` animate — both composite on the UI thread and
 * never trigger a native layout pass. The resting width is a plain style, so
 * changing it is a re-render rather than a per-frame cost.
 *
 * The left and right edges are tracked separately and spring at different
 * rates, which is what produces the stretch: mid-flight the edges are further
 * apart than a slot, and the bubble reads as an oval until they converge.
 */
const TabBarFloatingHighlight = ({
  slots,
  targetIndex,
  box,
}: TabBarFloatingHighlightProps) => {
  const { width: slotWidth, top, height } = box;
  const tw = useTailwind();
  const prefersReducedMotion = useReducedMotion();

  const leftEdge = useSharedValue(0);
  const rightEdge = useSharedValue(0);
  // Where the springs are headed, which is not where the edges currently are.
  // The guard below has to compare against these: a re-measure mid-flight asks
  // for the same destination again, and comparing against the live edges would
  // read that as a new one.
  const targetLeft = useSharedValue(0);
  const targetRight = useSharedValue(0);
  // Distinguishes "not placed yet" from "sitting at x = 0", so the first
  // placement snaps instead of sliding in from the left edge of the pill.
  const isPlaced = useSharedValue(false);

  useAnimatedReaction(
    () => ({ index: targetIndex.value, measured: slots.value }),
    ({ index, measured }) => {
      const slot = measured[index];
      if (!slot || slot.width <= 0) {
        return;
      }

      const nextLeft = slot.x;
      const nextRight = slot.x + slot.width;

      if (!isPlaced.value || prefersReducedMotion) {
        isPlaced.value = true;
        targetLeft.value = nextLeft;
        targetRight.value = nextRight;
        leftEdge.value = nextLeft;
        rightEdge.value = nextRight;
        return;
      }

      // Already heading here. Selecting a tab asks for the same slot repeatedly
      // — once on press, again when navigation commits, and again on every
      // re-measure the icon and label swap triggers. Restarting the springs on
      // those would reset their velocity and stall the bubble mid-flight.
      if (targetLeft.value === nextLeft && targetRight.value === nextRight) {
        return;
      }

      const movingRight = nextLeft > leftEdge.value;
      targetLeft.value = nextLeft;
      targetRight.value = nextRight;
      leftEdge.value = withSpring(
        nextLeft,
        movingRight ? HIGHLIGHT_TRAILING_SPRING : HIGHLIGHT_LEADING_SPRING,
      );
      rightEdge.value = withSpring(
        nextRight,
        movingRight ? HIGHLIGHT_LEADING_SPRING : HIGHLIGHT_TRAILING_SPRING,
      );
    },
  );

  const animatedStyle = useAnimatedStyle(() => {
    const span = rightEdge.value - leftEdge.value;
    // Both branches return the same keys — Reanimated does not reset properties
    // that disappear between runs of an animated style.
    if (!isPlaced.value || slotWidth <= 0 || span <= 0) {
      return { opacity: 0, transform: [{ translateX: 0 }, { scaleX: 1 }] };
    }

    const center = (leftEdge.value + rightEdge.value) / 2;

    return {
      opacity: 1,
      transform: [
        { translateX: center - slotWidth / 2 },
        { scaleX: Math.min(span / slotWidth, HIGHLIGHT_MAX_STRETCH) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      testID={TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT}
      style={[
        tw.style('absolute left-0 rounded-full bg-muted'),
        { width: slotWidth, top, height },
        animatedStyle,
      ]}
    />
  );
};

export default TabBarFloatingHighlight;

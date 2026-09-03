import React, { useMemo, useState } from 'react';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  GlassView,
  type GlassColorScheme,
  type GlassEffectStyleConfig,
} from 'expo-glass-effect';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import {
  HIGHLIGHT_GLASS_STYLE,
  HIGHLIGHT_GLASS_TINT,
  HIGHLIGHT_LANDING_THRESHOLD,
  HIGHLIGHT_LAND_SPRING,
  HIGHLIGHT_LEADING_SPRING,
  HIGHLIGHT_LIFT_FILL_OPACITY,
  HIGHLIGHT_LIFT_SCALE,
  HIGHLIGHT_LIFT_SPRING,
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

/**
 * Everything the highlight's layers need to draw themselves, owned by the tab
 * bar so the resting fill (inside the pill) and the lifted glass disc (outside
 * it) can move as one without sharing a parent.
 */
export interface HighlightMotion {
  leftEdge: SharedValue<number>;
  rightEdge: SharedValue<number>;
  /** 0 at rest, 1 in flight. */
  lift: SharedValue<number>;
  /** Where `lift` is heading; changes exactly once per rise and once per drop. */
  liftTarget: SharedValue<number>;
  isPlaced: SharedValue<boolean>;
}

export interface UseTabBarFloatingHighlightOptions {
  /** Measured slot extents, indexed by tab. Written from each item's layout. */
  slots: SharedValue<HighlightSlot[]>;
  /** Slot the highlight should occupy. Set on press, before navigation commits. */
  targetIndex: SharedValue<number>;
  /** True while a finger is down on any tab. Lifts the bubble before it moves. */
  isPressed: SharedValue<boolean>;
  /**
   * Called on the JS thread the moment the bubble drops back to rest — after
   * a slide lands, or after a release with nowhere to go. Lets the tab bar
   * sequence work behind the animation instead of under it.
   */
  onLand?: () => void;
}

/**
 * Drives the selection bubble, entirely on the UI thread.
 *
 * Three motions. Travel: the left and right edges spring separately at
 * different rates, so mid-flight the bubble is wider than a slot and reads as
 * pulled across. Lift: while a finger is down or the edges are still
 * travelling, the bubble scales up past the pill and its flat fill gives way
 * to clear glass. Land: lift is driven by arrival rather than a timer, so the
 * drop back to rest cannot fall out of step with the slide.
 */
export const useTabBarFloatingHighlight = ({
  slots,
  targetIndex,
  isPressed,
  onLand,
}: UseTabBarFloatingHighlightOptions): HighlightMotion => {
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
  // Same target-guard idiom as the edges.
  const lift = useSharedValue(0);
  const liftTarget = useSharedValue(0);

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

  useAnimatedReaction(
    () => {
      if (prefersReducedMotion) {
        return false;
      }
      const remaining =
        Math.abs(leftEdge.value - targetLeft.value) +
        Math.abs(rightEdge.value - targetRight.value);
      return isPressed.value || remaining > HIGHLIGHT_LANDING_THRESHOLD;
    },
    (shouldLift) => {
      const next = shouldLift ? 1 : 0;
      if (liftTarget.value === next) {
        return;
      }
      liftTarget.value = next;
      lift.value = withSpring(
        next,
        shouldLift ? HIGHLIGHT_LIFT_SPRING : HIGHLIGHT_LAND_SPRING,
      );
      if (!shouldLift && onLand) {
        scheduleOnRN(onLand);
      }
    },
  );

  return { leftEdge, rightEdge, lift, liftTarget, isPlaced };
};

/**
 * Position, stretch and lift of the bubble, shared by both layers so they
 * stay pixel-aligned. Only `transform` and `opacity` — both take Reanimated's
 * direct update path and never trigger a layout pass.
 */
const useHighlightFrameStyle = (
  { leftEdge, rightEdge, lift, isPlaced }: HighlightMotion,
  slotWidth: number,
) =>
  useAnimatedStyle(() => {
    const span = rightEdge.value - leftEdge.value;
    // Both branches return the same keys — Reanimated does not reset properties
    // that disappear between runs of an animated style.
    if (!isPlaced.value || slotWidth <= 0 || span <= 0) {
      return {
        opacity: 0,
        transform: [{ translateX: 0 }, { scaleX: 1 }, { scaleY: 1 }],
      };
    }

    const center = (leftEdge.value + rightEdge.value) / 2;
    const liftScale = 1 + HIGHLIGHT_LIFT_SCALE * lift.value;

    return {
      opacity: 1,
      transform: [
        { translateX: center - slotWidth / 2 },
        {
          scaleX: Math.min(span / slotWidth, HIGHLIGHT_MAX_STRETCH) * liftScale,
        },
        { scaleY: liftScale },
      ],
    };
  });

export interface TabBarFloatingHighlightProps {
  motion: HighlightMotion;
  /** Slots are `flex-1` and share a row, so one slot's box describes them all. */
  box: HighlightBox;
  /** Whether a native glass disc may be drawn above the icons instead. */
  isGlassEnabled: boolean;
}

/**
 * The in-pill layer of the bubble, behind the icons: a flat fill at rest that
 * thins out as the bubble lifts. Unless a native disc is drawn above the
 * icons, it also carries the lifted look — a rim that reads as the edge of a
 * clear surface without bending anything under it.
 */
const TabBarFloatingHighlight = ({
  motion,
  box,
  isGlassEnabled,
}: TabBarFloatingHighlightProps) => {
  const { width: slotWidth, top, height } = box;
  const tw = useTailwind();
  const frameStyle = useHighlightFrameStyle(motion, slotWidth);
  const { lift } = motion;
  const showsRim = !isGlassEnabled || HIGHLIGHT_GLASS_STYLE === 'none';

  const fillStyle = useAnimatedStyle(() => ({
    opacity: 1 - (1 - HIGHLIGHT_LIFT_FILL_OPACITY) * lift.value,
  }));
  const rimStyle = useAnimatedStyle(() => ({ opacity: lift.value }));

  return (
    <Animated.View
      pointerEvents="none"
      testID={TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT}
      style={[
        tw.style('absolute left-0 rounded-full'),
        { width: slotWidth, top, height },
        frameStyle,
      ]}
    >
      <Animated.View
        style={[tw.style('absolute inset-0 rounded-full bg-muted'), fillStyle]}
      />
      {showsRim ? (
        <Animated.View
          style={[
            tw.style('absolute inset-0 rounded-full border border-default'),
            rimStyle,
          ]}
        />
      ) : null}
    </Animated.View>
  );
};

export interface TabBarFloatingHighlightGlassProps {
  motion: HighlightMotion;
  box: HighlightBox;
  glassColorScheme: GlassColorScheme;
}

/**
 * The lifted layer of the bubble: a clear glass disc rendered *outside* the
 * pill's glass container, above the icons.
 *
 * Outside on purpose. Inside a container, overlapping glass merges into one
 * shape — the bulge in the pill's outline — and the disc loses its own rim and
 * refraction to the pill's frosted material. Out here it is an independent
 * disc, invisible at rest so the icons stay unobstructed.
 */
export const TabBarFloatingHighlightGlass = ({
  motion,
  box,
  glassColorScheme,
}: TabBarFloatingHighlightGlassProps) => {
  const { width: slotWidth, top, height } = box;
  const tw = useTailwind();
  const frameStyle = useHighlightFrameStyle(motion, slotWidth);
  const { liftTarget } = motion;

  // The material is a native prop, so the lifted state has to exist on the JS
  // side too. Mirrored here rather than in the hook so only this layer
  // re-renders on a rise or drop, not the whole tab bar.
  const [isLifted, setIsLifted] = useState(false);
  useAnimatedReaction(
    () => liftTarget.value === 1,
    (lifted, previous) => {
      if (lifted !== previous) {
        scheduleOnRN(setIsLifted, lifted);
      }
    },
  );

  // `none` at rest so the disc is invisible; `clear` while lifted. The switch
  // is animated natively.
  const glassEffectStyle = useMemo<GlassEffectStyleConfig>(
    () => ({
      style: isLifted ? HIGHLIGHT_GLASS_STYLE : 'none',
      animate: true,
      animationDuration: 0.15,
    }),
    [isLifted],
  );
  // An explicit radius rather than `rounded-full`: the native corner
  // configuration is not clamped the way RN clamps border radius.
  const glassStyle = useMemo(
    () => [tw.style('absolute inset-0'), { borderRadius: height / 2 }],
    [tw, height],
  );

  return (
    <Animated.View
      pointerEvents="none"
      testID={TAB_BAR_FLOATING_TEST_IDS.HIGHLIGHT_GLASS}
      style={[
        tw.style('absolute left-0'),
        { width: slotWidth, top, height },
        frameStyle,
      ]}
    >
      <GlassView
        glassEffectStyle={glassEffectStyle}
        tintColor={HIGHLIGHT_GLASS_TINT}
        colorScheme={glassColorScheme}
        style={glassStyle}
      />
    </Animated.View>
  );
};

export default TabBarFloatingHighlight;

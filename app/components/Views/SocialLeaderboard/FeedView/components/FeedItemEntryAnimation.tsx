import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Knob to slow down the motion for debugging purposes. It's safe to set to any value, because it's only effective in dev as per next line.
const DEBUG_SLOW_MOTION = 1;
const MOTION_MULTIPLIER = __DEV__ ? DEBUG_SLOW_MOTION : 1;

export const FEED_ITEM_ENTRY_DURATION_MS = 520 * MOTION_MULTIPLIER;
export const FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS =
  200 * MOTION_MULTIPLIER;
export const FEED_ITEM_ENTRY_STAGGER_MS = 70 * MOTION_MULTIPLIER;

const OPACITY_KEYFRAME = 0.6;
const ENTRY_TRANSLATE_Y = 20;
const ENTRY_SCALE = 0.97;

const entryEasing = Easing.bezierFn(0.2, 0.8, 0.2, 1);

/**
 * Returns the delay each new entrance should wait so consecutive starts are
 * at least `staggerMs` apart. Share one scheduler per list.
 */
export const createFeedItemEntryScheduler = (
  staggerMs: number = FEED_ITEM_ENTRY_STAGGER_MS,
  now: () => number = Date.now,
): (() => number) => {
  let nextStartAt = Number.NEGATIVE_INFINITY;

  return () => {
    const currentTime = now();
    const startAt = Math.max(currentTime, nextStartAt);
    nextStartAt = startAt + staggerMs;
    return startAt - currentTime;
  };
};

const styles = StyleSheet.create({
  pinnedToTop: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});

export interface FeedItemEntryAnimationProps {
  children: React.ReactNode;
  /** Socket event id. Each new id plays the entrance once; omit for cached rows. */
  eventId?: string;
  /** Delay before the entrance starts, used to stagger bursts. */
  scheduleEntryDelay?: () => number;
  onAnimationComplete?: (eventId: string) => void;
  testID?: string;
}

/**
 * "Focus In" entrance for rows that arrive over the socket: the row fades in,
 * rises 20px and settles from 97% scale while its height opens, so the rows
 * below ease down.
 */
const FeedItemEntryAnimation: React.FC<FeedItemEntryAnimationProps> = ({
  children,
  eventId,
  scheduleEntryDelay,
  onAnimationComplete,
  testID,
}) => {
  const tw = useTailwind();
  const prefersReducedMotion = useReducedMotion();
  const progress = useSharedValue(eventId ? 0 : 1);
  const contentHeight = useSharedValue(0);
  const [isAnimating, setIsAnimating] = useState(Boolean(eventId));

  const activeEventId = useRef<string | undefined>(undefined);
  const hasStarted = useRef(false);
  const isMeasured = useRef(false);
  const latestProps = useRef({
    scheduleEntryDelay,
    onAnimationComplete,
    prefersReducedMotion,
  });
  latestProps.current = {
    scheduleEntryDelay,
    onAnimationComplete,
    prefersReducedMotion,
  };

  const completeAnimation = useCallback((completedEventId: string) => {
    if (activeEventId.current !== completedEventId) {
      return;
    }
    activeEventId.current = undefined;
    setIsAnimating(false);
    latestProps.current.onAnimationComplete?.(completedEventId);
  }, []);

  const startIfReady = useCallback(() => {
    const animatedEventId = activeEventId.current;
    if (!animatedEventId || hasStarted.current || !isMeasured.current) {
      return;
    }

    hasStarted.current = true;
    const { scheduleEntryDelay: getDelay, prefersReducedMotion: reduced } =
      latestProps.current;

    progress.value = withDelay(
      Math.max(getDelay?.() ?? 0, 0),
      withTiming(
        1,
        {
          duration: reduced
            ? FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS
            : FEED_ITEM_ENTRY_DURATION_MS,
          easing: Easing.linear,
        },
        (finished) => {
          if (finished) {
            scheduleOnRN(completeAnimation, animatedEventId);
          }
        },
      ),
    );
  }, [completeAnimation, progress]);

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height <= 0) {
        return;
      }
      contentHeight.value = height;
      isMeasured.current = true;
      startIfReady();
    },
    [contentHeight, startIfReady],
  );

  useEffect(() => {
    cancelAnimation(progress);

    if (!eventId) {
      activeEventId.current = undefined;
      progress.value = 1;
      setIsAnimating(false);
      return undefined;
    }

    activeEventId.current = eventId;
    hasStarted.current = false;
    progress.value = 0;
    setIsAnimating(true);

    if (isMeasured.current) {
      startIfReady();
    }

    return () => cancelAnimation(progress);
  }, [eventId, progress, startIfReady]);

  // Neutral values when idle: Reanimated keeps the last animated value on the
  // view, so the entrance must end on values that match an unanimated row.
  const clipStyle = useAnimatedStyle(() => ({
    height: isAnimating
      ? entryEasing(progress.value) * contentHeight.value
      : 'auto',
  }));

  const motionStyle = useAnimatedStyle(() => {
    if (!isAnimating) {
      return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
    }

    const time = progress.value;
    const opacity = entryEasing(Math.min(time / OPACITY_KEYFRAME, 1));
    if (prefersReducedMotion) {
      return { opacity, transform: [{ translateY: 0 }, { scale: 1 }] };
    }

    const eased = entryEasing(time);
    return {
      opacity,
      transform: [
        { translateY: ENTRY_TRANSLATE_Y * (1 - eased) },
        { scale: ENTRY_SCALE + (1 - ENTRY_SCALE) * eased },
      ],
    };
  });

  return (
    <Animated.View
      testID={testID}
      style={[isAnimating ? tw.style('overflow-hidden') : undefined, clipStyle]}
    >
      {/* Yoga lays in-flow children out within the collapsed height, which
          would squash the row to 0, so it floats at its natural height and
          the wrapper only clips it. */}
      <Animated.View
        style={[isAnimating ? styles.pinnedToTop : undefined, motionStyle]}
      >
        <View onLayout={handleContentLayout}>{children}</View>
      </Animated.View>
    </Animated.View>
  );
};

export default FeedItemEntryAnimation;

import React, { useEffect, useRef, useState } from 'react';
import Animated, {
  LinearTransition,
  ReduceMotion,
  useReducedMotion,
  withDelay,
  withSpring,
  withTiming,
  type LayoutAnimation,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Knob to slow down the motion for debugging purposes. It's safe to set to any value, because it's only effective in dev as per next line.
const DEBUG_SLOW_MOTION = 1;
const MOTION_MULTIPLIER = __DEV__ ? DEBUG_SLOW_MOTION : 1;

export const FEED_ITEM_ENTRY_DURATION_MS = 500 * MOTION_MULTIPLIER;
export const FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS =
  200 * MOTION_MULTIPLIER;
export const FEED_ITEM_ENTRY_STAGGER_MS = 70 * MOTION_MULTIPLIER;
const LOW_HARDWARE_ROW_TRANSITION_MS = 250 * MOTION_MULTIPLIER;

/** The card is fully opaque well before the spring settles. */
const FADE_SHARE = 0.6;
const ENTRY_TRANSLATE_Y = 20;
const ENTRY_SCALE = 0.97;

const ENTRY_SPRING = {
  duration: FEED_ITEM_ENTRY_DURATION_MS,
  dampingRatio: 1,
};

/** Delays kept per event, so asking twice for one entrance does not stagger it twice. */
const MAX_SCHEDULED_ENTRANCES = 50;

/**
 * Glides the list's rows whenever one changes size or position, including the
 * rows pushed down by an entrance. Runs in the mounting layer, without a Yoga
 * pass per frame.
 */
export const FEED_ROW_LAYOUT_TRANSITION = LinearTransition.springify(
  FEED_ITEM_ENTRY_DURATION_MS,
).dampingRatio(1);
export const FEED_ROW_LAYOUT_TRANSITION_LOW = LinearTransition.springify(
  LOW_HARDWARE_ROW_TRANSITION_MS,
).dampingRatio(1);

/**
 * Returns the delay each new entrance should wait so consecutive starts are
 * at least `staggerMs` apart. Share one scheduler per list.
 */
export const createFeedItemEntryScheduler = (
  staggerMs: number = FEED_ITEM_ENTRY_STAGGER_MS,
  now: () => number = Date.now,
): ((eventId: string) => number) => {
  let nextStartAt = Number.NEGATIVE_INFINITY;
  const delays = new Map<string, number>();

  return (eventId) => {
    const scheduled = delays.get(eventId);
    if (scheduled !== undefined) {
      return scheduled;
    }
    const currentTime = now();
    const startAt = Math.max(currentTime, nextStartAt);
    nextStartAt = startAt + staggerMs;
    const delay = startAt - currentTime;
    delays.set(eventId, delay);
    if (delays.size > MAX_SCHEDULED_ENTRANCES) {
      const oldest = delays.keys().next().value;
      if (oldest !== undefined) {
        delays.delete(oldest);
      }
    }
    return delay;
  };
};

export const createFeedItemEntering = ({
  eventId,
  delayMs,
  reducedMotion,
  onComplete,
}: {
  eventId: string;
  delayMs: number;
  reducedMotion: boolean;
  onComplete: (eventId: string) => void;
}) => {
  const entering = (): LayoutAnimation => {
    'worklet';
    const callback = (finished: boolean) => {
      'worklet';
      if (finished) {
        scheduleOnRN(onComplete, eventId);
      }
    };

    if (reducedMotion) {
      return {
        initialValues: { opacity: 0 },
        animations: {
          opacity: withDelay(
            delayMs,
            withTiming(1, {
              duration: FEED_ITEM_ENTRY_REDUCED_MOTION_DURATION_MS,
              reduceMotion: ReduceMotion.Never,
            }),
          ),
        },
        callback,
      };
    }

    return {
      initialValues: {
        opacity: 0,
        transform: [{ translateY: ENTRY_TRANSLATE_Y }, { scale: ENTRY_SCALE }],
      },
      animations: {
        opacity: withDelay(
          delayMs,
          withTiming(1, {
            duration: FEED_ITEM_ENTRY_DURATION_MS * FADE_SHARE,
          }),
        ),
        transform: [
          { translateY: withDelay(delayMs, withSpring(0, ENTRY_SPRING)) },
          { scale: withDelay(delayMs, withSpring(1, ENTRY_SPRING)) },
        ],
      },
      callback,
    };
  };
  return entering;
};

export interface FeedItemEntryAnimationProps {
  children: React.ReactNode;
  /** Socket event id. A row mounted with one plays the entrance once; omit for cached rows. */
  eventId?: string;
  /** Delay before the entrance starts, used to stagger bursts. */
  scheduleEntryDelay?: (eventId: string) => number;
  onAnimationComplete?: (eventId: string) => void;
  /** Plays the short fade entrance even when the OS asks for full motion. */
  reducedMotion?: boolean;
  testID?: string;
}

/**
 * "Focus In" entrance for rows that arrive over the socket: the row mounts at
 * its full height, fades in, rises 20px and settles from 97% scale. The rows
 * below glide down through the list's `FEED_ROW_LAYOUT_TRANSITION`.
 *
 * Entering animations only run on mount, so a row that is already on screen
 * when it gets an event id never animates; the id is marked played instead,
 * so a later remount does not animate either.
 */
const FeedItemEntryAnimation: React.FC<FeedItemEntryAnimationProps> = ({
  children,
  eventId,
  scheduleEntryDelay,
  onAnimationComplete,
  reducedMotion = false,
  testID,
}) => {
  const systemReducedMotion = useReducedMotion();
  const latestOnComplete = useRef(onAnimationComplete);
  latestOnComplete.current = onAnimationComplete;
  const [mountEventId] = useState(eventId);
  const [entering] = useState(() =>
    mountEventId
      ? createFeedItemEntering({
          eventId: mountEventId,
          delayMs: Math.max(scheduleEntryDelay?.(mountEventId) ?? 0, 0),
          reducedMotion: systemReducedMotion || reducedMotion,
          onComplete: (completedEventId) =>
            latestOnComplete.current?.(completedEventId),
        })
      : undefined,
  );

  useEffect(() => {
    if (eventId && eventId !== mountEventId) {
      latestOnComplete.current?.(eventId);
    }
  }, [eventId, mountEventId]);

  return (
    <Animated.View testID={testID} entering={entering}>
      {children}
    </Animated.View>
  );
};

export default FeedItemEntryAnimation;

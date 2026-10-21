import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
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
export const FEED_ITEM_ENTRY_BLUR_RADIUS = 8;
export const FEED_ITEM_ENTRY_SNAPSHOT_TIMEOUT_MS = 300;

const OPACITY_KEYFRAME = 0.6;
const ENTRY_TRANSLATE_Y = 20;
const ENTRY_SCALE = 0.97;
const SNAPSHOT_CAPTURE_ATTEMPTS = 3;
const SNAPSHOT_RETRY_MS = 16;

const entryEasing = Easing.bezierFn(0.2, 0.8, 0.2, 1);

const toImageUri = (uri: string): string =>
  uri.startsWith('/') ? `file://${uri}` : uri;

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
 * rises 20px, settles from 97% scale and unblurs from 8px while its height
 * opens, so the rows below ease down.
 *
 * React Native only blurs live views on iOS behind an experimental feature
 * flag, so the blur is a pre-blurred snapshot of the row cross-faded out over
 * the sharp row. The snapshot is captured while the entrance is still
 * collapsed and transparent, and is dropped as soon as the entrance ends.
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
  const [snapshotUri, setSnapshotUri] = useState<string>();

  const contentRef = useRef<View>(null);
  const activeEventId = useRef<string | undefined>(undefined);
  const hasStarted = useRef(false);
  const isMeasured = useRef(false);
  const isSnapshotSettled = useRef(false);
  const pendingCapture = useRef<(() => void) | undefined>(undefined);
  const snapshotUriRef = useRef<string | undefined>(undefined);
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

  const clearSnapshot = useCallback(() => {
    const uri = snapshotUriRef.current;
    snapshotUriRef.current = undefined;
    setSnapshotUri(undefined);
    if (uri) {
      releaseCapture(uri);
    }
  }, []);

  const completeAnimation = useCallback(
    (completedEventId: string) => {
      if (activeEventId.current !== completedEventId) {
        return;
      }
      activeEventId.current = undefined;
      setIsAnimating(false);
      clearSnapshot();
      latestProps.current.onAnimationComplete?.(completedEventId);
    },
    [clearSnapshot],
  );

  const startIfReady = useCallback(() => {
    const animatedEventId = activeEventId.current;
    if (
      !animatedEventId ||
      hasStarted.current ||
      !isMeasured.current ||
      !isSnapshotSettled.current
    ) {
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

  const settleSnapshot = useCallback(
    (hasBlur: boolean) => {
      if (isSnapshotSettled.current) {
        return;
      }
      isSnapshotSettled.current = true;
      if (!hasBlur) {
        clearSnapshot();
      }
      startIfReady();
    },
    [clearSnapshot, startIfReady],
  );

  const handleContentLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (height <= 0) {
        return;
      }
      contentHeight.value = height;
      isMeasured.current = true;
      const capture = pendingCapture.current;
      pendingCapture.current = undefined;
      capture?.();
      startIfReady();
    },
    [contentHeight, startIfReady],
  );

  const handleSnapshotLoad = useCallback(
    () => settleSnapshot(true),
    [settleSnapshot],
  );
  const handleSnapshotError = useCallback(
    () => settleSnapshot(false),
    [settleSnapshot],
  );

  useEffect(() => {
    cancelAnimation(progress);

    if (!eventId) {
      activeEventId.current = undefined;
      progress.value = 1;
      setIsAnimating(false);
      clearSnapshot();
      return undefined;
    }

    activeEventId.current = eventId;
    hasStarted.current = false;
    isSnapshotSettled.current = false;
    progress.value = 0;
    setIsAnimating(true);
    clearSnapshot();

    if (latestProps.current.prefersReducedMotion) {
      isSnapshotSettled.current = true;
      startIfReady();
      return () => cancelAnimation(progress);
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const capture = async (attempt: number): Promise<void> => {
      if (cancelled || isSnapshotSettled.current) {
        return;
      }

      const retryOrGiveUp = () => {
        if (attempt + 1 < SNAPSHOT_CAPTURE_ATTEMPTS) {
          retryTimer = setTimeout(() => {
            capture(attempt + 1).catch(() => undefined);
          }, SNAPSHOT_RETRY_MS);
        } else {
          settleSnapshot(false);
        }
      };

      if (!contentRef.current) {
        retryOrGiveUp();
        return;
      }

      try {
        const uri = await captureRef(contentRef.current, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
          useRenderInContext: true,
        });
        if (cancelled || isSnapshotSettled.current) {
          releaseCapture(uri);
          return;
        }
        snapshotUriRef.current = uri;
        setSnapshotUri(uri);
      } catch {
        if (!cancelled) {
          retryOrGiveUp();
        }
      }
    };

    const scheduleCapture = () => {
      retryTimer = setTimeout(() => {
        capture(0).catch(() => undefined);
      }, 0);
    };
    if (isMeasured.current) {
      scheduleCapture();
    } else {
      pendingCapture.current = scheduleCapture;
    }
    const snapshotTimeout = setTimeout(
      () => settleSnapshot(false),
      FEED_ITEM_ENTRY_SNAPSHOT_TIMEOUT_MS,
    );

    return () => {
      cancelled = true;
      pendingCapture.current = undefined;
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      clearTimeout(snapshotTimeout);
      cancelAnimation(progress);
    };
  }, [clearSnapshot, eventId, progress, settleSnapshot, startIfReady]);

  useEffect(() => clearSnapshot, [clearSnapshot]);

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

  const blurOverlayStyle = useAnimatedStyle(() => ({
    height: contentHeight.value,
    opacity: 1 - entryEasing(progress.value),
  }));

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
        {/* An opaque snapshot keeps the cross-fade from dimming the row. */}
        <View
          ref={contentRef}
          collapsable={false}
          onLayout={handleContentLayout}
          style={isAnimating ? tw.style('bg-default') : undefined}
        >
          {children}
        </View>
        {isAnimating && !prefersReducedMotion && snapshotUri ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pinnedToTop, blurOverlayStyle]}
          >
            <Image
              source={{ uri: toImageUri(snapshotUri) }}
              blurRadius={FEED_ITEM_ENTRY_BLUR_RADIUS}
              resizeMode="stretch"
              style={StyleSheet.absoluteFill}
              onLoad={handleSnapshotLoad}
              onError={handleSnapshotError}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
};

export default FeedItemEntryAnimation;

import { useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/** Events older than this render settled — no entrance animation. */
const FRESH_WINDOW_MS = 8_000;

const ENTRANCE_DURATION_MS = 320;

export const isFreshFeedItem = (timestamp: number): boolean =>
  Date.now() - timestamp < FRESH_WINDOW_MS;

/**
 * Slide-down + fade entrance for newly arrived live-feed items. Keyed on the
 * item id so FlashList recycling re-triggers (or skips) the animation when a
 * recycled row is bound to a different event. Stale items (backlog, recycled
 * history) snap straight to the settled state.
 */
export const useFeedItemEntrance = (itemId: string, timestamp: number) => {
  const opacity = useSharedValue(isFreshFeedItem(timestamp) ? 0 : 1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (!isFreshFeedItem(timestamp)) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    opacity.value = 0;
    translateY.value = -14;
    const easing = Easing.out(Easing.cubic);
    opacity.value = withTiming(1, { duration: ENTRANCE_DURATION_MS, easing });
    translateY.value = withTiming(0, {
      duration: ENTRANCE_DURATION_MS,
      easing,
    });
  }, [itemId, timestamp, opacity, translateY]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
};

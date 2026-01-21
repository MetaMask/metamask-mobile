import { useCallback, useRef } from 'react';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import {
  SCROLL_PADDING,
  MAX_RETRIES,
  RETRY_DELAY_MS,
  SCROLL_DELAY_MS,
  emitScrollToMerklRewards,
} from './scrollToMerklRewardsUtils';

/**
 * Hook to handle scrolling to MerklRewards section when navigating from "Claim bonus" CTA
 *
 * @param merklRewardsYInHeaderRef - Ref storing the Y position of MerklRewards relative to header
 * @returns Object with refs and handlers needed by the component
 */
export const useScrollToMerklRewards = (
  merklRewardsYInHeaderRef: React.MutableRefObject<number | null>,
) => {
  const route = useRoute();
  const navigation = useNavigation();
  const hasScrolledRef = useRef(false);

  /**
   * Emits scroll event with calculated scroll position
   * Uses a single setTimeout to ensure UI is ready before scrolling
   * This simplifies testing while maintaining the timing behavior
   */
  const emitScrollEvent = useCallback((scrollY: number) => {
    // Schedule scroll after a delay to ensure FlatList is ready
    // The delay accounts for requestAnimationFrame and InteractionManager timing
    setTimeout(() => {
      emitScrollToMerklRewards(scrollY);
    }, SCROLL_DELAY_MS);
  }, []);

  /**
   * Attempts to scroll to MerklRewards section
   * Retries if layout hasn't been measured yet
   */
  const attemptScroll = useCallback(
    (retryCount = 0) => {
      // Check if we have the Y position
      if (merklRewardsYInHeaderRef.current !== null) {
        // The Y position from onLayout is relative to the header
        // Since the header is the ListHeaderComponent starting at scroll offset 0,
        // the Y position should be the scroll offset (with some padding)
        const scrollY = Math.max(
          0,
          merklRewardsYInHeaderRef.current - SCROLL_PADDING,
        );

        emitScrollEvent(scrollY);
      } else if (retryCount < MAX_RETRIES) {
        // Retry if layout hasn't been measured yet
        setTimeout(() => attemptScroll(retryCount + 1), RETRY_DELAY_MS);
      }
    },
    [merklRewardsYInHeaderRef, emitScrollEvent],
  );

  // Scroll to MerklRewards section when navigating from "Claim bonus" CTA
  useFocusEffect(
    useCallback(() => {
      const scrollToMerklRewards = (
        route.params as { scrollToMerklRewards?: boolean }
      )?.scrollToMerklRewards;

      // Only scroll once per navigation
      if (scrollToMerklRewards && !hasScrolledRef.current) {
        hasScrolledRef.current = true;

        // Clear the param immediately to prevent re-triggering
        navigation.setParams({ scrollToMerklRewards: undefined } as Record<
          string,
          unknown
        >);

        // Start attempting to scroll
        attemptScroll();
      }

      // Reset the scroll flag when component loses focus (user navigates away)
      return () => {
        hasScrolledRef.current = false;
      };
    }, [route.params, navigation, attemptScroll]),
  );

  return {
    hasScrolledRef,
  };
};

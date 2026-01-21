import { useCallback, useRef } from 'react';
import { InteractionManager, DeviceEventEmitter } from 'react-native';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

const SCROLL_PADDING = 350;
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 100;
const SCROLL_DELAY_MS = 150;

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

        // Use requestAnimationFrame for better timing - waits for next paint
        requestAnimationFrame(() => {
          InteractionManager.runAfterInteractions(() => {
            // Small delay to ensure FlatList is ready
            setTimeout(() => {
              DeviceEventEmitter.emit('scrollToMerklRewards', { y: scrollY });
            }, SCROLL_DELAY_MS);
          });
        });
      } else if (retryCount < MAX_RETRIES) {
        // Retry if layout hasn't been measured yet
        setTimeout(() => attemptScroll(retryCount + 1), RETRY_DELAY_MS);
      }
    },
    [merklRewardsYInHeaderRef],
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

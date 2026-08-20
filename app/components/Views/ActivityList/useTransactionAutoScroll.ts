import { useRef, useEffect, useCallback, RefObject } from 'react';
import Logger from '../../../util/Logger';

/**
 * Minimal list ref shape this hook needs. Kept independent of the monitored
 * data type so the watched array (e.g. flat items) and the list ref (e.g. a
 * grouped FlashList) don't have to share a generic.
 */
interface ScrollableListRef {
  scrollToOffset: (params: { offset: number; animated?: boolean }) => void;
}

interface UseTransactionAutoScrollOptions<T> {
  /**
   * Whether auto-scroll is enabled
   */
  enabled?: boolean;
  /**
   * Delay in milliseconds before scrolling (to ensure list has updated)
   */
  delay?: number;
  /**
   * Function to extract a unique ID from an item
   */
  keyExtractor: (item: T) => string | null;
}

/**
 * Custom hook to handle automatic scrolling to top when new transactions are added
 *
 * @param data - Array of items to monitor for changes
 * @param listRef - Reference to the FlashList component
 * @param options - Configuration options
 * @returns Object containing the scroll handler
 */
export function useTransactionAutoScroll<T>(
  data: T[],
  listRef: RefObject<ScrollableListRef | null>,
  options: UseTransactionAutoScrollOptions<T>,
) {
  const { enabled = true, delay = 150, keyExtractor } = options;

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialRenderRef = useRef(true);

  // Track the first item ID to detect when a new item is added to the top
  const previousFirstItemIdRef = useRef<string | null>(null);

  /**
   * Track user scrolling to prevent disruptive auto-scrolls
   */
  const handleScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
  }, []);

  /**
   * Scroll to top when a new item is added
   */
  useEffect(() => {
    // Clear any pending scroll when disabled
    if (!enabled) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      return;
    }

    // Safely extract the first item ID with error handling
    const getCurrentFirstItemId = (): string | null => {
      try {
        if (data.length === 0) return null;
        const firstItem = data[0];
        if (!firstItem) return null;
        return keyExtractor(firstItem);
      } catch (error) {
        // Gracefully handle any unexpected item structure
        Logger.error(
          error as Error,
          'useTransactionAutoScroll: Failed to extract item ID',
        );
        return null;
      }
    };

    const currentFirstItemId = getCurrentFirstItemId();

    // Skip auto-scroll on initial mount
    if (isInitialRenderRef.current) {
      isInitialRenderRef.current = false;
      previousFirstItemIdRef.current = currentFirstItemId;
      return;
    }

    const firstItemChanged =
      previousFirstItemIdRef.current !== null &&
      currentFirstItemId !== null &&
      currentFirstItemId !== previousFirstItemIdRef.current;

    const hasNewItem =
      data.length > 0 && currentFirstItemId !== null && firstItemChanged;

    if (hasNewItem && listRef.current) {
      // Clear any pending scroll
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Small delay to ensure list has updated before scrolling
      scrollTimeoutRef.current = setTimeout(() => {
        // Check user scrolling state when timeout fires, not when scheduled
        if (isUserScrollingRef.current) {
          return;
        }

        try {
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (error) {
          // Silently handle scroll errors (e.g., list not ready)
          Logger.error(
            error as Error,
            'useTransactionAutoScroll: Auto-scroll failed',
          );
        }
      }, delay);
    }

    previousFirstItemIdRef.current = currentFirstItemId;
  }, [data, enabled, delay, keyExtractor, listRef]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    },
    [],
  );

  return { handleScroll };
}

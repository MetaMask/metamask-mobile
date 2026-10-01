import { useCallback } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

export interface UseTokenHeaderScrollResult {
  /** Current vertical scroll offset of the token-details page. */
  scrollY: SharedValue<number>;
  /** JS-thread scroll callback compatible with the existing
   * `onScrollThroughContent` (Transactions list) and `onScroll`
   * (MultichainTransactionsView) call sites. */
  onScroll: (y: number) => void;
}

/**
 * Drives the ASSETS-4016 collapsing token-details nav header.
 *
 * Writes the current scroll offset into a Reanimated `SharedValue` so
 * `TokenDetailsInlineHeader` can derive a cheap, UI-thread opacity /
 * translateY on the compact identity without re-rendering on every
 * scroll frame.
 */
export const useTokenHeaderScroll = (): UseTokenHeaderScrollResult => {
  const scrollY = useSharedValue(0);

  const onScroll = useCallback(
    (y: number) => {
      scrollY.set(y);
    },
    [scrollY],
  );

  return { scrollY, onScroll };
};

// Third party dependencies.
import { useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

// Internal dependencies.
import {
  UseHeaderLeftScrollableOptions,
  UseHeaderLeftScrollableReturn,
} from './HeaderLeftScrollable.types';
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_COLLAPSED_HEIGHT,
} from './HeaderLeftScrollable.constants';

/**
 * Hook for managing HeaderLeftScrollable scroll-linked animations.
 *
 * @param options - Configuration options for the hook.
 * @returns Object containing scroll handler, scrollY value, and header heights.
 *
 * @example
 * ```tsx
 * const { onScroll, scrollY, expandedHeight } = useHeaderLeftScrollable();
 *
 * return (
 *   <View>
 *     <HeaderLeftScrollable scrollY={scrollY} title="Notes" />
 *     <ScrollView
 *       onScroll={onScroll}
 *       scrollEventThrottle={16}
 *       contentContainerStyle={{ paddingTop: expandedHeight }}
 *     >
 *       <Content />
 *     </ScrollView>
 *   </View>
 * );
 * ```
 */
const useHeaderLeftScrollable = (
  options: UseHeaderLeftScrollableOptions = {},
): UseHeaderLeftScrollableReturn => {
  const {
    expandedHeight = DEFAULT_EXPANDED_HEIGHT,
    collapsedHeight = DEFAULT_COLLAPSED_HEIGHT,
    collapseThreshold,
  } = options;

  // Default collapseThreshold to expandedHeight if not provided
  const effectiveCollapseThreshold = collapseThreshold ?? expandedHeight;

  const scrollY = useSharedValue(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.value = event.nativeEvent.contentOffset.y;
    },
    [scrollY],
  );

  return {
    onScroll,
    scrollY,
    headerHeight: expandedHeight,
    expandedHeight,
    collapseThreshold: effectiveCollapseThreshold,
  };
};

export default useHeaderLeftScrollable;


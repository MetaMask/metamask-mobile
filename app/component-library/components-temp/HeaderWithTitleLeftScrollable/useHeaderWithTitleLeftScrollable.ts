// Third party dependencies.
import { useCallback, useState } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

// Internal dependencies.
import {
  UseHeaderWithTitleLeftScrollableOptions,
  UseHeaderWithTitleLeftScrollableReturn,
} from './HeaderWithTitleLeftScrollable.types';
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_COLLAPSED_HEIGHT,
} from './HeaderWithTitleLeftScrollable.constants';

/**
 * Hook for managing HeaderWithTitleLeftScrollable scroll-linked animations.
 *
 * @param options - Configuration options for the hook.
 * @returns Object containing scroll handler, scrollY value, and header heights.
 *
 * @example
 * ```tsx
 * const { onScroll, scrollY, expandedHeight, setExpandedHeight } = useHeaderWithTitleLeftScrollable();
 *
 * return (
 *   <View>
 *     <HeaderWithTitleLeftScrollable
 *       scrollY={scrollY}
 *       title="Notes"
 *       onBack={handleBack}
 *       onExpandedHeightChange={setExpandedHeight}
 *     />
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
const useHeaderWithTitleLeftScrollable = (
  options: UseHeaderWithTitleLeftScrollableOptions = {},
): UseHeaderWithTitleLeftScrollableReturn => {
  const {
    expandedHeight: initialExpandedHeight = DEFAULT_EXPANDED_HEIGHT,
    collapsedHeight = DEFAULT_COLLAPSED_HEIGHT,
    scrollTriggerPosition,
  } = options;

  // Track expanded height - can be updated by component via onExpandedHeightChange
  const [expandedHeight, setExpandedHeight] = useState(initialExpandedHeight);

  // Default scrollTriggerPosition to expandedHeight if not provided
  const effectiveScrollTriggerPosition = scrollTriggerPosition ?? expandedHeight;

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
    setExpandedHeight,
    scrollTriggerPosition: effectiveScrollTriggerPosition,
  };
};

export default useHeaderWithTitleLeftScrollable;


// Third party dependencies.
import { useCallback, useState } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

// Internal dependencies.
import {
  UseHeaderWithTitleLeftScrollableOptions,
  UseHeaderWithTitleLeftScrollableReturn,
} from './HeaderWithTitleLeftScrollable.types';

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
  const { expandedHeight: initialExpandedHeight = 140, scrollTriggerPosition } =
    options;

  // Track expanded height - can be updated by component via onExpandedHeightChange
  const [expandedHeight, setExpandedHeight] = useState(initialExpandedHeight);

  // Default scrollTriggerPosition to expandedHeight if not provided
  const effectiveScrollTriggerPosition =
    scrollTriggerPosition ?? expandedHeight;

  const scrollYValue = useSharedValue(0);

  const onScroll = useCallback(
    (scrollEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYValue.value = scrollEvent.nativeEvent.contentOffset.y;
    },
    [scrollYValue],
  );

  return {
    onScroll,
    scrollY: scrollYValue,
    expandedHeight,
    setExpandedHeight,
    scrollTriggerPosition: effectiveScrollTriggerPosition,
  };
};

export default useHeaderWithTitleLeftScrollable;

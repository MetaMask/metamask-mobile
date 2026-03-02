// Third party dependencies.
import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

// Internal dependencies.
import { UseHeaderStandardAnimatedReturn } from './HeaderStandardAnimated.types';

/**
 * Hook for managing HeaderStandardAnimated scroll-linked animations.
 * Use with HeaderStandardAnimated placed outside the ScrollView as a sibling.
 * Use the returned onScroll with Animated.ScrollView for UI-thread scroll updates (zero lag).
 *
 * @returns Object containing scrollY, titleSectionHeightSv, setTitleSectionHeight, and onScroll.
 *
 * @example
 * ```tsx
 * const { scrollY, onScroll, setTitleSectionHeight, titleSectionHeightSv } =
 *   useHeaderStandardAnimated();
 *
 * <Box twClassName="flex-1">
 *   <HeaderStandardAnimated
 *     scrollY={scrollY}
 *     titleSectionHeight={titleSectionHeightSv}
 *     title="Market"
 *     onBack={handleBack}
 *   />
 *   <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 *     <Box onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}>
 *       <TitleStandard topLabel="Perps" title="ETH-PERP" />
 *     </Box>
 *     {/* page body *\/}
 *   </Animated.ScrollView>
 * </Box>
 * ```
 */
const useHeaderStandardAnimated = (): UseHeaderStandardAnimatedReturn => {
  const scrollYValue = useSharedValue(0);
  const titleSectionHeightSv = useSharedValue(0);

  const setTitleSectionHeight = useCallback(
    (height: number) => {
      titleSectionHeightSv.value = height;
    },
    [titleSectionHeightSv],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (scrollEvent) => {
      scrollYValue.value = scrollEvent.contentOffset.y;
    },
  });

  return {
    scrollY: scrollYValue,
    titleSectionHeightSv,
    setTitleSectionHeight,
    onScroll,
  };
};

export default useHeaderStandardAnimated;

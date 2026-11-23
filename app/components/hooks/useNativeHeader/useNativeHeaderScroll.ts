import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { NATIVE_HEADER_BAR_HEIGHT } from './useNativeHeader';

/**
 * Scroll values for a screen under the native bar or a glass header; pass
 * `onScroll` to an `Animated.ScrollView`. `scrollY` is the raw offset, e.g.
 * for `HeaderStandardAnimated`. `scrollDistance` is measured from the resting
 * top, which under the native bar is minus the bar's inset rather than 0, and
 * drives `NativeHeaderBackdrop` or `HeaderGlass`.
 */
export const useNativeHeaderScroll = (isNativeHeader: boolean) => {
  const insets = useSafeAreaInsets();
  const restingOffset = isNativeHeader
    ? -(insets.top + NATIVE_HEADER_BAR_HEIGHT)
    : 0;
  const scrollY = useSharedValue(0);
  const scrollDistance = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler(
    {
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
        scrollDistance.value = event.contentOffset.y - restingOffset;
      },
    },
    [restingOffset],
  );

  return { scrollY, scrollDistance, onScroll };
};

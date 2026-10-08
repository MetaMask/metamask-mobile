import { useEffect } from 'react';
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SEARCH_ACCESSORY_ANIMATION_DURATION,
  SEARCH_ACCESSORY_CLIPBOARD_WIDTH,
  SEARCH_ACCESSORY_CLEAR_WIDTH,
} from './ExploreSearchBar.constants';

/**
 * Animates the search end accessory between the clipboard and clear buttons.
 */
export const useSearchAccessoryAnimation = (showPastePill: boolean) => {
  const transition = useSharedValue(showPastePill ? 0 : 1);

  useEffect(() => {
    transition.value = withTiming(showPastePill ? 0 : 1, {
      duration: SEARCH_ACCESSORY_ANIMATION_DURATION,
    });
  }, [showPastePill, transition]);

  const containerStyle = useAnimatedStyle(() => ({
    width: interpolate(
      transition.value,
      [0, 1],
      [SEARCH_ACCESSORY_CLIPBOARD_WIDTH, SEARCH_ACCESSORY_CLEAR_WIDTH],
    ),
  }));
  const clipboardStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 0.65, 1], [1, 1, 0]),
    transform: [
      {
        scale: interpolate(transition.value, [0, 1], [1, 0.65]),
      },
    ],
  }));
  const clearStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 0.35, 1], [0, 0, 1]),
    transform: [
      {
        scale: interpolate(transition.value, [0, 1], [0.65, 1]),
      },
    ],
  }));

  return { containerStyle, clipboardStyle, clearStyle };
};

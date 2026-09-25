import { useEffect } from 'react';
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  SEARCH_ACCESSORY_ANIMATION_DURATION,
  SEARCH_ACCESSORY_CLEAR_WIDTH,
  SEARCH_ACCESSORY_PASTE_WIDTH,
} from './ExploreSearchBar.constants';

/**
 * Animates the search end accessory between the paste pill and clear button.
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
      [SEARCH_ACCESSORY_PASTE_WIDTH, SEARCH_ACCESSORY_CLEAR_WIDTH],
    ),
  }));
  const pasteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 0.65, 1], [1, 1, 0]),
    transform: [
      {
        scaleX: interpolate(transition.value, [0, 0.65, 1], [1, 0.65, 0.2]),
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

  return { containerStyle, pasteStyle, clearStyle };
};

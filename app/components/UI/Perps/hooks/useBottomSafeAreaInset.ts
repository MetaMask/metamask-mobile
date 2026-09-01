import { useWindowDimensions } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

/**
 * Returns the bottom safe-area inset in density-independent pixels.
 *
 * On Android `useSafeAreaInsets().bottom` reports 0 even when a system
 * navigation bar (gesture pill or three-button bar) is occupying the bottom of
 * the screen, so screens that pin content to `bottom: 0` end up drawing their
 * padding underneath it. The safe-area frame does account for the navigation
 * bar, so the gap between the frame and the window is used as the fallback.
 *
 * @returns The bottom inset to reserve for the system navigation bar.
 */
export const useBottomSafeAreaInset = (): number => {
  const insets = useSafeAreaInsets();
  const frame = useSafeAreaFrame();
  const windowDimensions = useWindowDimensions();

  if (insets.bottom > 0) {
    return insets.bottom;
  }

  const frameDerivedInset = windowDimensions.height - (frame.y + frame.height);

  return frameDerivedInset > 0 ? frameDerivedInset : 0;
};

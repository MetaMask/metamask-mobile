import { useWindowDimensions } from 'react-native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// Three-button navigation bars are 48dp; the ceiling leaves room for OEM skins
// while staying well below any keyboard height.
const MAX_NAVIGATION_BAR_INSET = 64;

/**
 * Returns the bottom safe-area inset in density-independent pixels.
 *
 * On Android `useSafeAreaInsets().bottom` reports 0 even when a system
 * navigation bar (gesture pill or three-button bar) is occupying the bottom of
 * the screen, so screens that pin content to `bottom: 0` end up drawing their
 * padding underneath it. The safe-area frame does account for the navigation
 * bar, so the gap between the frame and the window is used as the fallback.
 *
 * The fallback is capped: the activity uses `adjustResize`, so an open keyboard
 * shrinks the frame without shrinking the window, and the raw gap would then be
 * the keyboard height rather than a navigation bar.
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

  if (frameDerivedInset <= 0) {
    return 0;
  }

  return Math.min(frameDerivedInset, MAX_NAVIGATION_BAR_INSET);
};

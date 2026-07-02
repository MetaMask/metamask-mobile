import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Transparent native stack with no transition animation; used for modal-style flows.
 * Use with `createNativeStackNavigator` only (`contentStyle` / `animation`, not `cardStyle` / `animationEnabled`).
 *
 * Includes `animation: 'none'` — omit this preset on screens where you want the default push/modal animation.
 */
export const clearNativeStackNavigatorOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: 'transparent',
  },
  animation: 'none',
};

/**
 * Per-screen options for overlay-style screens on native stack.
 * Replaces the JS-stack `cardStyleInterpolator` trick (overlay opacity 0) — native stack keeps the
 * presenting screen mounted and does not dim it when `presentation: 'transparentModal'` is used.
 *
 * Often spread **after** {@link clearNativeStackNavigatorOptions} for fully static overlays.
 * Skip `clearNativeStackNavigatorOptions` when this screen should keep the default stack animation
 * (it sets `animation: 'none'`).
 */
export const transparentModalScreenOptions: NativeStackNavigationOptions = {
  presentation: 'transparentModal',
};

export const slideFromRightNativeOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
};

export const fadeNativeOptions: NativeStackNavigationOptions = {
  animation: 'fade',
  gestureEnabled: false,
};

/**
 * Native-stack counterpart to JS-stack `TransitionPresets.ModalSlideFromBottomIOS`.
 * Use default card presentation (not `modal` sheet or `fullScreenModal`) so content
 * stays full-screen while safe-area / HeaderStandard includesTopInset still work.
 */
export const fullScreenModalSlideFromBottomNativeOptions: NativeStackNavigationOptions =
  {
    animation: 'slide_from_bottom',
    headerShown: false,
  };

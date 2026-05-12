import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { StackNavigationOptions } from '@react-navigation/stack';

/** Transparent stack with no transition animation; used for modal-style flows. */
export const clearStackNavigatorOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyle: {
    backgroundColor: 'transparent',
  },
  animationEnabled: false,
};
/** Transparent stack with no transition animation; used for modal-style flows. */
export const clearStackNavigatorOptionsWithTransitionAnimation: StackNavigationOptions =
  {
    headerShown: false,
    cardStyle: {
      backgroundColor: 'transparent',
    },
    cardStyleInterpolator: () => ({
      overlayStyle: {
        opacity: 0,
      },
    }),
    animationEnabled: false,
  };

/**
 * Native-stack counterpart to {@link clearStackNavigatorOptions}.
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

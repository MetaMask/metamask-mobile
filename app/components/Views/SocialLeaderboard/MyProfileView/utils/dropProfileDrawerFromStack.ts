import type { NavigationState } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

/**
 * Removes the Profile drawer from the stack beneath the focused screen.
 *
 * The drawer opens the profile with `navigate`, so the profile sits on top of
 * it. Header back, the iOS edge swipe, and Android hardware back all pop one
 * screen, which would reveal the drawer again. Dropping the drawer entry leaves
 * Home directly beneath the profile, so every back affordance returns to the tab
 * the drawer was opened from.
 *
 * Entries keep their `key` and nested `state`: resetting a retained route
 * without its key tears down the native screen, and dropping the tab
 * navigator's nested state remounts it on its initial tab.
 *
 * Returns `undefined` when the drawer is not in the stack (the profile was
 * opened from Social, not from the drawer) or when removing it would leave the
 * navigator with nothing to render.
 */
export const dropProfileDrawerFromStack = (
  state: NavigationState | undefined,
): NavigationState | undefined => {
  if (!state) {
    return undefined;
  }

  const remainingRoutes = state.routes.filter(
    (route) => route.name !== Routes.SOCIAL_PROFILE.DRAWER,
  );

  // Nothing to drop, or the drawer is the only entry — resetting to an empty
  // history would leave the navigator with no screen to render.
  if (
    remainingRoutes.length === state.routes.length ||
    remainingRoutes.length === 0
  ) {
    return undefined;
  }

  // Keep the user on the screen they are looking at: its position shifts when
  // an earlier route is removed.
  const focusedKey = state.routes[state.index]?.key;
  const focusedIndex = remainingRoutes.findIndex(
    (route) => route.key === focusedKey,
  );

  return {
    ...state,
    routes: remainingRoutes,
    index: focusedIndex >= 0 ? focusedIndex : remainingRoutes.length - 1,
  };
};

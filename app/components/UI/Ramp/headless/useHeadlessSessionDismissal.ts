import { useEffect, useRef } from 'react';
import {
  useNavigation,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';

import Routes from '../../../../constants/navigation/Routes';
import { closeSession, getSession } from './sessionRegistry';

/**
 * Fires `onClose({ reason: 'user_dismissed' })` for a headless session when
 * the host screen unmounts without the session having terminated through
 * any other path.
 *
 * Termination paths that run before unmount remove the session from the
 * registry, so the cleanup re-reads `getSession(id)` and no-ops:
 *
 * - Phase 6 success — `closeSession({ reason: 'completed' })`
 * - Phase 7 errors — `failSession` → `closeSession({ reason: 'unknown' })`
 * - Phase 5 single-live-session restart — `closeSession({ reason: 'consumer_cancelled' })`
 * - Consumer `cancel()` — same
 * - `handleBack` (this PR) — fires `closeSession({ reason: 'user_dismissed' })` synchronously before `goBack`, so the cleanup that follows the unmount is also a no-op.
 *
 * Stack-rebuild guard: `useTransakRouting` uses `navigation.reset` (not push)
 * to open Checkout, BasicInfo, KycWebview, etc. with HEADLESS_HOST re-pinned
 * at the stack base. `navigation.reset` swaps the navigator's route keys, so
 * the original HEADLESS_HOST instance unmounts even though logically the user
 * is still inside the headless flow. Treating that as `user_dismissed` would
 * close the session mid-flow and break Phase 6 / Phase 7 callbacks.
 *
 * To distinguish a real dismissal from a stack rebuild, the cleanup inspects
 * the navigator's current state after unmount: if HEADLESS_HOST is still in
 * the route list, this is a rebuild and we skip the close. Otherwise the
 * user has unwound the entire headless stack and we fire `user_dismissed` as
 * before.
 *
 * Wire this into the screen that acts as the stack base for the headless
 * flow (today: `HeadlessHost`).
 */
export function useHeadlessSessionDismissal(
  headlessSessionId: string | undefined,
): void {
  const navigation = useNavigation();
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  useEffect(
    () => () => {
      const session = getSession(headlessSessionId);
      if (!session) {
        return;
      }

      if (isHeadlessHostStillInNavigator(navigationRef.current)) {
        return;
      }

      closeSession(headlessSessionId, { reason: 'user_dismissed' });
    },
    [headlessSessionId],
  );
}

interface NavigatorLike {
  getState: () => NavigationState | PartialState<NavigationState> | undefined;
}

/**
 * Returns true if any route in the navigator's current state (or its nested
 * states) is named `HEADLESS_HOST`. Used by the dismissal cleanup to detect
 * stack rebuilds (`navigation.reset` keeping HEADLESS_HOST as the base)
 * versus genuine user dismissal (HEADLESS_HOST gone from the navigator).
 *
 * Wrapped in try/catch because after unmount the navigator may be torn down
 * — in which case treating the absence as "user left" is the safe default.
 */
function isHeadlessHostStillInNavigator(
  nav: NavigatorLike | undefined,
): boolean {
  try {
    const state = nav?.getState();
    return state ? routeStateContainsHeadlessHost(state) : false;
  } catch {
    return false;
  }
}

function routeStateContainsHeadlessHost(
  state: NavigationState | PartialState<NavigationState>,
): boolean {
  const routes = state.routes ?? [];
  for (const route of routes) {
    if (route?.name === Routes.RAMP.HEADLESS_HOST) {
      return true;
    }
    if (route?.state && routeStateContainsHeadlessHost(route.state)) {
      return true;
    }
  }
  return false;
}

export default useHeadlessSessionDismissal;

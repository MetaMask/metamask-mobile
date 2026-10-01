import { StackActions } from '@react-navigation/native';
import { InteractionManager } from 'react-native';
import { checkForDeeplink } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import { decideRouteRestore } from '../../../util/navigation/routeRestoration';
import { trackRouteRestoreEvaluated } from '../../../util/analytics/routeRestoreTracking';
import { selectRouteRestorationSettings } from '../../../selectors/featureFlagController/routeRestoration';
import {
  getWalletLockExpiredRoute,
  getWalletLockedAt,
  setWalletLockedAt,
} from '../../../util/navigation/walletLockClock';
import { cancelRestoreWindowExpiry } from '../../../util/navigation/restoreWindowExpiry';
import { setWalletLocked } from '../../WalletLockLifecycle';
import AppConstants from '../../AppConstants';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import Logger from '../../../util/Logger';
import NavigationService from '../../NavigationService';
import ReduxService from '../../redux';
import SharedDeeplinkManager from '../DeeplinkManager';
import {
  executeDeeplinkIntent,
  executeStartupDeeplinkIntent,
} from './executeDeeplinkIntent';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';
import { findParentNavigatorContainingRoute } from '../../../util/navigation/prepareWalletLockOverlay';
import {
  cancelDeeplinkNavigatedTrace,
  cancelDeeplinkProcessedTrace,
  startDeeplinkNavigatedTrace,
  type DeeplinkPerfAppStartType,
} from '../../Performance/DeeplinkPerformance';
import {
  clearUnlockAppStartType,
  getUnlockAppStartType,
} from '../../Performance/unlockTraces';

// Set before the fallback parse so consumeNextParseAppStartType stamps it with
// the unlock-session app_start_type. Cleared after one read.
let nextParseIsUnlockSession = false;

export const markNextParseAsUnlockSession = () => {
  nextParseIsUnlockSession = true;
};

/** Returns the unlock-session start type once after a leftover startup parse. */
export const consumeNextParseAppStartType = ():
  | DeeplinkPerfAppStartType
  | undefined => {
  if (!nextParseIsUnlockSession) {
    return undefined;
  }
  nextParseIsUnlockSession = false;
  const appStartType = getUnlockAppStartType();
  clearUnlockAppStartType();
  return appStartType;
};

export const resetNextParseAppStartTypeForTesting = () => {
  nextParseIsUnlockSession = false;
};

const scheduleAfterNavigation = (callback: () => void) => {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
    return;
  }

  setTimeout(callback, 0);
};

/**
 * Lets a Home `reset` commit and paint under the lock cover before the flag
 * drops; clearing lock in the same turn shows the old screen tearing down.
 */
const waitForResetToSettle = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });

/**
 * In-session lock keeps `HomeNav` mounted under LockScreen / Login. The startup
 * reset builds navigator state by hand for a tree that does not exist yet;
 * on a live tree it can name a tab that this build does not register (for
 * example `RewardsView` when the Social tab takes its slot), and React
 * Navigation drops the unknown route and lands on Wallet. Navigating on the
 * mounted tree is the same path a deeplink takes when the app is already
 * unlocked.
 */
const executeDeeplinkIntentOnMountedTree = async (
  intent: DeeplinkIntent,
): Promise<boolean> => {
  const navigation = NavigationService.navigation;
  if (!navigation) {
    return false;
  }
  // Dismiss a root sheet that was open at lock so the target is reachable.
  navigation.dispatch(StackActions.popTo(Routes.ONBOARDING.HOME_NAV));
  await executeDeeplinkIntent(intent);
  return true;
};

const hasMountedSessionTree = (): boolean =>
  Boolean(
    findParentNavigatorContainingRoute(
      NavigationService.navigation?.getRootState(),
      Routes.ONBOARDING.HOME_NAV,
    ),
  );

export const navigateToPendingStartupDeeplink = async (): Promise<boolean> => {
  const deeplink = AppStateEventProcessor.pendingDeeplink;
  if (!deeplink) {
    clearUnlockAppStartType();
    return false;
  }

  const origin =
    AppStateEventProcessor.pendingDeeplinkSource ??
    AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
  const appStartType = getUnlockAppStartType();

  // Saga-driven biometric auto-unlock reaches here without passing through an
  // unlock screen; the in-flight guard makes this a no-op when Login or OAuth
  // rehydration already started the span at submit.
  startDeeplinkNavigatedTrace({
    url: deeplink,
    source: 'unlock',
    appStartType,
  });

  try {
    const intent = await SharedDeeplinkManager.resolve(deeplink, {
      origin,
      appStartType,
    });
    if (intent === false) {
      // The startup resolve pass already showed the interstitial and the user
      // rejected it. Clear the pending link so the Home fallback does not
      // redispatch the same deeplink and show the interstitial again.
      AppStateEventProcessor.clearPendingDeeplink();
      clearUnlockAppStartType();
      return false;
    }

    if (!intent) {
      return false;
    }

    const handled = hasMountedSessionTree()
      ? await executeDeeplinkIntentOnMountedTree(intent)
      : await executeStartupDeeplinkIntent(intent);
    if (handled) {
      AppStateEventProcessor.clearPendingDeeplink();
      clearUnlockAppStartType();
    }

    return handled;
  } catch (error) {
    cancelDeeplinkProcessedTrace({ reason: 'error' });
    cancelDeeplinkNavigatedTrace({ reason: 'error' });
    // Keep pending and the unlock-session app_start_type: Home will retry via
    // parse, which still needs that type.
    Logger.error(
      error as Error,
      'DeeplinkManager: failed to navigate to pending startup deeplink',
    );
    return false;
  }
};

export const retryPendingDeeplinkAfterDefaultNavigation = () => {
  if (!AppStateEventProcessor.pendingDeeplink) {
    return;
  }

  markNextParseAsUnlockSession();
  scheduleAfterNavigation(() => {
    ReduxService.store.dispatch(checkForDeeplink());
  });
};

export const navigateToPostUnlockHome = async (): Promise<void> => {
  // Unlock owns navigation from here; a late expiry must not reset under it.
  cancelRestoreWindowExpiry();

  // An external deeplink is fresh, explicit intent and outranks any restore.
  const handledStartupDeeplink = await navigateToPendingStartupDeeplink();
  if (handledStartupDeeplink) {
    setWalletLockedAt(null);
    setWalletLocked(false);
    return;
  }

  const navigation = NavigationService.navigation;
  const lockedAt = getWalletLockedAt();
  // Set when the window expired behind the lock cover: the tree is already a
  // fresh Home, and this is the screen the user actually abandoned.
  const expiredRoute = getWalletLockExpiredRoute();
  const settings = selectRouteRestorationSettings(
    ReduxService.store.getState(),
  );
  const decision = decideRouteRestore({
    rootState: navigation?.getRootState(),
    lockedAt,
    enabled: settings.enabled,
    restoreWindowMs: settings.restoreWindowMs,
  });

  // `no_tree` is cold start, manual lock and logout — no restore was possible,
  // so counting them would dilute the denominator.
  if (decision.restore || decision.reason !== 'no_tree') {
    trackRouteRestoreEvaluated(
      !decision.restore && expiredRoute !== null
        ? { ...decision, route: expiredRoute }
        : decision,
      lockedAt === null ? null : Date.now() - lockedAt,
    );
  }

  if (decision.restore && navigation) {
    // Tree stayed mounted under LockScreen / Login (keep exact screen).
    // popTo HomeNav pops those covers and dismisses a root sheet that was
    // open at lock. Clearing isWalletLocked ends the locked session.
    navigation.dispatch(StackActions.popTo(Routes.ONBOARDING.HOME_NAV));
  } else if (expiredRoute === null) {
    NavigationService.navigation?.reset({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
    // Still under the lock cover: let Home paint before revealing it.
    await waitForResetToSettle();
  }
  // else: expiry already reset to Home behind the cover; clearing the flag
  // below reveals it without mounting Home a second time.

  setWalletLockedAt(null);
  setWalletLocked(false);
  retryPendingDeeplinkAfterDefaultNavigation();
};

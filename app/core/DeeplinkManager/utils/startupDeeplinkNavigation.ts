import { StackActions } from '@react-navigation/native';
import { checkForDeeplink } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import { decideRouteRestore } from '../../../util/navigation/routeRestoration';
import { trackRouteRestoreEvaluated } from '../../../util/analytics/routeRestoreTracking';
import { selectRouteRestorationEnabled } from '../../../selectors/featureFlagController/routeRestoration';
import AppConstants from '../../AppConstants';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import Logger from '../../../util/Logger';
import NavigationService from '../../NavigationService';
import ReduxService from '../../redux';
import SharedDeeplinkManager from '../DeeplinkManager';
import { executeStartupDeeplinkIntent } from './executeDeeplinkIntent';
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

    const handled = await executeStartupDeeplinkIntent(intent);
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
  // An external deeplink is fresh, explicit intent and outranks any restore.
  const handledStartupDeeplink = await navigateToPendingStartupDeeplink();
  if (handledStartupDeeplink) {
    return;
  }

  const navigation = NavigationService.navigation;
  const backgroundedAt = AppStateEventProcessor.lastBackgroundedAt;
  const decision = decideRouteRestore({
    rootState: navigation?.getRootState(),
    backgroundedAt,
    enabled: selectRouteRestorationEnabled(ReduxService.store.getState()),
  });

  // `no_tree` is cold start, manual lock and logout — no restore was possible,
  // so counting them would dilute the denominator.
  if (decision.restore || decision.reason !== 'no_tree') {
    trackRouteRestoreEvaluated(
      decision,
      backgroundedAt === null ? null : Date.now() - backgroundedAt,
    );
  }

  if (decision.restore && navigation) {
    // The screens are still mounted beneath the lock and login screens, so
    // removing those reveals them with their route keys — and their component
    // state — untouched.
    navigation.dispatch(StackActions.popTo(Routes.ONBOARDING.HOME_NAV));

    if (!decision.exact) {
      // The user was deeper than a top-level route, so trim their section's
      // stack back to its home. That screen is still mounted, so it keeps its
      // scroll position rather than rebuilding.
      navigation.dispatch(StackActions.popTo(decision.route));
    }
  } else {
    NavigationService.navigation?.reset({
      routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
    });
  }

  retryPendingDeeplinkAfterDefaultNavigation();
};

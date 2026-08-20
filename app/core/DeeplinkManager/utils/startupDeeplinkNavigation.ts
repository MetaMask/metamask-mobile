import { checkForDeeplink } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
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
  clearUnlockDeeplinkAppStartType,
  getUnlockDeeplinkAppStartType,
} from '../../Performance/unlockDeeplinkTraces';

/**
 * When startup `resolve` yields no intent, Home resets and the saga `parse`s.
 * Carry the unlock-session `app_start_type` onto that parse.
 */
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
  const appStartType = getUnlockDeeplinkAppStartType();
  clearUnlockDeeplinkAppStartType();
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
    clearUnlockDeeplinkAppStartType();
    return false;
  }

  const origin =
    AppStateEventProcessor.pendingDeeplinkSource ??
    AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;
  const appStartType = getUnlockDeeplinkAppStartType();

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
      clearUnlockDeeplinkAppStartType();
      return false;
    }

    if (!intent) {
      return false;
    }

    const handled = await executeStartupDeeplinkIntent(intent);
    if (handled) {
      AppStateEventProcessor.clearPendingDeeplink();
      clearUnlockDeeplinkAppStartType();
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
  const handledStartupDeeplink = await navigateToPendingStartupDeeplink();
  if (handledStartupDeeplink) {
    return;
  }

  NavigationService.navigation?.reset({
    routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
  });

  retryPendingDeeplinkAfterDefaultNavigation();
};

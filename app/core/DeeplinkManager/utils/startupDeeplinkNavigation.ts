import { checkForDeeplink } from '../../../actions/user';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../AppConstants';
import { AppStateEventProcessor } from '../../AppStateEventListener';
import Logger from '../../../util/Logger';
import NavigationService from '../../NavigationService';
import ReduxService from '../../redux';
import SharedDeeplinkManager from '../DeeplinkManager';
import { executeStartupDeeplinkIntent } from './executeDeeplinkIntent';

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
    return false;
  }

  const origin =
    AppStateEventProcessor.pendingDeeplinkSource ??
    AppConstants.DEEPLINKS.ORIGIN_DEEPLINK;

  try {
    const intent = await SharedDeeplinkManager.resolve(deeplink, { origin });
    if (intent === false) {
      // The startup resolve pass already showed the interstitial and the user
      // rejected it. Clear the pending link so the Home fallback does not
      // redispatch the same deeplink and show the interstitial again.
      AppStateEventProcessor.clearPendingDeeplink();
      return false;
    }

    if (!intent) {
      return false;
    }

    const handled = await executeStartupDeeplinkIntent(intent);
    if (handled) {
      AppStateEventProcessor.clearPendingDeeplink();
    }

    return handled;
  } catch (error) {
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

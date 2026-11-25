import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsCardAuthenticated,
  selectHasCard,
} from '../../../../selectors/cardController';
import { switchToLinkedCardAccount } from './switchToLinkedCardAccount';

/**
 * Card onboarding deeplink handler
 *
 * This handler navigates users to the appropriate Card entry point based on their
 * authentication state and whether they have a card-linked account.
 *
 * Analytics tracking is handled at the handleUniversalLink level using the standard
 * DEEP_LINK_USED event - this handler only handles navigation and business logic.
 *
 * Behavior:
 * - User is logged in: Navigate to Card Home and show a toast notification
 * - User is not logged in but has a stored card link: Switch to that account and
 * navigate to Card login
 * - User is not logged in and has no card link: Remain in current account and
 * navigate to Card Welcome/onboarding screen
 *
 * Supported URL formats:
 * - https://link.metamask.io/card-onboarding
 * - https://metamask.app.link/card-onboarding
 */
export const handleCardOnboarding = () => {
  DevLogger.log(
    '[handleCardOnboarding] Starting card onboarding deeplink handling',
  );

  try {
    const state = ReduxService.store.getState();
    const isAuthenticated = selectIsCardAuthenticated(state);
    const hasCard = selectHasCard(state);

    if (isAuthenticated || hasCard) {
      const openCard = () =>
        isAuthenticated
          ? navigateToCardHomeWithToast()
          : navigateToCardAuthentication();
      DevLogger.log(
        isAuthenticated
          ? '[handleCardOnboarding] Navigating to Card Home'
          : '[handleCardOnboarding] Navigating to Card login',
      );
      if (!isAuthenticated && hasCard) {
        switchToLinkedCardAccount().then(openCard, openCard);
      } else {
        openCard();
      }
    } else {
      // User is not logged in AND has no card-linked account
      // Navigate to Card Welcome/onboarding screen
      DevLogger.log(
        '[handleCardOnboarding] Navigating to Card Welcome (onboarding)',
      );
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
    }

    Logger.log(
      '[handleCardOnboarding] Card onboarding deeplink handled successfully',
    );
  } catch (error) {
    DevLogger.log('[handleCardOnboarding] Failed to handle deeplink:', error);
    Logger.error(
      error as Error,
      '[handleCardOnboarding] Error handling card onboarding deeplink',
    );

    // Fallback: Navigate to Card Welcome screen
    try {
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleCardOnboarding] Failed to navigate to fallback screen',
      );
    }
  }
};

function navigateToCardHomeWithToast(): void {
  setTimeout(() => {
    NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: {
        screen: Routes.CARD.HOME,
        params: {
          showDeeplinkToast: true,
        },
      },
    });
  }, 500);
}

function navigateToCardAuthentication(): void {
  setTimeout(() => {
    NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: {
        screen: Routes.CARD.AUTHENTICATION,
      },
    });
  }, 500);
}

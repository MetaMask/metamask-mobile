import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../Engine';
import {
  selectIsCardAuthenticated,
  selectHasCard,
} from '../../../../selectors/cardController';
import { switchToLinkedCardAccount } from './switchToLinkedCardAccount';
import { selectInternalAccounts } from '../../../../selectors/accountsController';

export interface CardHomeDeeplinkParams {
  /** Paid-out cashback amount from a push; plays the payout celebration. */
  cashbackPayoutAmount?: string;
}

/**
 * Card home deeplink handler
 *
 * This handler navigates users to the appropriate Card entry point based on their
 * authentication state and whether they have a card-linked account.
 *
 * Analytics tracking is handled at the handleUniversalLink level using the standard
 * DEEP_LINK_USED event - this handler only handles navigation and business logic.
 *
 * Behavior:
 * - User is logged in: Navigate directly to Card Home for the currently selected account
 * - User is not logged in but has a stored card link: Switch to the linked
 * account and navigate to Card login
 * - User is not logged in and has no card link: Remain in current account and
 * navigate to Card Welcome/onboarding screen
 *
 * Error fallback:
 * - Switch to first account
 * - Navigate to Card Welcome screen
 *
 * Supported URL formats:
 * - https://link.metamask.io/card-home
 * - https://metamask.app.link/card-home
 *
 * `cardHomeParams` are passed to Card Home when the user is signed in (e.g.
 * `cashbackPayoutAmount` from a "cashback paid out" push plays the payout
 * celebration).
 */
export const handleCardHome = (cardHomeParams?: CardHomeDeeplinkParams) => {
  DevLogger.log('[handleCardHome] Starting card home deeplink handling');

  try {
    const state = ReduxService.store.getState();
    const isAuthenticated = selectIsCardAuthenticated(state);
    const hasCard = selectHasCard(state);

    if (isAuthenticated || hasCard) {
      DevLogger.log(
        isAuthenticated
          ? '[handleCardHome] Navigating to Card Home'
          : '[handleCardHome] Navigating to Card login',
      );
      const openCard = () =>
        navigateToCardEntry(isAuthenticated, cardHomeParams);
      if (!isAuthenticated && hasCard) {
        switchToLinkedCardAccount().then(openCard, openCard);
      } else {
        openCard();
      }
    } else {
      DevLogger.log(
        '[handleCardHome] User not authenticated and no card-linked account, navigating to Card Welcome',
      );
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
    }

    Logger.log('[handleCardHome] Card home deeplink handled successfully');
  } catch (error) {
    DevLogger.log('[handleCardHome] Failed to handle deeplink:', error);
    Logger.error(
      error as Error,
      '[handleCardHome] Error handling card home deeplink',
    );

    try {
      const state = ReduxService.store.getState();
      const internalAccounts = selectInternalAccounts(state);
      if (internalAccounts.length > 0) {
        const firstAccountAddress = internalAccounts[0].address;
        DevLogger.log(
          '[handleCardHome] Fallback: Switching to first account:',
          firstAccountAddress,
        );
        Engine.setSelectedAddress(firstAccountAddress);
      }
    } catch (fallbackSwitchError) {
      DevLogger.log(
        '[handleCardHome] Failed to switch to first account during fallback:',
        fallbackSwitchError,
      );
    }

    try {
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleCardHome] Failed to navigate to fallback screen',
      );
    }
  }
};

function navigateToCardEntry(
  isAuthenticated: boolean,
  cardHomeParams?: CardHomeDeeplinkParams,
): void {
  setTimeout(() => {
    NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: {
        screen: isAuthenticated ? Routes.CARD.HOME : Routes.CARD.AUTHENTICATION,
        ...(isAuthenticated && cardHomeParams
          ? { params: cardHomeParams }
          : {}),
      },
    });
  }, 500);
}

import DevLogger from '../../../SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../Engine';
import {
  selectCardholderAccounts,
  selectIsAuthenticatedCard,
  selectCardGeoLocation,
  setAlwaysShowCardButton,
} from '../../../redux/slices/card';
import { MetaMetricsEvents } from '../../../Analytics';
import { analytics } from '../../../../util/analytics/analytics';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { CardDeeplinkActions } from '../../../../components/UI/Card/util/metrics';
import { selectInternalAccounts } from '../../../../selectors/accountsController';

/**
 * Destination screens for card home deeplink
 */
enum CardDeeplinkDestination {
  CARD_HOME = 'CARD_HOME',
  CARD_WELCOME = 'CARD_WELCOME',
}

/**
 * Card home deeplink handler
 *
 * This handler navigates users to the appropriate Card entry point based on their
 * authentication state and whether they have a card-linked account.
 *
 * Behavior:
 * - User is logged in: Navigate directly to Card Home for the currently selected account
 * - User is not logged in but has a card-linked account: Auto-switch to first card-linked
 * account and navigate to Card Home
 * - User is not logged in and has no card-linked account: Remain in current account and
 * navigate to Card Welcome/onboarding screen
 *
 * Error fallback:
 * - Switch to first account
 * - Navigate to Card Welcome screen
 * - Log error event with deeplink source
 *
 * Supported URL formats:
 * - https://link.metamask.io/card-home
 * - https://metamask.app.link/card-home
 */
export const handleCardHome = () => {
  DevLogger.log('[handleCardHome] Starting card home deeplink handling');

  let isAuthenticated = false;
  let hasCardLinkedAccount = false;
  let destination: CardDeeplinkDestination;

  try {
    const state = ReduxService.store.getState();
    const cardholderAccounts = selectCardholderAccounts(state);
    isAuthenticated = selectIsAuthenticatedCard(state);
    hasCardLinkedAccount = cardholderAccounts.length > 0;
    const cardGeoLocation = selectCardGeoLocation(state);
    const isCardExperimentalSwitchEnabled = selectCardExperimentalSwitch(state);
    const displayCardButtonFeatureFlag =
      selectDisplayCardButtonFeatureFlag(state);
    const cardSupportedCountries = selectCardSupportedCountries(
      state,
    ) as Record<string, boolean>;
    const shouldCardBeEnabled =
      isCardExperimentalSwitchEnabled ||
      (cardSupportedCountries?.[cardGeoLocation as string] === true &&
        displayCardButtonFeatureFlag);

    if (!shouldCardBeEnabled) {
      DevLogger.log('[handleCardHome] Card is not enabled, skipping');
      return;
    }

    ReduxService.store.dispatch(setAlwaysShowCardButton(true));
    DevLogger.log('[handleCardHome] Successfully enabled card button');

    if (isAuthenticated || hasCardLinkedAccount) {
      if (hasCardLinkedAccount && !isAuthenticated) {
        const firstCardholderAddress = cardholderAccounts[0];
        DevLogger.log(
          '[handleCardHome] Switching to first cardholder account:',
          firstCardholderAddress,
        );

        try {
          Engine.setSelectedAddress(firstCardholderAddress);
          DevLogger.log(
            '[handleCardHome] Successfully switched to cardholder account',
          );
        } catch (switchError) {
          DevLogger.log(
            '[handleCardHome] Error switching account:',
            switchError,
          );
          Logger.error(
            switchError as Error,
            '[handleCardHome] Failed to switch to cardholder account',
          );
        }
      }

      destination = CardDeeplinkDestination.CARD_HOME;
      DevLogger.log('[handleCardHome] Navigating to Card Home');
      navigateToCardHome();
    } else {
      destination = CardDeeplinkDestination.CARD_WELCOME;
      DevLogger.log(
        '[handleCardHome] User not authenticated and no card-linked account, navigating to Card Welcome',
      );
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
    }

    trackCardHomeDeeplinkEvent({
      isAuthenticated,
      hasCardLinkedAccount,
      destination,
    });

    Logger.log(
      `[handleCardHome] Card home deeplink handled successfully. Destination: ${destination}`,
    );
  } catch (error) {
    DevLogger.log('[handleCardHome] Failed to handle deeplink:', error);
    Logger.error(
      error as Error,
      '[handleCardHome] Error handling card home deeplink',
    );

    destination = CardDeeplinkDestination.CARD_WELCOME;
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

      trackCardHomeDeeplinkEvent({
        isAuthenticated,
        hasCardLinkedAccount,
        destination,
        error: true,
      });
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleCardHome] Failed to navigate to fallback screen',
      );
    }
  }
};

function navigateToCardHome(): void {
  setTimeout(() => {
    NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: {
        screen: Routes.CARD.HOME,
      },
    });
  }, 500);
}

/**
 * Track the card home deeplink analytics event
 * - deeplink_type: card_home
 * - authenticated: Authentication state at time of opening
 * - has_card_linked_account: Whether a card-linked account was found
 * - final_destination: Final destination screen (Card Home or Welcome screen)
 */
function trackCardHomeDeeplinkEvent({
  isAuthenticated,
  hasCardLinkedAccount,
  destination,
  error = false,
}: {
  isAuthenticated: boolean;
  hasCardLinkedAccount: boolean;
  destination: CardDeeplinkDestination;
  error?: boolean;
}): void {
  try {
    const event = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.CARD_DEEPLINK_HANDLED,
    )
      .addProperties({
        deeplink_type: CardDeeplinkActions.CARD_HOME,
        authenticated: isAuthenticated,
        has_card_linked_account: hasCardLinkedAccount,
        final_destination: destination,
        ...(error && { error: true }),
      })
      .build();

    analytics.trackEvent(event);
    DevLogger.log('[handleCardHome] Analytics event tracked:', {
      deeplink_type: CardDeeplinkActions.CARD_HOME,
      authenticated: isAuthenticated,
      has_card_linked_account: hasCardLinkedAccount,
      final_destination: destination,
    });
  } catch (analyticsError) {
    DevLogger.log(
      '[handleCardHome] Failed to track analytics:',
      analyticsError,
    );
  }
}

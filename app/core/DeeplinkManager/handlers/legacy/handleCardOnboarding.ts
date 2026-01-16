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

/**
 * Destination screens for card onboarding deeplink
 */
enum CardDeeplinkDestination {
  CARD_HOME = 'CARD_HOME',
  CARD_WELCOME = 'CARD_WELCOME',
}

/**
 * Card onboarding deeplink handler
 *
 * This handler navigates users to the appropriate Card entry point based on their
 * authentication state and whether they have a card-linked account.
 *
 * Behavior:
 * - User is logged in or has a card-linked account: Switch to first card-linked account,
 * navigate to Card Home, and show a toast notification
 * - User is not logged in and has no card-linked account: Remain in current account and
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
    const shouldOnboardingBeEnabled =
      isCardExperimentalSwitchEnabled ||
      (cardSupportedCountries?.[cardGeoLocation as string] === true &&
        displayCardButtonFeatureFlag);

    if (!shouldOnboardingBeEnabled) {
      DevLogger.log(
        '[handleCardOnboarding] Card onboarding is not enabled, skipping',
      );
      return;
    }

    ReduxService.store.dispatch(setAlwaysShowCardButton(true));
    DevLogger.log('[handleCardOnboarding] Successfully enabled card button');

    // If user is logged in OR has a card-linked account
    if (isAuthenticated || hasCardLinkedAccount) {
      if (hasCardLinkedAccount) {
        // Switch to the first account that has a linked card
        const firstCardholderAddress = cardholderAccounts[0];
        DevLogger.log(
          '[handleCardOnboarding] Switching to first cardholder account:',
          firstCardholderAddress,
        );

        try {
          Engine.setSelectedAddress(firstCardholderAddress);
          DevLogger.log(
            '[handleCardOnboarding] Successfully switched to cardholder account',
          );
        } catch (switchError) {
          // Log error but continue with navigation to Card Home
          DevLogger.log(
            '[handleCardOnboarding] Error switching account:',
            switchError,
          );
          Logger.error(
            switchError as Error,
            '[handleCardOnboarding] Failed to switch to cardholder account',
          );
        }
      }

      destination = CardDeeplinkDestination.CARD_HOME;
      DevLogger.log('[handleCardOnboarding] Navigating to Card Home');
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
    } else {
      // User is not logged in AND has no card-linked account
      // Navigate to Card Welcome/onboarding screen
      destination = CardDeeplinkDestination.CARD_WELCOME;
      DevLogger.log(
        '[handleCardOnboarding] Navigating to Card Welcome (onboarding)',
      );
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });
    }

    // Track analytics event
    trackCardOnboardingDeeplinkEvent({
      isAuthenticated,
      hasCardLinkedAccount,
      destination,
    });

    Logger.log(
      `[handleCardOnboarding] Card onboarding deeplink handled successfully. Destination: ${destination}`,
    );
  } catch (error) {
    DevLogger.log('[handleCardOnboarding] Failed to handle deeplink:', error);
    Logger.error(
      error as Error,
      '[handleCardOnboarding] Error handling card onboarding deeplink',
    );

    // Fallback: Navigate to Card Welcome screen
    destination = CardDeeplinkDestination.CARD_WELCOME;
    try {
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.WELCOME,
      });

      // Track error event with fallback destination
      trackCardOnboardingDeeplinkEvent({
        isAuthenticated,
        hasCardLinkedAccount,
        destination,
        error: true,
      });
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleCardOnboarding] Failed to navigate to fallback screen',
      );
    }
  }
};

/**
 * Track the card onboarding deeplink analytics event
 */
function trackCardOnboardingDeeplinkEvent({
  isAuthenticated,
  hasCardLinkedAccount,
  destination,
  error = false,
}: {
  isAuthenticated: boolean;
  hasCardLinkedAccount: boolean;
  destination: CardDeeplinkDestination;
  error?: boolean;
}) {
  try {
    const event = AnalyticsEventBuilder.createEventBuilder(
      MetaMetricsEvents.CARD_DEEPLINK_HANDLED,
    )
      .addProperties({
        deeplink_type: CardDeeplinkActions.CARD_ONBOARDING,
        authenticated: isAuthenticated,
        has_card_linked_account: hasCardLinkedAccount,
        final_destination: destination,
        ...(error && { error: true }),
      })
      .build();

    analytics.trackEvent(event);
    DevLogger.log('[handleCardOnboarding] Analytics event tracked:', {
      deeplink_type: CardDeeplinkActions.CARD_ONBOARDING,
      authenticated: isAuthenticated,
      has_card_linked_account: hasCardLinkedAccount,
      final_destination: destination,
    });
  } catch (analyticsError) {
    // Don't fail the deeplink handling if analytics fails
    DevLogger.log(
      '[handleCardOnboarding] Failed to track analytics:',
      analyticsError,
    );
  }
}

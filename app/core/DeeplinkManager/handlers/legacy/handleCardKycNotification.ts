import Logger from '../../../../util/Logger';
import ReduxService from '../../../redux';
import NavigationService from '../../../NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectIsAuthenticatedCard,
  selectOnboardingId,
  selectSelectedCountry,
  selectUserCardLocation,
  selectCardGeoLocation,
} from '../../../redux/slices/card';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
  selectCardFeatureFlag,
  CardFeatureFlag,
} from '../../../../selectors/featureFlagController/card';
import { CardSDK } from '../../../../components/UI/Card/sdk/CardSDK';
import { mapCountryToLocation } from '../../../../components/UI/Card/util/mapCountryToLocation';
import {
  CardLocation,
  CardVerificationState,
} from '../../../../components/UI/Card/types';

/**
 * Card KYC notification deeplink handler
 *
 * This handler routes users to the appropriate screen based on their KYC verification
 * status when they tap on a push notification about their verification result.
 *
 * Two scenarios are handled:
 * 1. Onboarding flow (user has onboardingId): Checks registration status and navigates to:
 * - KYCFailed: If REJECTED
 * - Complete (with nextDestination: 'personal_details'): If VERIFIED
 * - KYCPending: If still PENDING
 *
 * 2. Authenticated flow (user is authenticated): Checks user details and navigates to:
 * - KYCFailed: If REJECTED
 * - Complete (with nextDestination: 'card_home'): If VERIFIED
 * - CardHome: If still PENDING
 *
 * CRITICAL: The handler correctly determines the user's location (US vs International)
 * to set the x-us-env header for API calls. Using the wrong location causes "not found" errors.
 *
 * Supported URL formats:
 * - https://link.metamask.io/card-kyc-notification
 * - https://metamask.app.link/card-kyc-notification
 */
export const handleCardKycNotification = async () => {
  Logger.log(
    '[handleCardKycNotification] Starting card KYC notification deeplink handling',
  );

  try {
    const state = ReduxService.store.getState();

    // Check feature flags
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
      Logger.log(
        '[handleCardKycNotification] Card feature is not enabled, skipping',
      );
      return;
    }

    // Get user state
    const onboardingId = selectOnboardingId(state);
    const isAuthenticated = selectIsAuthenticatedCard(state);
    const cardFeatureFlag = selectCardFeatureFlag(state);

    Logger.log('[handleCardKycNotification] User state:', {
      hasOnboardingId: !!onboardingId,
      isAuthenticated,
    });

    // Scenario 1: User is in onboarding flow
    if (onboardingId) {
      await handleOnboardingFlow(
        state,
        onboardingId,
        cardFeatureFlag as CardFeatureFlag,
      );
      return;
    }

    // Scenario 2: User is authenticated (completed onboarding but may be pending KYC)
    if (isAuthenticated) {
      await handleAuthenticatedFlow(state, cardFeatureFlag as CardFeatureFlag);
      return;
    }

    // Fallback: User is not in onboarding and not authenticated
    Logger.log(
      '[handleCardKycNotification] No onboarding or auth state, navigating to Welcome',
    );
    NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
      screen: Routes.CARD.HOME,
      params: {
        screen: Routes.CARD.WELCOME,
      },
    });
  } catch (error) {
    Logger.log('[handleCardKycNotification] Failed to handle deeplink:', error);
    Logger.error(
      error as Error,
      '[handleCardKycNotification] Error handling card KYC notification deeplink',
    );

    // Fallback: Navigate to Card Welcome screen
    try {
      NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: Routes.CARD.WELCOME,
        },
      });
    } catch (navError) {
      Logger.error(
        navError as Error,
        '[handleCardKycNotification] Failed to navigate to fallback screen',
      );
    }
  }
};

/**
 * Handle the onboarding flow for users who are mid-onboarding (have onboardingId)
 * This is typically called when a user receives a Veriff KYC notification
 */
async function handleOnboardingFlow(
  state: ReturnType<typeof ReduxService.store.getState>,
  onboardingId: string,
  cardFeatureFlag: CardFeatureFlag | Record<string, never>,
): Promise<void> {
  Logger.log(
    '[handleCardKycNotification] Handling onboarding flow for onboardingId:',
    onboardingId,
  );

  // Get location from selectedCountry
  const selectedCountry = selectSelectedCountry(state);
  const location: CardLocation = mapCountryToLocation(
    selectedCountry?.key ?? null,
  );

  Logger.log('[handleCardKycNotification] Determined location:', {
    selectedCountryKey: selectedCountry?.key,
    location,
  });

  // Create SDK instance with correct location
  const sdk = new CardSDK({
    cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
    userCardLocation: location,
  });

  // Fetch registration status
  const registrationStatus = await sdk.getRegistrationStatus(onboardingId);
  const verificationState = registrationStatus.verificationState;

  Logger.log(
    '[handleCardKycNotification] Registration status:',
    verificationState,
  );

  navigateBasedOnVerificationState(verificationState, 'onboarding');
}

/**
 * Handle the authenticated flow for users who completed onboarding but may have pending KYC
 * This is typically called when a user receives a Manual KYC notification
 */
async function handleAuthenticatedFlow(
  state: ReturnType<typeof ReduxService.store.getState>,
  cardFeatureFlag: CardFeatureFlag | Record<string, never>,
): Promise<void> {
  Logger.log('[handleCardKycNotification] Handling authenticated flow');

  // Get location directly from userCardLocation (already stored for authenticated users)
  const userCardLocation = selectUserCardLocation(state);

  Logger.log(
    '[handleCardKycNotification] User card location:',
    userCardLocation,
  );

  // Create SDK instance with correct location
  const sdk = new CardSDK({
    cardFeatureFlag: cardFeatureFlag as CardFeatureFlag,
    userCardLocation,
  });

  // Fetch user details
  const userDetails = await sdk.getUserDetails();
  const verificationState = userDetails.verificationState;

  Logger.log(
    '[handleCardKycNotification] User verification state:',
    verificationState,
  );

  navigateBasedOnVerificationState(verificationState, 'authenticated');
}

/**
 * Navigate to the appropriate screen based on verification state and flow type
 */
function navigateBasedOnVerificationState(
  verificationState: CardVerificationState | undefined,
  flowType: 'onboarding' | 'authenticated',
): void {
  // Use setTimeout to ensure navigation happens after any pending UI updates
  setTimeout(() => {
    switch (verificationState) {
      case 'REJECTED':
        Logger.log(
          '[handleCardKycNotification] User rejected, navigating to KYCFailed',
        );
        NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.KYC_FAILED,
            },
          },
        });
        break;

      case 'VERIFIED':
        Logger.log(
          '[handleCardKycNotification] User verified, navigating to Complete',
        );
        NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
            params: {
              screen: Routes.CARD.ONBOARDING.COMPLETE,
              params: {
                nextDestination:
                  flowType === 'onboarding' ? 'personal_details' : 'card_home',
              },
            },
          },
        });
        break;

      case 'PENDING':
        if (flowType === 'onboarding') {
          Logger.log(
            '[handleCardKycNotification] User still pending (onboarding), navigating to KYCPending',
          );
          NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
            params: {
              screen: Routes.CARD.ONBOARDING.ROOT,
              params: {
                screen: Routes.CARD.ONBOARDING.KYC_PENDING,
              },
            },
          });
        } else {
          Logger.log(
            '[handleCardKycNotification] User still pending (authenticated), navigating to CardHome',
          );
          NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
            params: {
              screen: Routes.CARD.HOME,
            },
          });
        }
        break;

      case 'UNVERIFIED':
        Logger.log(
          '[handleCardKycNotification] User unverified, navigating to Onboarding',
        );
        NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
          screen: Routes.CARD.HOME,
          params: {
            screen: Routes.CARD.ONBOARDING.ROOT,
          },
        });
        break;

      default:
        if (flowType === 'authenticated') {
          Logger.log(
            '[handleCardKycNotification] Unknown verification state (authenticated), navigating to CardHome',
          );
          NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
            params: {
              screen: Routes.CARD.HOME,
            },
          });
        } else {
          Logger.log(
            '[handleCardKycNotification] Unknown verification state, navigating to Onboarding',
          );
          NavigationService.navigation?.navigate(Routes.CARD.ROOT, {
            screen: Routes.CARD.HOME,
            params: {
              screen: Routes.CARD.ONBOARDING.ROOT,
            },
          });
        }
        break;
    }
  }, 500);

  Logger.log(
    '[handleCardKycNotification] Card KYC notification deeplink handled successfully',
  );
}

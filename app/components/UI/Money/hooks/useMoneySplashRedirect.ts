import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { ensureError } from '../../../../util/errorUtils';
import Logger from '../../../../util/Logger';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import { useMoneyHomeNavigation } from './useMoneyHomeNavigation';
import {
  MoneyPostOnboardingRedirectType,
  type MoneyPostOnboardingRedirect,
} from '../types/navigation';
import { CARD_RETURN_ROUTES } from '../constants/cardReturnRoutes';

/**
 * Resolves the destination the splash promised before it opened.
 */
export const useMoneySplashRedirect = (
  postOnboardingRedirect: MoneyPostOnboardingRedirect | undefined,
  analyticsContext?: NavigationAnalyticsContext,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const { navigateToMoneyHome } = useMoneyHomeNavigation();

  const goToMoneyHome = useCallback(() => {
    navigateToMoneyHome({
      skipFtueRedirect: true,
      ...(analyticsContext ? { analyticsContext } : {}),
    });
  }, [analyticsContext, navigateToMoneyHome]);

  const redirectAfterSplash = useCallback(() => {
    if (postOnboardingRedirect?.type === MoneyPostOnboardingRedirectType.CARD) {
      navigation.navigate(Routes.CARD.ROOT, {
        screen: Routes.CARD.HOME,
        params: {
          screen: CARD_RETURN_ROUTES[postOnboardingRedirect.cardScreen],
        },
      });
      return;
    }

    if (
      postOnboardingRedirect?.type === MoneyPostOnboardingRedirectType.DEPOSIT
    ) {
      initiateDeposit({
        preferredPaymentToken: postOnboardingRedirect.preferredPaymentToken,
        ...(postOnboardingRedirect.autoSelectFiatPayment !== undefined
          ? {
              autoSelectFiatPayment:
                postOnboardingRedirect.autoSelectFiatPayment,
            }
          : {}),
        ...(postOnboardingRedirect.intent
          ? { intent: postOnboardingRedirect.intent }
          : {}),
        replaceConfirmation: true,
        onDepositSetupFailure: goToMoneyHome,
      }).catch((error) => {
        Logger.error(
          ensureError(error, '[Money Splash] Deposit setup failed'),
          '[Money Splash] Failed to initiate deposit after splash',
        );
      });
      return;
    }

    goToMoneyHome();
  }, [goToMoneyHome, initiateDeposit, navigation, postOnboardingRedirect]);

  return { redirectAfterSplash };
};

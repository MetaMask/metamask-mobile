import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { selectMoneySplashSeen } from '../../../../reducers/user/selectors';
import { selectMoneySplashEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';
import { MONEY_BUTTON_INTENTS, SCREEN_NAMES } from '../constants/moneyEvents';
import {
  MoneyPostOnboardingRedirectType,
  type MoneySplashParams,
} from '../types/navigation';
import { useMoneyAccountDeposit } from './useMoneyAccount';
import { useMoneyOnboardingNavigation } from './useMoneyNavigation';

interface NavigateToMoneyDepositWithCtaFtueOptions {
  analyticsContext?: NavigationAnalyticsContext;
}

export const useMoneyCtaFtueNavigation = () => {
  const hasSeenSplash = useSelector(selectMoneySplashSeen);
  const isSplashEnabled = useSelector(selectMoneySplashEnabled);
  const { isOnboardingRedirectNeeded, redirectToOnboardingIfNeeded } =
    useMoneyOnboardingNavigation();
  const { initiateDeposit } = useMoneyAccountDeposit();

  const isSplashRedirectNeeded = isSplashEnabled && !hasSeenSplash;
  const isOnboardingFallbackRedirectNeeded =
    !isSplashEnabled && isOnboardingRedirectNeeded;
  const isCtaFtueRedirectNeeded =
    isSplashRedirectNeeded || isOnboardingFallbackRedirectNeeded;

  const ctaFtueRedirectTarget = isSplashRedirectNeeded
    ? SCREEN_NAMES.MONEY_SPLASH
    : isOnboardingFallbackRedirectNeeded
      ? SCREEN_NAMES.MONEY_ONBOARDING
      : undefined;

  const ctaFtueButtonIntent = isSplashRedirectNeeded
    ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_SPLASH
    : isOnboardingFallbackRedirectNeeded
      ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
      : MONEY_BUTTON_INTENTS.ADD_MONEY;

  const redirectToCtaFtueIfNeeded = useCallback(
    (params?: MoneySplashParams) => {
      if (isSplashRedirectNeeded) {
        if (params) {
          NavigationService.navigation.navigate(Routes.MONEY.SPLASH, params);
        } else {
          NavigationService.navigation.navigate(Routes.MONEY.SPLASH);
        }
        return true;
      }

      if (isOnboardingFallbackRedirectNeeded) {
        return redirectToOnboardingIfNeeded(params);
      }

      return false;
    },
    [
      isSplashRedirectNeeded,
      isOnboardingFallbackRedirectNeeded,
      redirectToOnboardingIfNeeded,
    ],
  );

  const navigateToMoneyDepositWithCtaFtue = useCallback(
    async (options?: NavigateToMoneyDepositWithCtaFtueOptions) => {
      const redirected = redirectToCtaFtueIfNeeded({
        ...(options?.analyticsContext
          ? { analyticsContext: options.analyticsContext }
          : {}),
        postOnboardingRedirect: {
          type: MoneyPostOnboardingRedirectType.DEPOSIT,
        },
      });

      if (redirected) {
        return;
      }

      await initiateDeposit();
    },
    [initiateDeposit, redirectToCtaFtueIfNeeded],
  );

  return {
    isSplashRedirectNeeded,
    isOnboardingRedirectNeeded: isOnboardingFallbackRedirectNeeded,
    isCtaFtueRedirectNeeded,
    ctaFtueRedirectTarget,
    ctaFtueButtonIntent,
    redirectToCtaFtueIfNeeded,
    navigateToMoneyDepositWithCtaFtue,
  };
};

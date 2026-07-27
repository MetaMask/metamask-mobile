import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import type { MoneyOnboardingParams } from '../types/navigation';

/**
 * Why NavigationService instead of useNavigation():
 *
 * This hook is consumed by TabBar, which is rendered via the `tabBar` render prop on Tab.Navigator (a plain function)
 * not a screen component. No navigator-scoped NavigationContext exists at that call site,
 * so useNavigation() isn't available.
 *
 * NavigationService holds a module-level ref to the root NavigationContainerRef,
 * bypassing the context requirement entirely.
 *
 * See: https://github.com/react-navigation/react-navigation/issues/6472
 */
export const useMoneyOnboardingNavigation = () => {
  const hasSeenOnboarding = useSelector(selectMoneyOnboardingSeen);
  const isOnboardingEnabled = useSelector(
    selectMoneyOnboardingStepperAnimationEnabled,
  );

  const redirectToOnboarding = useCallback((params?: MoneyOnboardingParams) => {
    if (params) {
      NavigationService.navigation.navigate(Routes.MONEY.ONBOARDING, params);
      return;
    }

    NavigationService.navigation.navigate(Routes.MONEY.ONBOARDING);
  }, []);

  const redirectToOnboardingIfNeeded = useCallback(
    (params?: MoneyOnboardingParams) => {
      if (hasSeenOnboarding || !isOnboardingEnabled) {
        return false;
      }

      redirectToOnboarding(params);
      return true;
    },
    [hasSeenOnboarding, isOnboardingEnabled, redirectToOnboarding],
  );

  return { redirectToOnboardingIfNeeded };
};

export const useMoneyNavigation = () => {
  const { redirectToOnboardingIfNeeded } = useMoneyOnboardingNavigation();

  const navigateToMoneyHome = useCallback(() => {
    if (redirectToOnboardingIfNeeded()) {
      return;
    }

    NavigationService.navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  }, [redirectToOnboardingIfNeeded]);

  return { navigateToMoneyHome };
};

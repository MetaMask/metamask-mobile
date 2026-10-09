import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';
import { selectMoneyOnboardingStepperAnimationEnabled } from '../../../../selectors/featureFlagController/moneyAccount';
import type { MoneyOnboardingParams } from '../types/navigation';
import type { NavigationAnalyticsContext } from '../../../../util/analytics/navigationAnalyticsAttribution';

export interface NavigateToMoneyHomeOptions {
  analyticsContext?: NavigationAnalyticsContext;
  /**
   * Controls whether navigation pops to an existing route, which can show the
   * backward animation. Explore passes `pop: false` to use normal forward
   * navigation into Money Home. Defaults to true.
   */
  pop?: boolean;
}

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

  return {
    isOnboardingRedirectNeeded: !hasSeenOnboarding && isOnboardingEnabled,
    redirectToOnboardingIfNeeded,
  };
};

export const useMoneyNavigation = () => {
  const { isOnboardingRedirectNeeded, redirectToOnboardingIfNeeded } =
    useMoneyOnboardingNavigation();

  const navigateToMoneyHome = useCallback(
    (options?: NavigateToMoneyHomeOptions) => {
      const { analyticsContext, pop = true } = options ?? {};

      if (
        redirectToOnboardingIfNeeded(
          analyticsContext ? { analyticsContext } : undefined,
        )
      ) {
        return;
      }

      NavigationService.navigation.navigate(
        Routes.HOME_TABS,
        {
          screen: Routes.MONEY.ROOT,
          params: {
            screen: Routes.MONEY.HOME,
            ...(analyticsContext ? { params: { analyticsContext } } : {}),
          },
        },
        { pop },
      );
    },
    [redirectToOnboardingIfNeeded],
  );

  return { isOnboardingRedirectNeeded, navigateToMoneyHome };
};

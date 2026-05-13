import { useSelector } from 'react-redux';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';

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
export const useMoneyNavigation = () => {
  const hasSeenOnboarding = useSelector(selectMoneyOnboardingSeen);

  const redirectToOnboarding = () => {
    NavigationService.navigation.navigate(Routes.MONEY.ONBOARDING);
  };

  const redirectToOnboardingIfNeeded = () => {
    if (hasSeenOnboarding) {
      return false;
    }

    redirectToOnboarding();
    return true;
  };

  const navigateToMoneyHome = () => {
    if (redirectToOnboardingIfNeeded()) {
      return;
    }

    NavigationService.navigation.navigate(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  };

  return { navigateToMoneyHome };
};

import { useSelector } from 'react-redux';
import { selectMoneyOnboardingSeen } from '../../../../reducers/user/selectors';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../../core/NavigationService/NavigationService';

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

    NavigationService.navigation.navigate(Routes.MONEY.ROOT, {
      params: { screen: Routes.MONEY.HOME },
    });
  };

  return { navigateToMoneyHome };
};

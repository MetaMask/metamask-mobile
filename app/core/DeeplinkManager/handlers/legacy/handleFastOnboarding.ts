import getRedirectPathsAndParams from '../../../../components/UI/Ramp/utils/getRedirectPathAndParams';
import Routes from '../../../../constants/navigation/Routes';
import NavigationService from '../../../NavigationService';
import ReduxService from '../../../redux';

const ALLOWED_ONBOARDING_TYPES = ['google', 'apple', 'srp'];

function handleFastOnboarding(params: { onboardingPath: string }): boolean {
  const { onboardingPath } = params;
  const [, pathParams] = getRedirectPathsAndParams(onboardingPath);
  const onboardingType = pathParams?.type || '';
  const existing = pathParams?.existing || '';

  const navigation = NavigationService.navigation;
  if (!ALLOWED_ONBOARDING_TYPES.includes(onboardingType) || !navigation) {
    return false;
  }
  const isExistingUser = ReduxService.store.getState().user.existingUser;

  if (isExistingUser) {
    navigation.navigate(Routes.WALLET.HOME);
  } else {
    const resetRoute = {
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          params: {
            screen: Routes.ONBOARDING.NAV,
            params: {
              screen: Routes.ONBOARDING.ONBOARDING,
              params: {
                onboardingType,
                existing,
              },
            },
          },
        },
      ],
    };
    navigation.reset({
      index: 0,
      routes: resetRoute.routes,
    });
  }
  return true;
}

export default handleFastOnboarding;

import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../NavigationService';

const ALLOWED_ONBOARDING_TYPES = ['google', 'apple', 'srp'];

function handleFastOnboarding(onboardingDeeplink: string): boolean {
  try {
    const url = new URL(onboardingDeeplink);

    const onboardingType = url.searchParams.get('type') || '';
    const existingUser = url.searchParams.get('existingUser') || '';

    if (!ALLOWED_ONBOARDING_TYPES.includes(onboardingType)) {
      return false;
    }

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
                existingUser,
              },
            },
          },
        },
      ],
    };
    NavigationService.navigation?.navigate(resetRoute.routes[0]);
    return true;
  } catch {
    return false;
  }
}

export default handleFastOnboarding;

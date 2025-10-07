import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../NavigationService';

const ALLOWED_ONBOARDING_TYPES = ['google', 'apple', 'import_srp'];

function handleFastOnboarding(onboardingDeeplink: string): boolean {
  try {
    const url = new URL(onboardingDeeplink);
    let onboardingType: string = '';

    // Handle empty search params
    if (url.search) {
      url.search
        .slice(1)
        .split('&')
        .forEach((param) => {
          const [paramKey, paramValue] = param.split('=');
          // Only set onboardingType if we haven't found one yet (use first occurrence)
          // and if paramValue is defined and not empty
          if (paramKey === 'type' && paramValue && !onboardingType) {
            onboardingType = paramValue;
          }
        });
    }

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

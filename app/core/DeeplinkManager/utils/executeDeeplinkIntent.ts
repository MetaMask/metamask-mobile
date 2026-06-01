import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../NavigationService';
import {
  DeeplinkIntent,
  isHomeTabDeeplinkNavigationIntent,
} from '../types/DeeplinkIntent';

interface NavigationRoute {
  name: string;
  params?: object;
  state?: {
    index?: number;
    routes: NavigationRoute[];
  };
}

const createRoute = (name: string, params?: object): NavigationRoute =>
  params ? { name, params } : { name };

export const executeDeeplinkIntent = async (
  intent: DeeplinkIntent,
): Promise<void> => {
  if (intent.prepare) {
    await intent.prepare();
  }

  if (isHomeTabDeeplinkNavigationIntent(intent)) {
    const { routeName, params } = intent.target;
    if (params) {
      NavigationService.navigation.navigate(routeName, params);
    } else {
      NavigationService.navigation.navigate(routeName);
    }
  }
};

export const executeStartupDeeplinkIntent = async (
  intent: DeeplinkIntent,
): Promise<boolean> => {
  if (!isHomeTabDeeplinkNavigationIntent(intent)) {
    return false;
  }

  if (intent.prepare) {
    await intent.prepare();
  }

  const { routeName, params } = intent.target;
  const targetTabRoute = createRoute(routeName, params);
  const tabRoutes =
    routeName === Routes.WALLET.HOME
      ? [targetTabRoute]
      : [createRoute(Routes.WALLET.HOME), targetTabRoute];

  NavigationService.navigation.reset({
    routes: [
      {
        name: Routes.ONBOARDING.HOME_NAV,
        state: {
          routes: [
            {
              name: Routes.MAIN_FLOW,
              state: {
                routes: [
                  {
                    name: Routes.HOME_TABS,
                    state: {
                      index: tabRoutes.length - 1,
                      routes: tabRoutes,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  });

  return true;
};

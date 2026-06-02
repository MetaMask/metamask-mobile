import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../NavigationService';
import {
  type DeeplinkIntent,
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
  // Some handlers need to seed Redux or controller state before the route
  // mounts. Keep that preparation attached to the intent so normal and startup
  // execution paths cannot drift.
  await intent.prepare?.();

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
  // Startup deeplinks run before HomeNav is on screen, so only targets that can
  // be expressed as Home tab state are safe to execute here. Other intents fall
  // back to the regular post-Home deeplink saga path.
  if (!isHomeTabDeeplinkNavigationIntent(intent)) {
    return false;
  }

  if (intent.prepare) {
    await intent.prepare();
  }

  const { routeName, params } = intent.target;
  const targetTabRoute = createRoute(routeName, params);
  // Keep Wallet before the deeplink target so hardware/software back actions
  // still land on the normal home screen after opening a startup deeplink.
  const tabRoutes =
    routeName === Routes.WALLET.HOME
      ? [targetTabRoute]
      : [createRoute(Routes.WALLET.HOME), targetTabRoute];

  // Build the same navigator hierarchy the normal Home reset would create,
  // but preselect the target tab. This avoids rendering Wallet first while
  // preserving a valid HomeNav/MainFlow/HomeTabs state for React Navigation.
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

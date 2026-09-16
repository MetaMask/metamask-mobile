import Routes from '../../../constants/navigation/Routes';
import NavigationService from '../../NavigationService';
import type { DeeplinkIntent } from '../types/DeeplinkIntent';
import {
  endDeeplinkProcessedTrace,
  getDeeplinkProcessedTraceContext,
  resolveDeeplinkNavigatedTarget,
} from '../../Performance/DeeplinkPerformance';
import { trace, TraceName, TraceOperation } from '../../../util/trace';

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

const resetToMainFlow = (mainFlowState: {
  index?: number;
  routes: NavigationRoute[];
}) => {
  // Build the same navigator hierarchy the normal Home reset would create
  // (HomeNav > MainFlow > MainNavigator), but preselect the deeplink target.
  // This avoids rendering Wallet first while preserving a valid React
  // Navigation state tree.
  NavigationService.navigation.reset({
    routes: [
      {
        name: Routes.ONBOARDING.HOME_NAV,
        state: {
          routes: [
            {
              name: Routes.MAIN_FLOW,
              state: mainFlowState,
            },
          ],
        },
      },
    ],
  });
};

/**
 * `intent.prepare()` is genuinely processing work (it seeds Redux/controller
 * state, sometimes async), so it runs inside the Processed span with its own
 * child span, and the span ends after it — immediately before navigation.
 */
const prepareIntentAndEndProcessedTrace = async (intent: DeeplinkIntent) => {
  const parentContext = getDeeplinkProcessedTraceContext();
  if (intent.prepare && parentContext) {
    await trace(
      {
        name: TraceName.DeeplinkIntentPrepare,
        op: TraceOperation.DeeplinkPerformance,
        parentContext,
      },
      () => intent.prepare?.(),
    );
  } else {
    await intent.prepare?.();
  }

  resolveDeeplinkNavigatedTarget({ targetRoute: intent.target.routeName });
  endDeeplinkProcessedTrace({
    seam: 'pre_navigate',
    targetRoute: intent.target.routeName,
  });
};

export const executeDeeplinkIntent = async (
  intent: DeeplinkIntent,
): Promise<void> => {
  // Some handlers need to seed Redux or controller state before the route
  // mounts. Keep that preparation attached to the intent so normal and startup
  // execution paths cannot drift.
  await prepareIntentAndEndProcessedTrace(intent);

  const { routeName, params } = intent.target;

  // For main-stack targets that declare a backTab, activate that tab first so
  // the back stack is correct: back from the target returns to that tab rather
  // than to whatever was previously focused.
  if (
    intent.target.type === 'main-stack' &&
    intent.target.backTab &&
    intent.target.backTab !== routeName
  ) {
    NavigationService.navigation.navigate(intent.target.backTab);
  }

  if (params) {
    NavigationService.navigation.navigate(routeName, params);
  } else {
    NavigationService.navigation.navigate(routeName);
  }
};

export const executeStartupDeeplinkIntent = async (
  intent: DeeplinkIntent,
): Promise<boolean> => {
  // Startup deeplinks run before HomeNav is on screen, so we build the
  // navigator state directly rather than navigating. The target kind decides
  // where the route is placed in the hierarchy.
  await prepareIntentAndEndProcessedTrace(intent);

  const { routeName, params } = intent.target;
  const targetRoute = createRoute(routeName, params);

  if (intent.target.type === 'home-tab') {
    // Keep Wallet before the deeplink target so hardware/software back actions
    // still land on the normal home screen after opening a startup deeplink.
    const tabRoutes =
      routeName === Routes.WALLET.HOME
        ? [targetRoute]
        : [createRoute(Routes.WALLET.HOME), targetRoute];

    resetToMainFlow({
      routes: [
        {
          name: Routes.HOME_TABS,
          state: {
            index: tabRoutes.length - 1,
            routes: tabRoutes,
          },
        },
      ],
    });

    return true;
  }

  // main-stack: the target is pushed above the tabs. The backTab (defaulting
  // to Wallet) is seeded as the focused tab so pressing back from the target
  // lands on the intended tab rather than whatever tab was last active.
  const backTabName =
    ('backTab' in intent.target && intent.target.backTab) || Routes.WALLET.HOME;
  const tabRoutes =
    backTabName === Routes.WALLET.HOME
      ? [createRoute(Routes.WALLET.HOME)]
      : [createRoute(Routes.WALLET.HOME), createRoute(backTabName)];

  resetToMainFlow({
    index: 1,
    routes: [
      {
        name: Routes.HOME_TABS,
        state: { index: tabRoutes.length - 1, routes: tabRoutes },
      },
      targetRoute,
    ],
  });

  return true;
};

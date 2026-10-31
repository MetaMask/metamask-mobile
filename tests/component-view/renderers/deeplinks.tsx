import '../mocks';
import React from 'react';
import { Text } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useRoute,
  type NavigationContainerRef,
  type NavigationState,
  type ParamListBase,
  type PartialState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { waitFor } from '@testing-library/react-native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import Routes from '../../../app/constants/navigation/Routes';
import NavigationService from '../../../app/core/NavigationService';
import ReduxService from '../../../app/core/redux';
import Logger from '../../../app/util/Logger';
import branch from 'react-native-branch';
import NotificationsSettings from '../../../app/components/Views/Settings/NotificationsSettings';
import NotificationSettingsSection from '../../../app/components/Views/Settings/NotificationsSettings/NotificationSettingsSection';
import type { ExpectedFocusedRoute } from '../../../app/core/DeeplinkManager/__fixtures__/deeplinkUriCases';
import { initialStateDeeplinks } from '../presets/deeplinks';
import { createComponentViewQueryClient } from '../render';
import { QueryClientProvider } from '@tanstack/react-query';

// Component-view renderer for deeplink navigation.
//
// Mounts one real NavigationContainer over a reduced navigator tree that
// mirrors the production hierarchy this suite covers:
//
//   root stack
//   └─ HomeNav (stack)                       app/components/Nav/App/App.tsx
//      ├─ Home (bottom tabs)                 MainNavigator.tsx HomeTabs
//      │  ├─ WalletTabHome → WalletView (stack)
//      │  ├─ TrendingView / RewardsView (leaf tabs)
//      │  └─ BrowserTabHome → BrowserView (stack)
//      ├─ SettingsView (stack): AccountsMenuView, NotificationsSettings (real),
//      │                        NotificationSettingsSection (real)
//      ├─ Perps / PerpsModals / Bridge / Predict (stacks) and leaf screens
//      └─ RWATokensFullView, ExploreSearch, PerpsTutorial (leaf screens)
//
// Limits: this is a hand-registered test tree. It does not prove production
// route registration, feature-flag-dependent layouts (Social tab placement,
// native tabs), OS dispatch, unlock, or process lifecycle. Registration is
// independent of the intents under test: nothing registers a route because the
// parser returned it, so a wrong target is an unhandled action or a failed
// destination assertion.
//
// `NavigationService` is bound to the mounted container and `ReduxService` to
// the store the renderer's providers use. Previous bindings are restored by
// `cleanup()`.

type TabName = 'wallet' | 'explore' | 'rewards' | 'browser';

const TAB_ROUTE: Record<TabName, string> = {
  wallet: Routes.WALLET.HOME,
  explore: Routes.TRENDING_VIEW,
  rewards: Routes.REWARDS_VIEW,
  browser: Routes.BROWSER.HOME,
};

const TAB_ORDER: string[] = [
  Routes.WALLET.HOME,
  Routes.TRENDING_VIEW,
  Routes.REWARDS_VIEW,
  Routes.BROWSER.HOME,
];

export const getRouteProbeTestId = (routeName: string) => `route-${routeName}`;

const createProbe =
  (routeName: string): React.FC =>
  () => {
    const route = useRoute();
    return (
      <>
        <Text testID={getRouteProbeTestId(routeName)}>{routeName}</Text>
        <Text testID={`${getRouteProbeTestId(routeName)}-params`}>
          {JSON.stringify(route.params ?? null)}
        </Text>
      </>
    );
  };

const RootStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const WalletStack = createNativeStackNavigator();
const BrowserStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();
const PerpsStack = createNativeStackNavigator();
const PerpsModalStack = createNativeStackNavigator();
const BridgeStack = createNativeStackNavigator();
const PredictStack = createNativeStackNavigator();

const probeScreen = (
  Navigator: typeof RootStack,
  name: string,
): React.ReactElement => (
  <Navigator.Screen key={name} name={name} component={createProbe(name)} />
);

const probes = {
  fox: createProbe(Routes.FOX_LOADER),
  walletView: createProbe(Routes.WALLET_VIEW),
  browserView: createProbe(Routes.BROWSER.VIEW),
  trending: createProbe(Routes.TRENDING_VIEW),
  rewards: createProbe(Routes.REWARDS_VIEW),
  tutorial: createProbe(Routes.PERPS.TUTORIAL),
  rwaFullView: createProbe(Routes.WALLET.RWA_TOKENS_FULL_VIEW),
  exploreSearch: createProbe(Routes.EXPLORE_SEARCH),
};

const WalletTabFlow = () => (
  <WalletStack.Navigator
    initialRouteName={Routes.WALLET_VIEW}
    screenOptions={{ headerShown: false }}
  >
    <WalletStack.Screen
      name={Routes.WALLET_VIEW}
      component={probes.walletView}
    />
  </WalletStack.Navigator>
);

const BrowserTabFlow = () => (
  <BrowserStack.Navigator
    initialRouteName={Routes.BROWSER.VIEW}
    screenOptions={{ headerShown: false }}
  >
    <BrowserStack.Screen
      name={Routes.BROWSER.VIEW}
      component={probes.browserView}
    />
  </BrowserStack.Navigator>
);

const HomeTabs = () => (
  <Tabs.Navigator
    initialRouteName={Routes.WALLET.HOME}
    screenOptions={{ headerShown: false }}
  >
    <Tabs.Screen name={Routes.WALLET.HOME} component={WalletTabFlow} />
    <Tabs.Screen name={Routes.TRENDING_VIEW} component={probes.trending} />
    <Tabs.Screen name={Routes.REWARDS_VIEW} component={probes.rewards} />
    <Tabs.Screen name={Routes.BROWSER.HOME} component={BrowserTabFlow} />
  </Tabs.Navigator>
);

const SettingsFlow = () => (
  <SettingsStack.Navigator
    initialRouteName={Routes.ACCOUNTS_MENU_VIEW}
    screenOptions={{ headerShown: false }}
  >
    {probeScreen(SettingsStack, Routes.ACCOUNTS_MENU_VIEW)}
    <SettingsStack.Screen
      name={Routes.SETTINGS.NOTIFICATIONS}
      component={NotificationsSettings as unknown as React.ComponentType}
    />
    <SettingsStack.Screen
      name={Routes.SETTINGS.NOTIFICATION_SETTINGS_SECTION}
      component={NotificationSettingsSection as unknown as React.ComponentType}
    />
  </SettingsStack.Navigator>
);

const PerpsFlow = () => (
  <PerpsStack.Navigator screenOptions={{ headerShown: false }}>
    {probeScreen(PerpsStack, Routes.PERPS.PERPS_HOME)}
    {probeScreen(PerpsStack, Routes.PERPS.MARKET_LIST)}
    {probeScreen(PerpsStack, Routes.PERPS.MARKET_DETAILS)}
  </PerpsStack.Navigator>
);

const PerpsModalsFlow = () => (
  <PerpsModalStack.Navigator screenOptions={{ headerShown: false }}>
    {probeScreen(PerpsModalStack, Routes.PERPS.MODALS.OUTREACH_DETAILS)}
  </PerpsModalStack.Navigator>
);

const BridgeFlow = () => (
  <BridgeStack.Navigator screenOptions={{ headerShown: false }}>
    {probeScreen(BridgeStack, Routes.BRIDGE.BRIDGE_VIEW)}
  </BridgeStack.Navigator>
);

const PredictFlow = () => (
  <PredictStack.Navigator
    initialRouteName={Routes.PREDICT.MARKET_LIST}
    screenOptions={{ headerShown: false }}
  >
    {probeScreen(PredictStack, Routes.PREDICT.MARKET_LIST)}
    {probeScreen(PredictStack, Routes.PREDICT.MARKET_DETAILS)}
    {probeScreen(PredictStack, Routes.PREDICT.FEED)}
  </PredictStack.Navigator>
);

const HomeNavStack = () => (
  <MainStack.Navigator
    initialRouteName={Routes.HOME_TABS}
    screenOptions={{ headerShown: false }}
  >
    <MainStack.Screen name={Routes.HOME_TABS} component={HomeTabs} />
    <MainStack.Screen name={Routes.SETTINGS_VIEW} component={SettingsFlow} />
    <MainStack.Screen name={Routes.PERPS.ROOT} component={PerpsFlow} />
    <MainStack.Screen
      name={Routes.PERPS.TUTORIAL}
      component={probes.tutorial}
    />
    <MainStack.Screen
      name={Routes.PERPS.MODALS.ROOT}
      component={PerpsModalsFlow}
    />
    <MainStack.Screen name={Routes.BRIDGE.ROOT} component={BridgeFlow} />
    <MainStack.Screen name={Routes.PREDICT.ROOT} component={PredictFlow} />
    <MainStack.Screen
      name={Routes.WALLET.RWA_TOKENS_FULL_VIEW}
      component={probes.rwaFullView}
    />
    <MainStack.Screen
      name={Routes.EXPLORE_SEARCH}
      component={probes.exploreSearch}
    />
  </MainStack.Navigator>
);

const DeeplinkTestTree = () => (
  <RootStack.Navigator
    initialRouteName={Routes.FOX_LOADER}
    screenOptions={{ headerShown: false }}
  >
    <RootStack.Screen name={Routes.FOX_LOADER} component={probes.fox} />
    <RootStack.Screen
      name={Routes.ONBOARDING.HOME_NAV}
      component={HomeNavStack}
    />
  </RootStack.Navigator>
);

const buildInitialState = (
  start: DeeplinkStart,
): PartialState<NavigationState> | undefined => {
  if (start === 'before-home-nav') {
    return undefined;
  }

  const activeIndex = TAB_ORDER.indexOf(TAB_ROUTE[start.tab]);
  return {
    routes: [
      {
        name: Routes.ONBOARDING.HOME_NAV,
        state: {
          routes: [
            {
              name: Routes.HOME_TABS,
              state: {
                index: activeIndex,
                routes: TAB_ORDER.map((name) => ({ name })),
              },
            },
          ],
        },
      },
    ],
  };
};

/** Where the app is when the URI arrives. */
export type DeeplinkStart = 'before-home-nav' | { tab: TabName };

export interface FocusedRoute {
  name: string;
  params?: Record<string, unknown>;
}

interface RouteLike {
  name: string;
  params?: object;
  state?: StateLike;
}

interface StateLike {
  index?: number;
  routes?: RouteLike[];
}

/**
 * The chain of focused routes from the root navigator to the leaf. Reads the
 * live container state, so it reports nested navigators that have mounted.
 */
export const getFocusedRoutePath = (
  container: NavigationContainerRef<ParamListBase>,
): FocusedRoute[] => {
  const path: FocusedRoute[] = [];
  let state: StateLike | undefined = container.getRootState();
  while (state?.routes && state.routes.length > 0) {
    const index = state.index ?? state.routes.length - 1;
    const route: RouteLike = state.routes[index];
    path.push({
      name: route.name,
      params: route.params as Record<string, unknown> | undefined,
    });
    state = route.state;
  }
  return path;
};

/** Waits until the focused path has the expected route names, then returns it. */
export const waitForFocusedRouteNames = async (
  container: NavigationContainerRef<ParamListBase>,
  expected: readonly Pick<ExpectedFocusedRoute, 'name'>[],
) => {
  const expectedNames = expected.map(({ name }) => name);
  await waitFor(() => {
    expect(getFocusedRoutePath(container).map(({ name }) => name)).toEqual(
      expectedNames,
    );
  });
  return getFocusedRoutePath(container);
};

const probeSingleton = <Value,>(read: () => Value): Value | undefined => {
  // The services log and throw when unbound; that is the answer here, not an error.
  const logSpy = jest
    .spyOn(Logger, 'error')
    .mockImplementation(() => undefined);
  try {
    return read();
  } catch {
    return undefined;
  } finally {
    logSpy.mockRestore();
  }
};

/**
 * The shared CV setup stubs `react-native-branch` with only `subscribe`, but
 * the universal-link flow reads referring params from the native SDK for
 * analytics. Stub that native boundary for the duration of one render and
 * restore it in `cleanup()`.
 */
const stubBranchReferringParams = () => {
  const sdk = branch as unknown as {
    getLatestReferringParams?: () => Promise<Record<string, unknown>>;
  };
  const previous = sdk.getLatestReferringParams;
  sdk.getLatestReferringParams = jest.fn().mockResolvedValue({});
  return () => {
    if (previous) {
      sdk.getLatestReferringParams = previous;
    } else {
      delete sdk.getLatestReferringParams;
    }
  };
};

export interface RenderDeeplinkNavigationOptions {
  state?: DeepPartial<RootState>;
  start?: DeeplinkStart;
}

export async function renderDeeplinkNavigation({
  state = initialStateDeeplinks(),
  start = { tab: 'wallet' },
}: RenderDeeplinkNavigationOptions = {}) {
  const container = createNavigationContainerRef<ParamListBase>();
  const queryClient = createComponentViewQueryClient();
  const previousNavigation = probeSingleton(() => NavigationService.navigation);
  const previousStore = probeSingleton(() => ReduxService.store);
  const restoreBranch = stubBranchReferringParams();

  const rendered = renderWithProvider(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer
        ref={container}
        initialState={buildInitialState(start)}
      >
        <DeeplinkTestTree />
      </NavigationContainer>
    </QueryClientProvider>,
    { state },
    // The renderer owns the container so the service can be bound to it.
    false,
  );

  await waitFor(() => {
    expect(container.isReady()).toBe(true);
  });

  ReduxService.store = rendered.store;
  NavigationService.navigation =
    container as NavigationContainerRef<ParamListBase>;

  const cleanup = () => {
    queryClient.clear();
    restoreBranch();
    if (previousNavigation) {
      NavigationService.navigation = previousNavigation;
    } else {
      NavigationService.resetForTesting();
    }
    if (previousStore) {
      ReduxService.store = previousStore;
    }
  };

  return {
    ...rendered,
    container: container as NavigationContainerRef<ParamListBase>,
    getFocusedPath: () => getFocusedRoutePath(container),
    getRootState: () => container.getRootState(),
    cleanup,
  };
}

export type RenderedDeeplinkNavigation = Awaited<
  ReturnType<typeof renderDeeplinkNavigation>
>;

import React, { useCallback, useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import {
  CommonActions,
  NavigationContainer,
  NavigationRouteContext,
  createNavigationContainerRef,
  type NavigationContainerRefWithCurrent,
  type NavigationProp,
  type NavigationState,
  type ParamListBase,
  type RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from '../../../constants/navigation/Routes';
import { withUnmountOnTabBlur } from '../../Views/UnmountOnBlur/UnmountOnTabBlur';
import type { BrowserParams } from '../../Views/Browser/Browser.types';
import type {
  BrowserTabHomeRouteParams,
  WalletTabHomeParams,
  WalletTabHomeRouteParams,
} from './types/navigation';
import {
  normalizeBrowserTabHomeParams,
  normalizeWalletTabHomeParams,
  replaceWalletHomeParentParams,
  useHomeTabFlatParamsBridge,
} from './homeTabFlatParamsBridge';

const RootStack = createNativeStackNavigator<ParamListBase>();
const HomeTabs = createBottomTabNavigator<ParamListBase>();
const WalletStack = createNativeStackNavigator<ParamListBase>();
const TabBrowserStack = createNativeStackNavigator<ParamListBase>();
const RootBrowserStack = createNativeStackNavigator<ParamListBase>();
const TradeStack = createNativeStackNavigator<ParamListBase>();

const HARNESS_TABS = 'HarnessTabs';
const OTHER_TAB = 'OtherTab';
const EMPTY_HOME_TAB_COMPAT_PARAMS = Object.freeze({});

const completeBrowserParams = (
  newTabUrl: string,
  timestamp: number,
): BrowserParams => ({
  newTabUrl,
  timestamp,
  showTabsView: true,
  existingTabId: 42,
  fromTrending: true,
  fromExploreSearch: true,
  fromPerps: true,
  fromBenefit: true,
  fromCard: true,
  fromWhatsHappening: true,
  fromMarketInsights: true,
  fromMoney: true,
  fromEarnStrategySelection: true,
  linkType: 'external',
  url: `${newTabUrl}/current`,
});

const mockObserveProvidedParams = jest.fn();
const mockObservePersistedParams = jest.fn();
const mockTabBrowserMount = jest.fn();
const mockTabBrowserUnmount = jest.fn();
const mockWalletSelection = jest.fn();

const walletParamsSeen: (object | undefined)[] = [];
const tabBrowserParamsSeen: (object | undefined)[] = [];
const rootBrowserParamsSeen: (object | undefined)[] = [];

let walletTabNavigation: NavigationProp<ParamListBase> | undefined;
let walletLeafNavigation: NavigationProp<ParamListBase> | undefined;
let tabBrowserNavigation: NavigationProp<ParamListBase> | undefined;
let tabBrowserLeafNavigation: NavigationProp<ParamListBase> | undefined;
let tradeLeafNavigation: NavigationProp<ParamListBase> | undefined;
let consumeWalletSelectionParams = false;
let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>;

interface HomeTabHostProps {
  route: RouteProp<ParamListBase, string>;
  navigation: NavigationProp<ParamListBase>;
}

interface BridgeHostProps extends HomeTabHostProps {
  kind: 'wallet' | 'tab-browser' | 'root-browser';
  targetChild: typeof Routes.WALLET_VIEW | typeof Routes.BROWSER_VIEW;
  children: React.ReactNode;
}

const BridgeHost = ({
  route,
  navigation,
  kind,
  targetChild,
  children,
}: BridgeHostProps) => {
  const observedNavigation = useMemo(
    () =>
      ({
        replaceParams: (params: object | undefined) => {
          mockObservePersistedParams(kind, params);
          navigation.replaceParams(params);
        },
      }) as NavigationProp<ParamListBase>,
    [kind, navigation],
  );
  const { normalizedRoute } = useHomeTabFlatParamsBridge({
    route,
    navigation: observedNavigation,
    targetChild,
  });

  mockObserveProvidedParams(kind, normalizedRoute.params);

  return (
    <NavigationRouteContext.Provider value={normalizedRoute}>
      {children}
    </NavigationRouteContext.Provider>
  );
};

const WalletViewProbe = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const params = route.params as WalletTabHomeParams | undefined;

  useEffect(() => {
    walletLeafNavigation = navigation;
  }, [navigation]);

  useEffect(() => {
    walletParamsSeen.push(params);
  }, [params]);

  useFocusEffect(
    useCallback(() => {
      if (!consumeWalletSelectionParams || params?.initialTab !== 'perps') {
        return undefined;
      }

      const timer = setTimeout(() => {
        mockWalletSelection();
        navigation.setParams({ initialTab: null });
        replaceWalletHomeParentParams(navigation);
      }, 0);

      return () => clearTimeout(timer);
    }, [navigation, params?.initialTab]),
  );

  return <Text testID="wallet-view-probe">Wallet</Text>;
};

const RevealProbe = () => (
  <Text testID="reveal-private-credential-probe">Reveal</Text>
);

const WalletFlow = () => (
  <WalletStack.Navigator initialRouteName={Routes.WALLET_VIEW}>
    <WalletStack.Screen name={Routes.WALLET_VIEW} component={WalletViewProbe} />
    <WalletStack.Screen
      name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
      component={RevealProbe}
    />
  </WalletStack.Navigator>
);

const WalletTabHomeHost = ({ route, navigation }: HomeTabHostProps) => {
  useEffect(() => {
    walletTabNavigation = navigation;
  }, [navigation]);

  return (
    <BridgeHost
      route={route}
      navigation={navigation}
      kind="wallet"
      targetChild={Routes.WALLET_VIEW}
    >
      <WalletFlow />
    </BridgeHost>
  );
};

const TabBrowserViewProbe = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useEffect(() => {
    tabBrowserLeafNavigation = navigation;
  }, [navigation]);

  useEffect(() => {
    tabBrowserParamsSeen.push(route.params);
  }, [route.params]);

  useEffect(() => {
    mockTabBrowserMount();
    return () => {
      mockTabBrowserUnmount();
    };
  }, []);

  return <Text testID="tab-browser-view-probe">Tab Browser</Text>;
};

const RootBrowserViewProbe = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();

  useEffect(() => {
    rootBrowserParamsSeen.push(route.params);
  }, [route.params]);

  return <Text testID="root-browser-view-probe">Root Browser</Text>;
};

const BrowserAssetLoaderProbe = () => (
  <Text testID="browser-asset-loader-probe">Asset loader</Text>
);

const BrowserAssetViewProbe = () => (
  <Text testID="browser-asset-view-probe">Asset view</Text>
);

const TabBrowserFlow = () => (
  <TabBrowserStack.Navigator initialRouteName={Routes.BROWSER_VIEW}>
    <TabBrowserStack.Screen
      name={Routes.BROWSER_VIEW}
      component={TabBrowserViewProbe}
    />
    <TabBrowserStack.Screen
      name={Routes.BROWSER.ASSET_LOADER}
      component={BrowserAssetLoaderProbe}
    />
    <TabBrowserStack.Screen
      name={Routes.BROWSER.ASSET_VIEW}
      component={BrowserAssetViewProbe}
    />
  </TabBrowserStack.Navigator>
);

const RootBrowserFlow = () => (
  <RootBrowserStack.Navigator initialRouteName={Routes.BROWSER_VIEW}>
    <RootBrowserStack.Screen
      name={Routes.BROWSER_VIEW}
      component={RootBrowserViewProbe}
    />
    <RootBrowserStack.Screen
      name={Routes.BROWSER.ASSET_LOADER}
      component={BrowserAssetLoaderProbe}
    />
    <RootBrowserStack.Screen
      name={Routes.BROWSER.ASSET_VIEW}
      component={BrowserAssetViewProbe}
    />
  </RootBrowserStack.Navigator>
);

const TabBrowserFlowUnmountOnBlur = withUnmountOnTabBlur(TabBrowserFlow);

const BrowserTabHomeHost = ({ route, navigation }: HomeTabHostProps) => {
  useEffect(() => {
    tabBrowserNavigation = navigation;
  }, [navigation]);

  return (
    <BridgeHost
      route={route}
      navigation={navigation}
      kind="tab-browser"
      targetChild={Routes.BROWSER_VIEW}
    >
      <Text testID="tab-browser-host-probe">Browser host</Text>
      <TabBrowserFlowUnmountOnBlur />
    </BridgeHost>
  );
};

const BrowserRootHomeHost = ({ route, navigation }: HomeTabHostProps) => (
  <BridgeHost
    route={route}
    navigation={navigation}
    kind="root-browser"
    targetChild={Routes.BROWSER_VIEW}
  >
    <RootBrowserFlow />
  </BridgeHost>
);

const TradeWalletViewProbe = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useEffect(() => {
    tradeLeafNavigation = navigation;
  }, [navigation]);

  return <Text testID="trade-wallet-view-probe">Trade Wallet</Text>;
};

const TradeWalletFlow = () => (
  <TradeStack.Navigator initialRouteName={Routes.WALLET_VIEW}>
    <TradeStack.Screen
      name={Routes.WALLET_VIEW}
      component={TradeWalletViewProbe}
    />
    <TradeStack.Screen
      name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
      component={RevealProbe}
    />
  </TradeStack.Navigator>
);

const OtherTabProbe = () => <Text testID="other-tab-probe">Other</Text>;

const HomeTabsFlow = () => (
  <HomeTabs.Navigator initialRouteName={Routes.WALLET.HOME} tabBar={() => null}>
    <HomeTabs.Screen
      name={Routes.WALLET.HOME}
      component={WalletTabHomeHost}
      initialParams={EMPTY_HOME_TAB_COMPAT_PARAMS}
    />
    <HomeTabs.Screen
      name={Routes.BROWSER.HOME}
      component={BrowserTabHomeHost}
      initialParams={EMPTY_HOME_TAB_COMPAT_PARAMS}
    />
    <HomeTabs.Screen name={OTHER_TAB} component={OtherTabProbe} />
    <HomeTabs.Screen
      name={Routes.MODAL.TRADE_WALLET_ACTIONS}
      component={TradeWalletFlow}
    />
  </HomeTabs.Navigator>
);

const renderNavigation = () => {
  const navigationRef = createNavigationContainerRef<ParamListBase>();

  render(
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator initialRouteName={HARNESS_TABS}>
        <RootStack.Screen name={HARNESS_TABS} component={HomeTabsFlow} />
        <RootStack.Screen
          name={Routes.BROWSER.HOME}
          component={BrowserRootHomeHost}
          initialParams={EMPTY_HOME_TAB_COMPAT_PARAMS}
        />
      </RootStack.Navigator>
    </NavigationContainer>,
  );

  return navigationRef;
};

const requireNavigation = (
  navigation: NavigationProp<ParamListBase> | undefined,
  label: string,
): NavigationProp<ParamListBase> => {
  if (!navigation) {
    throw new Error(`${label} navigation is unavailable`);
  }

  return navigation;
};

const navigate = async (
  navigation: NavigationProp<ParamListBase>,
  name: string,
  params?: object,
) => {
  await act(async () => {
    if (params === undefined) {
      navigation.navigate(name);
    } else {
      navigation.navigate(name, params);
    }
  });
};

const getNestedState = (
  navigationRef: NavigationContainerRefWithCurrent<ParamListBase>,
  routeNames: string[],
): NavigationState => {
  let state = navigationRef.getRootState();

  for (const routeName of routeNames) {
    const route = state.routes.find(
      (candidate) => candidate.name === routeName,
    );
    if (!route?.state) {
      throw new Error(`Route ${routeName} has no nested state`);
    }
    state = route.state as NavigationState;
  }

  return state;
};

const getRoute = (state: NavigationState, name: string) => {
  const route = state.routes.find((candidate) => candidate.name === name);
  if (!route) {
    throw new Error(`Route ${name} is unavailable`);
  }

  return route;
};

describe('homeTabFlatParamsBridge normalizers', () => {
  it('normalizes direct and double-nested Wallet home requests', () => {
    const params = { openNetworkSelector: true };
    const direct = {
      screen: Routes.WALLET_VIEW,
      params,
    } as WalletTabHomeRouteParams;
    const doubleNested = {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: direct,
    } as WalletTabHomeRouteParams;

    const normalizedDirect = normalizeWalletTabHomeParams(direct);
    const normalizedDoubleNested = normalizeWalletTabHomeParams(doubleNested);

    expect(normalizedDirect).toEqual({
      screen: Routes.WALLET_VIEW,
      params,
      pop: true,
    });
    expect(normalizedDoubleNested).toEqual(normalizedDirect);
  });

  it('preserves non-home children and nested state objects', () => {
    const reveal = {
      screen: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    } as WalletTabHomeRouteParams;
    const state = {
      state: {
        index: 1,
        routes: [
          { name: Routes.WALLET_VIEW },
          { name: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL },
        ],
      },
    } as WalletTabHomeRouteParams;

    const normalizedReveal = normalizeWalletTabHomeParams(reveal);
    const normalizedState = normalizeWalletTabHomeParams(state);

    expect(normalizedReveal).toBe(reveal);
    expect(normalizedState).toBe(state);
  });

  it('adds pop only to the Browser leaf request', () => {
    const browserParams = {
      newTabUrl: 'https://browser.example',
      timestamp: 1,
    };
    const assetRequest = {
      screen: Routes.BROWSER.ASSET_LOADER,
    } as BrowserTabHomeRouteParams;

    const normalizedHome = normalizeBrowserTabHomeParams(browserParams);
    const normalizedAsset = normalizeBrowserTabHomeParams(assetRequest);

    expect(normalizedHome).toEqual({
      screen: Routes.BROWSER_VIEW,
      params: browserParams,
      pop: true,
    });
    expect(normalizedAsset).toBe(assetRequest);
  });
});

describe('homeTabFlatParamsBridge real navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation((message) => {
        if (
          message !==
          'Looks like RNSScreensRefContext is missing. Make sure the ScreenStack component is wrapped in it'
        ) {
          throw new Error(`Unexpected console warning: ${String(message)}`);
        }
      });
    walletParamsSeen.length = 0;
    tabBrowserParamsSeen.length = 0;
    rootBrowserParamsSeen.length = 0;
    walletTabNavigation = undefined;
    walletLeafNavigation = undefined;
    tabBrowserNavigation = undefined;
    tabBrowserLeafNavigation = undefined;
    tradeLeafNavigation = undefined;
    consumeWalletSelectionParams = false;
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('persists the exact normalized object exposed to the child navigator', async () => {
    renderNavigation();

    await waitFor(() => {
      expect(mockObservePersistedParams).toHaveBeenCalled();
    });
    const persistedParams = mockObservePersistedParams.mock.calls.find(
      ([kind]) => kind === 'wallet',
    )?.[1];
    const sharedIdentityWasObserved = mockObserveProvidedParams.mock.calls.some(
      ([kind, providedParams]) =>
        kind === 'wallet' && providedParams === persistedParams,
    );

    expect(persistedParams).toBeDefined();
    expect(sharedIdentityWasObserved).toBe(true);
  });

  it('delivers flat Browser params on the Browser leaf first render', async () => {
    const browserParams = completeBrowserParams('https://first.example', 1);
    renderNavigation();

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.BROWSER.HOME,
      browserParams,
    );

    expect(tabBrowserParamsSeen[0]).toEqual(browserParams);
  });

  it('delivers nested Browser params through the retained child navigator', async () => {
    const browserParams = completeBrowserParams('https://nested.example', 2);
    const navigationRef = renderNavigation();

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.BROWSER.HOME,
      {
        screen: Routes.BROWSER_VIEW,
        params: browserParams,
      },
    );

    const browserState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.BROWSER.HOME,
    ]);
    expect(getRoute(browserState, Routes.BROWSER_VIEW).params).toStrictEqual(
      browserParams,
    );
    expect(tabBrowserParamsSeen[0]).toEqual(browserParams);
  });

  it.each([
    [
      'direct',
      {
        screen: Routes.WALLET_VIEW,
        params: { openNetworkSelector: true },
      },
    ],
    [
      'double-nested',
      {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
          params: { openNetworkSelector: true },
        },
      },
    ],
  ])('delivers %s Wallet params', async (_label, params) => {
    renderNavigation();

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
      params,
    );

    expect(walletParamsSeen).toContainEqual({ openNetworkSelector: true });
  });

  it('restores nested Wallet state unchanged', async () => {
    const navigationRef = renderNavigation();
    const stateParams = {
      state: {
        index: 1,
        routes: [
          { name: Routes.WALLET_VIEW },
          { name: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL },
        ],
      },
    };

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
      stateParams,
    );

    const walletState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.WALLET.HOME,
    ]);
    expect(walletState.routes.map((route) => route.name)).toEqual([
      Routes.WALLET_VIEW,
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    ]);
    expect(walletState.index).toBe(1);
  });

  it('reselects Wallet from Reveal with its original key and history', async () => {
    const navigationRef = renderNavigation();
    const initialWalletState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.WALLET.HOME,
    ]);
    const originalWalletKey = getRoute(
      initialWalletState,
      Routes.WALLET_VIEW,
    ).key;
    await navigate(
      requireNavigation(walletLeafNavigation, 'Wallet leaf'),
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    );

    mockObservePersistedParams.mockClear();
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
    );
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
    );
    await waitFor(() => {
      expect(
        mockObservePersistedParams.mock.calls.filter(
          ([kind]) => kind === 'wallet',
        ),
      ).toHaveLength(2);
    });

    const reselectedWalletState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.WALLET.HOME,
    ]);
    const walletPulses = mockObservePersistedParams.mock.calls
      .filter(([kind]) => kind === 'wallet')
      .map(([, params]) => params);
    expect(reselectedWalletState.routes).toHaveLength(1);
    expect(reselectedWalletState.routes[0]).toMatchObject({
      key: originalWalletKey,
      name: Routes.WALLET_VIEW,
    });
    expect(walletPulses).toEqual([
      { screen: Routes.WALLET_VIEW, pop: true },
      { screen: Routes.WALLET_VIEW, pop: true },
    ]);
    expect(walletPulses[1]).not.toBe(walletPulses[0]);
  });

  it('pops Browser assets to the original Browser key for repeated URLs', async () => {
    const navigationRef = renderNavigation();
    const firstParams = {
      newTabUrl: 'https://first.example',
      timestamp: 1,
    };
    const secondParams = {
      newTabUrl: 'https://second.example',
      timestamp: 2,
    };
    const thirdParams = {
      newTabUrl: 'https://third.example',
      timestamp: 3,
    };
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.BROWSER.HOME,
      firstParams,
    );
    expect(tabBrowserParamsSeen).toContainEqual(firstParams);
    const initialBrowserState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.BROWSER.HOME,
    ]);
    const originalBrowserKey = getRoute(
      initialBrowserState,
      Routes.BROWSER_VIEW,
    ).key;
    await navigate(
      requireNavigation(tabBrowserLeafNavigation, 'Browser leaf'),
      Routes.BROWSER.ASSET_LOADER,
    );

    await navigate(
      requireNavigation(tabBrowserNavigation, 'Browser tab'),
      Routes.BROWSER.HOME,
      secondParams,
    );
    await waitFor(() => {
      expect(tabBrowserParamsSeen).toContainEqual(secondParams);
    });
    await navigate(
      requireNavigation(tabBrowserNavigation, 'Browser tab'),
      Routes.BROWSER.HOME,
      thirdParams,
    );
    await waitFor(() => {
      expect(tabBrowserParamsSeen).toContainEqual(thirdParams);
    });

    const browserState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.BROWSER.HOME,
    ]);
    expect(browserState.routes).toHaveLength(1);
    expect(browserState.routes[0]).toMatchObject({
      key: originalBrowserKey,
      name: Routes.BROWSER_VIEW,
      params: thirdParams,
    });
  });

  it('reselects the existing Browser leaf after a bare home request', async () => {
    const navigationRef = renderNavigation();
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.BROWSER.HOME,
    );
    const initialBrowserState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.BROWSER.HOME,
    ]);
    const originalBrowserKey = getRoute(
      initialBrowserState,
      Routes.BROWSER_VIEW,
    ).key;
    await navigate(
      requireNavigation(tabBrowserLeafNavigation, 'Browser leaf'),
      Routes.BROWSER.ASSET_VIEW,
    );

    mockObservePersistedParams.mockClear();
    await navigate(
      requireNavigation(tabBrowserNavigation, 'Browser tab'),
      Routes.BROWSER.HOME,
    );
    await navigate(
      requireNavigation(tabBrowserNavigation, 'Browser tab'),
      Routes.BROWSER.HOME,
    );
    await waitFor(() => {
      expect(
        mockObservePersistedParams.mock.calls.filter(
          ([kind]) => kind === 'tab-browser',
        ),
      ).toHaveLength(2);
    });

    const reselectedBrowserState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.BROWSER.HOME,
    ]);
    const browserPulses = mockObservePersistedParams.mock.calls
      .filter(([kind]) => kind === 'tab-browser')
      .map(([, params]) => params);
    expect(reselectedBrowserState.routes).toHaveLength(1);
    expect(reselectedBrowserState.routes[0]).toMatchObject({
      key: originalBrowserKey,
      name: Routes.BROWSER_VIEW,
    });
    expect(browserPulses).toEqual([
      { screen: Routes.BROWSER_VIEW, pop: true },
      { screen: Routes.BROWSER_VIEW, pop: true },
    ]);
    expect(browserPulses[1]).not.toBe(browserPulses[0]);
  });

  it('cleans Wallet selection params before a native-style reselection', async () => {
    consumeWalletSelectionParams = true;
    const navigationRef = renderNavigation();

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
      { initialTab: 'perps' },
    );
    await waitFor(() => {
      expect(mockWalletSelection).toHaveBeenCalledTimes(1);
    });
    const tabsStateAfterCleanup = getNestedState(navigationRef, [HARNESS_TABS]);
    expect(
      getRoute(tabsStateAfterCleanup, Routes.WALLET.HOME).params,
    ).toStrictEqual({
      screen: Routes.WALLET_VIEW,
      pop: true,
    });

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      OTHER_TAB,
    );
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
    );

    expect(mockWalletSelection).toHaveBeenCalledTimes(1);
  });

  it('resolves Browser separately in tab and root navigation contexts', async () => {
    const navigationRef = renderNavigation();

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.BROWSER.HOME,
      { newTabUrl: 'https://tab.example', timestamp: 1 },
    );
    await act(async () => {
      navigationRef.dispatch({
        ...CommonActions.navigate(Routes.BROWSER.HOME, {
          newTabUrl: 'https://root.example',
          timestamp: 2,
        }),
        target: navigationRef.getRootState().key,
      });
    });
    await waitFor(() => {
      expect(rootBrowserParamsSeen).toContainEqual({
        newTabUrl: 'https://root.example',
        timestamp: 2,
      });
    });

    const rootState = navigationRef.getRootState();
    const rootBrowserState = getNestedState(navigationRef, [
      Routes.BROWSER.HOME,
    ]);
    const tabBrowserState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.BROWSER.HOME,
    ]);
    expect(rootState.routes[rootState.index].name).toBe(Routes.BROWSER.HOME);
    expect(
      getRoute(rootBrowserState, Routes.BROWSER_VIEW).params,
    ).toStrictEqual({
      newTabUrl: 'https://root.example',
      timestamp: 2,
    });
    expect(getRoute(tabBrowserState, Routes.BROWSER_VIEW).params).toStrictEqual(
      {
        newTabUrl: 'https://tab.example',
        timestamp: 1,
      },
    );
  });

  it('keeps the Browser tab host mounted while its flow unmounts on blur', async () => {
    renderNavigation();
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.BROWSER.HOME,
    );

    await navigate(
      requireNavigation(tabBrowserNavigation, 'Browser tab'),
      OTHER_TAB,
    );

    expect(
      screen.getByTestId('tab-browser-host-probe', {
        includeHiddenElements: true,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByTestId('tab-browser-view-probe', {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(mockTabBrowserMount).toHaveBeenCalledTimes(1);
    expect(mockTabBrowserUnmount).toHaveBeenCalledTimes(1);
  });

  it('keeps Trade child history independent from Wallet home requests', async () => {
    const navigationRef = renderNavigation();
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.MODAL.TRADE_WALLET_ACTIONS,
    );
    await navigate(
      requireNavigation(tradeLeafNavigation, 'Trade leaf'),
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    );

    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.WALLET.HOME,
    );
    await navigate(
      requireNavigation(walletTabNavigation, 'Wallet tab'),
      Routes.MODAL.TRADE_WALLET_ACTIONS,
    );

    const tradeState = getNestedState(navigationRef, [
      HARNESS_TABS,
      Routes.MODAL.TRADE_WALLET_ACTIONS,
    ]);
    expect(tradeState.routes.map((route) => route.name)).toEqual([
      Routes.WALLET_VIEW,
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    ]);
    expect(tradeState.index).toBe(1);
  });
});

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
const Root = createNativeStackNavigator<ParamListBase>();
const Tabs = createBottomTabNavigator<ParamListBase>();
const WalletStack = createNativeStackNavigator<ParamListBase>();
const TabBrowserStack = createNativeStackNavigator<ParamListBase>();
const RootBrowserStack = createNativeStackNavigator<ParamListBase>();
const TradeStack = createNativeStackNavigator<ParamListBase>();
const HARNESS = 'HarnessTabs';
const OTHER = 'OtherTab';
const EMPTY_PARAMS = Object.freeze({});
type Navigation = NavigationProp<ParamListBase>;
type Kind = 'wallet' | 'tab-browser' | 'root-browser';
type NavKey = Kind | 'wallet-leaf' | 'browser-leaf' | 'trade-leaf';
interface HostProps {
  route: RouteProp<ParamListBase, string>;
  navigation: Navigation;
}
let navigations: Partial<Record<NavKey, Navigation>> = {};
let consumeWalletParams = false;
let warnSpy: jest.SpiedFunction<typeof console.warn>;
const seen: Record<Kind, (object | undefined)[]> = {
  wallet: [],
  'tab-browser': [],
  'root-browser': [],
};
const mockProvided = jest.fn();
const mockPersisted = jest.fn();
const mockBrowserUnmount = jest.fn();
const mockWalletSelection = jest.fn();
const BridgeHost = ({
  route,
  navigation,
  kind,
  targetChild,
  children,
}: HostProps & {
  kind: Kind;
  targetChild: typeof Routes.WALLET_VIEW | typeof Routes.BROWSER_VIEW;
  children: React.ReactNode;
}) => {
  const observedNavigation = useMemo(
    () =>
      ({
        replaceParams: (params: object | undefined) => {
          mockPersisted(kind, params);
          navigation.replaceParams(params);
        },
      }) as Navigation,
    [kind, navigation],
  );
  const { normalizedRoute } = useHomeTabFlatParamsBridge({
    route,
    navigation: observedNavigation,
    targetChild,
  });
  mockProvided(kind, normalizedRoute.params);
  return (
    <NavigationRouteContext.Provider value={normalizedRoute}>
      {children}
    </NavigationRouteContext.Provider>
  );
};
const WalletProbe = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const navigation = useNavigation<Navigation>();
  const params = route.params as WalletTabHomeParams | undefined;
  useEffect(() => {
    navigations['wallet-leaf'] = navigation;
  }, [navigation]);
  useEffect(() => {
    seen.wallet.push(params);
  }, [params]);
  useFocusEffect(
    useCallback(() => {
      if (!consumeWalletParams || params?.initialTab !== 'perps') {
        return undefined;
      }
      const timer = setTimeout(() => {
        mockWalletSelection();
        navigation.setParams({ initialTab: null });
        replaceWalletHomeParentParams(navigation);
      });
      return () => clearTimeout(timer);
    }, [navigation, params?.initialTab]),
  );
  return <Text testID="wallet-probe">Wallet</Text>;
};
const TabBrowserProbe = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  const navigation = useNavigation<Navigation>();
  useEffect(() => {
    navigations['browser-leaf'] = navigation;
  }, [navigation]);
  useEffect(() => {
    seen['tab-browser'].push(route.params);
  }, [route.params]);
  useEffect(() => mockBrowserUnmount, []);
  return <Text testID="tab-browser-probe">Browser</Text>;
};
const RootBrowserProbe = () => {
  const route = useRoute<RouteProp<ParamListBase, string>>();
  useEffect(() => {
    seen['root-browser'].push(route.params);
  }, [route.params]);
  return <Text testID="root-browser-probe">Root browser</Text>;
};
const TradeProbe = () => {
  const navigation = useNavigation<Navigation>();
  useEffect(() => {
    navigations['trade-leaf'] = navigation;
  }, [navigation]);
  return <Text>Trade</Text>;
};
const EmptyProbe = () => null;
const ChildFlow = ({
  navigator: Stack,
  view: View,
  browser = false,
}: {
  navigator: typeof WalletStack;
  view: React.ComponentType;
  browser?: boolean;
}) => (
  <Stack.Navigator
    initialRouteName={browser ? Routes.BROWSER_VIEW : Routes.WALLET_VIEW}
  >
    <Stack.Screen
      name={browser ? Routes.BROWSER_VIEW : Routes.WALLET_VIEW}
      component={View}
    />
    {browser ? (
      <>
        <Stack.Screen
          name={Routes.BROWSER.ASSET_LOADER}
          component={EmptyProbe}
        />
        <Stack.Screen name={Routes.BROWSER.ASSET_VIEW} component={EmptyProbe} />
      </>
    ) : (
      <Stack.Screen
        name={Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL}
        component={EmptyProbe}
      />
    )}
  </Stack.Navigator>
);
const WalletFlow = () => (
  <ChildFlow navigator={WalletStack} view={WalletProbe} />
);
const TabBrowserFlow = () => (
  <ChildFlow navigator={TabBrowserStack} view={TabBrowserProbe} browser />
);
const RootBrowserFlow = () => (
  <ChildFlow navigator={RootBrowserStack} view={RootBrowserProbe} browser />
);
const TradeFlow = () => <ChildFlow navigator={TradeStack} view={TradeProbe} />;
const UnmountingTabBrowserFlow = withUnmountOnTabBlur(TabBrowserFlow);
const makeHost = (
  kind: Kind,
  targetChild: typeof Routes.WALLET_VIEW | typeof Routes.BROWSER_VIEW,
  Flow: React.ComponentType,
  showHostProbe = false,
) => {
  const Host = ({ route, navigation }: HostProps) => {
    useEffect(() => {
      navigations[kind] = navigation;
    }, [navigation]);
    return (
      <BridgeHost
        route={route}
        navigation={navigation}
        kind={kind}
        targetChild={targetChild}
      >
        {showHostProbe ? <Text testID="browser-host">Host</Text> : null}
        <Flow />
      </BridgeHost>
    );
  };
  return Host;
};
const WalletHost = makeHost('wallet', Routes.WALLET_VIEW, WalletFlow);
const TabBrowserHost = makeHost(
  'tab-browser',
  Routes.BROWSER_VIEW,
  UnmountingTabBrowserFlow,
  true,
);
const RootBrowserHost = makeHost(
  'root-browser',
  Routes.BROWSER_VIEW,
  RootBrowserFlow,
);
const Other = () => <Text testID="other">Other</Text>;
const HomeTabs = () => (
  <Tabs.Navigator initialRouteName={Routes.WALLET.HOME} tabBar={() => null}>
    <Tabs.Screen
      name={Routes.WALLET.HOME}
      component={WalletHost}
      initialParams={EMPTY_PARAMS}
    />
    <Tabs.Screen
      name={Routes.BROWSER.HOME}
      component={TabBrowserHost}
      initialParams={EMPTY_PARAMS}
    />
    <Tabs.Screen name={OTHER} component={Other} />
    <Tabs.Screen
      name={Routes.MODAL.TRADE_WALLET_ACTIONS}
      component={TradeFlow}
    />
  </Tabs.Navigator>
);
const renderNavigation = () => {
  const ref = createNavigationContainerRef<ParamListBase>();
  render(
    <NavigationContainer ref={ref}>
      <Root.Navigator initialRouteName={HARNESS}>
        <Root.Screen name={HARNESS} component={HomeTabs} />
        <Root.Screen
          name={Routes.BROWSER.HOME}
          component={RootBrowserHost}
          initialParams={EMPTY_PARAMS}
        />
      </Root.Navigator>
    </NavigationContainer>,
  );
  return ref;
};
const getNavigation = (key: NavKey): Navigation => {
  const navigation = navigations[key];
  if (!navigation) {
    throw new Error(`${key} navigation is unavailable`);
  }
  return navigation;
};
const navigate = async (key: NavKey, name: string, params?: object) => {
  await act(async () => {
    const navigation = getNavigation(key);
    params === undefined
      ? navigation.navigate(name)
      : navigation.navigate(name, params);
  });
};
const nestedState = (
  ref: NavigationContainerRefWithCurrent<ParamListBase>,
  routeNames: string[],
): NavigationState => {
  let state = ref.getRootState();
  for (const name of routeNames) {
    const child = state.routes.find((route) => route.name === name)?.state;
    if (!child) {
      throw new Error(`${name} has no nested state`);
    }
    state = child as NavigationState;
  }
  return state;
};
const getRoute = (state: NavigationState, name: string) => {
  const route = state.routes.find((candidate) => candidate.name === name);
  if (!route) {
    throw new Error(`${name} is unavailable`);
  }
  return route;
};
const homeState = (
  ref: NavigationContainerRefWithCurrent<ParamListBase>,
  home: string,
) => nestedState(ref, [HARNESS, home]);
describe('homeTabFlatParamsBridge normalizers', () => {
  it('normalizes home requests while preserving child and state payloads', () => {
    const params = { openNetworkSelector: true };
    const direct = { screen: Routes.WALLET_VIEW, params };
    const state = {
      state: { index: 0, routes: [{ name: Routes.WALLET_VIEW }] },
    };
    const reveal = { screen: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL };
    expect(
      normalizeWalletTabHomeParams(direct as WalletTabHomeRouteParams),
    ).toEqual({ ...direct, pop: true });
    expect(
      normalizeWalletTabHomeParams({
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: direct,
      } as WalletTabHomeRouteParams),
    ).toEqual({ ...direct, pop: true });
    expect(
      normalizeWalletTabHomeParams(state as WalletTabHomeRouteParams),
    ).toBe(state);
    expect(
      normalizeWalletTabHomeParams(reveal as WalletTabHomeRouteParams),
    ).toBe(reveal);
    const browser = { newTabUrl: 'https://browser.test', timestamp: 1 };
    expect(normalizeBrowserTabHomeParams(browser)).toEqual({
      screen: Routes.BROWSER_VIEW,
      params: browser,
      pop: true,
    });
    const asset = { screen: Routes.BROWSER.ASSET_LOADER };
    expect(
      normalizeBrowserTabHomeParams(asset as BrowserTabHomeRouteParams),
    ).toBe(asset);
  });
});
describe('homeTabFlatParamsBridge real navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigations = {};
    Object.values(seen).forEach((values) => {
      values.length = 0;
    });
    consumeWalletParams = false;
    warnSpy = jest.spyOn(console, 'warn').mockImplementation((message) => {
      if (
        message !==
        'Looks like RNSScreensRefContext is missing. Make sure the ScreenStack component is wrapped in it'
      ) {
        throw new Error(`Unexpected console warning: ${String(message)}`);
      }
    });
  });
  afterEach(() => warnSpy.mockRestore());
  it('bridges flat, nested, and restored state without duplicate leaves', async () => {
    const ref = renderNavigation();
    await waitFor(() => expect(mockPersisted).toHaveBeenCalled());
    const persisted = mockPersisted.mock.calls.find(
      ([kind]) => kind === 'wallet',
    )?.[1];
    expect(
      mockProvided.mock.calls.some(
        ([kind, provided]) => kind === 'wallet' && provided === persisted,
      ),
    ).toBe(true);
    expect(homeState(ref, Routes.WALLET.HOME).routes).toHaveLength(1);
    const flatBrowser: BrowserParams = {
      newTabUrl: 'https://flat.test',
      timestamp: 1,
      showTabsView: true,
      fromMoney: true,
    };
    await navigate('wallet', Routes.BROWSER.HOME, flatBrowser);
    expect(seen['tab-browser'][0]).toEqual(flatBrowser);
    const nestedBrowser = { newTabUrl: 'https://nested.test', timestamp: 2 };
    await navigate('tab-browser', Routes.BROWSER.HOME, {
      screen: Routes.BROWSER_VIEW,
      params: nestedBrowser,
    });
    await waitFor(() =>
      expect(seen['tab-browser']).toContainEqual(nestedBrowser),
    );
    expect(
      getRoute(homeState(ref, Routes.BROWSER.HOME), Routes.BROWSER_VIEW).params,
    ).toEqual(nestedBrowser);
    for (const request of [
      { screen: Routes.WALLET_VIEW, params: { openNetworkSelector: true } },
      {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
          params: { openNetworkSelector: true },
        },
      },
    ]) {
      await navigate('wallet', Routes.WALLET.HOME, request);
      expect(seen.wallet).toContainEqual({ openNetworkSelector: true });
    }
    await navigate('wallet', Routes.WALLET.HOME, {
      state: {
        index: 1,
        routes: [
          { name: Routes.WALLET_VIEW },
          { name: Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL },
        ],
      },
    });
    const restored = homeState(ref, Routes.WALLET.HOME);
    expect(restored.routes.map((route) => route.name)).toEqual([
      Routes.WALLET_VIEW,
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    ]);
    expect(restored.index).toBe(1);
  });
  it('reselects Wallet without duplicating it or changing Trade history', async () => {
    const ref = renderNavigation();
    const originalKey = getRoute(
      homeState(ref, Routes.WALLET.HOME),
      Routes.WALLET_VIEW,
    ).key;
    await navigate('wallet-leaf', Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL);
    mockPersisted.mockClear();
    await navigate('wallet', Routes.WALLET.HOME);
    await navigate('wallet', Routes.WALLET.HOME);
    await waitFor(() =>
      expect(
        mockPersisted.mock.calls.filter(([kind]) => kind === 'wallet'),
      ).toHaveLength(2),
    );
    const wallet = homeState(ref, Routes.WALLET.HOME);
    expect(wallet.routes).toHaveLength(1);
    expect(wallet.routes[0]).toMatchObject({
      key: originalKey,
      name: Routes.WALLET_VIEW,
    });
    consumeWalletParams = true;
    await navigate('wallet', Routes.WALLET.HOME, { initialTab: 'perps' });
    await waitFor(() => expect(mockWalletSelection).toHaveBeenCalledTimes(1));
    expect(
      getRoute(nestedState(ref, [HARNESS]), Routes.WALLET.HOME).params,
    ).toEqual({ screen: Routes.WALLET_VIEW, pop: true });
    await navigate('wallet', OTHER);
    await navigate('wallet', Routes.WALLET.HOME);
    expect(mockWalletSelection).toHaveBeenCalledTimes(1);
    await navigate('wallet', Routes.MODAL.TRADE_WALLET_ACTIONS);
    await navigate('trade-leaf', Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL);
    await navigate('wallet', Routes.WALLET.HOME);
    await navigate('wallet', Routes.MODAL.TRADE_WALLET_ACTIONS);
    const trade = homeState(ref, Routes.MODAL.TRADE_WALLET_ACTIONS);
    expect(trade.routes.map((route) => route.name)).toEqual([
      Routes.WALLET_VIEW,
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
    ]);
    expect(trade.index).toBe(1);
  });
  it('reuses Browser leaves across repeated, bare, tab, and root requests', async () => {
    const ref = renderNavigation();
    const first = { newTabUrl: 'https://first.test', timestamp: 1 };
    await navigate('wallet', Routes.BROWSER.HOME, first);
    expect(seen['tab-browser']).toContainEqual(first);
    const originalKey = getRoute(
      homeState(ref, Routes.BROWSER.HOME),
      Routes.BROWSER_VIEW,
    ).key;
    await navigate('browser-leaf', Routes.BROWSER.ASSET_LOADER);
    for (const params of [
      { newTabUrl: 'https://second.test', timestamp: 2 },
      { newTabUrl: 'https://third.test', timestamp: 3 },
    ]) {
      await navigate('tab-browser', Routes.BROWSER.HOME, params);
      await waitFor(() => expect(seen['tab-browser']).toContainEqual(params));
    }
    expect(
      getRoute(homeState(ref, Routes.BROWSER.HOME), Routes.BROWSER_VIEW),
    ).toMatchObject({
      key: originalKey,
      params: { newTabUrl: 'https://third.test', timestamp: 3 },
    });
    await navigate('browser-leaf', Routes.BROWSER.ASSET_VIEW);
    mockPersisted.mockClear();
    await navigate('tab-browser', Routes.BROWSER.HOME);
    await navigate('tab-browser', Routes.BROWSER.HOME);
    await waitFor(() =>
      expect(
        mockPersisted.mock.calls.filter(([kind]) => kind === 'tab-browser'),
      ).toHaveLength(2),
    );
    const browser = homeState(ref, Routes.BROWSER.HOME);
    expect(browser.routes).toHaveLength(1);
    expect(browser.index).toBe(0);
    expect(browser.routes[0]).toMatchObject({
      key: originalKey,
      name: Routes.BROWSER_VIEW,
    });
    const tabParams = { newTabUrl: 'https://tab.test', timestamp: 4 };
    await navigate('tab-browser', Routes.BROWSER.HOME, tabParams);
    const rootParams = { newTabUrl: 'https://root.test', timestamp: 5 };
    await act(async () => {
      ref.dispatch({
        ...CommonActions.navigate(Routes.BROWSER.HOME, rootParams),
        target: ref.getRootState().key,
      });
    });
    await waitFor(() =>
      expect(seen['root-browser']).toContainEqual(rootParams),
    );
    expect(
      getRoute(nestedState(ref, [Routes.BROWSER.HOME]), Routes.BROWSER_VIEW)
        .params,
    ).toEqual(rootParams);
    expect(
      getRoute(homeState(ref, Routes.BROWSER.HOME), Routes.BROWSER_VIEW).params,
    ).toEqual(tabParams);
    await navigate('tab-browser', OTHER);
    expect(
      screen.getByTestId('browser-host', { includeHiddenElements: true }),
    ).toBeTruthy();
    expect(
      screen.queryByTestId('tab-browser-probe', {
        includeHiddenElements: true,
      }),
    ).toBeNull();
    expect(mockBrowserUnmount).toHaveBeenCalledTimes(1);
  });
});

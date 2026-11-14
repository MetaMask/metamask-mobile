import React from 'react';
import { act } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import initialRootState from '../../../util/test/initial-root-state';
import { createMockUIMessenger } from '../../../util/test/mock-ui-messenger';
import Routes from '../../../constants/navigation/Routes';
import MainNavigator from './MainNavigator';

/**
 * Unit test: component-view mounts screens through renderScreenWithRoutes.
 * This file mounts MainNavigator with stubbed Wallet and Browser screens so
 * it can read the real navigation state.
 */
jest.mock('./HomeTabs/useIsNativeTabBar', () => ({
  useIsNativeTabBar: () => false,
}));

jest.mock('../../Views/Settings/SecuritySettings', () => () => null);

jest.mock('../../Views/Wallet', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Wallet = ({
    route,
  }: {
    route?: { params?: { initialTab?: string } };
  }) =>
    ReactActual.createElement(
      Text,
      null,
      route?.params?.initialTab ?? 'wallet',
    );
  return { __esModule: true, default: Wallet };
});

jest.mock('../../Views/Browser', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const Browser = ({
    route,
  }: {
    route?: { params?: { newTabUrl?: string } };
  }) =>
    ReactActual.createElement(
      Text,
      null,
      route?.params?.newTabUrl ?? 'browser',
    );
  return { __esModule: true, default: Browser };
});

type NavState = NavigationState | PartialState<NavigationState>;

interface FocusedRoute {
  name: string;
  state?: NavState;
}

/**
 * Counts navigator states on the real MainNavigator.
 * Wallet home and the in-tab browser are the main stack, then HomeTabs.
 * NavigationChildren and AppFlow live in NavigationProvider and App, outside
 * this render.
 */
const countFocusedNavigatorDepth = (state: NavState | undefined): number => {
  let depth = 0;
  let current = state;
  while (current?.routes) {
    depth += 1;
    const index = current.index ?? 0;
    current = current.routes[index]?.state;
  }
  return depth;
};

const focusedRoute = (
  state: NavState | undefined,
): FocusedRoute | undefined => {
  let current = state;
  let route: FocusedRoute | undefined;
  while (current?.routes) {
    const index = current.index ?? 0;
    route = current.routes[index];
    current = route?.state;
  }
  return route;
};

describe('focused navigation depth', () => {
  it('counts two navigator states for wallet home and the in-tab browser', async () => {
    const navigationRef = createNavigationContainerRef();
    const uiMessenger = createMockUIMessenger();
    // The wallet tab renders after route-messenger delegation resolves.
    uiMessenger.delegate = async () => undefined;

    const { findByText } = renderWithProvider(
      <NavigationContainer ref={navigationRef}>
        <MainNavigator />
      </NavigationContainer>,
      { state: initialRootState, uiMessenger },
      false,
    );

    expect(await findByText('wallet')).toBeOnTheScreen();
    expect(countFocusedNavigatorDepth(navigationRef.getRootState())).toBe(2);
    const walletRoute = focusedRoute(navigationRef.getRootState());
    expect(walletRoute?.name).toBe(Routes.WALLET.HOME);
    expect(walletRoute?.state).toBeUndefined();

    act(() => {
      navigationRef.navigate('Home', {
        screen: Routes.BROWSER.HOME,
        params: { newTabUrl: 'https://example.com' },
      });
    });

    expect(await findByText('https://example.com')).toBeOnTheScreen();
    expect(countFocusedNavigatorDepth(navigationRef.getRootState())).toBe(2);
    const browserRoute = focusedRoute(navigationRef.getRootState());
    expect(browserRoute?.name).toBe(Routes.BROWSER.HOME);
    expect(browserRoute?.state).toBeUndefined();

    act(() => {
      navigationRef.navigate('Home', {
        screen: Routes.WALLET.HOME,
        params: { initialTab: 'perps' },
      });
    });

    expect(await findByText('perps')).toBeOnTheScreen();
    expect(countFocusedNavigatorDepth(navigationRef.getRootState())).toBe(2);
    const walletWithParams = focusedRoute(navigationRef.getRootState());
    expect(walletWithParams?.name).toBe(Routes.WALLET.HOME);
    expect(walletWithParams?.state).toBeUndefined();
  });
});

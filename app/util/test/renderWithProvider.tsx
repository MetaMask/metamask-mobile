import React from 'react';
import { Provider } from 'react-redux';

import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import {
  render,
  renderHook,
  RenderHookOptions,
} from '@testing-library/react-native';

import { mockTheme, ThemeContext } from '../theme';
import { Theme } from '../theme/models';
import configureStore from './configureStore';
import { RootState } from '../../reducers';
import { FeatureFlagOverrideProvider } from '../../contexts/FeatureFlagOverrideContext';
import { UIMessengerProvider } from '../../contexts/ui-messenger';
import { createMockUIMessenger } from './mock-ui-messenger';
import { RouteMessengerContext } from '../../contexts/route-messenger';
import { RouteMessenger } from '../../messengers/route-messenger';
import { UIMessenger } from '../../messengers/ui-messenger';

// DeepPartial is a generic type that recursively makes all properties of a given type T optional
export type DeepPartial<T> = T extends (...args: unknown[]) => unknown
  ? // If T is a function, return T as is.
    T
  : T extends (infer U)[]
    ? // If T is an array, apply DeepPartial to its elements.
      DeepPartial<U>[]
    : T extends object
      ? // If T is an object, apply DeepPartial to each property of T.
        { [K in keyof T]?: DeepPartial<T[K]> }
      : // Otherwise, return T or undefined.
        T | undefined;

export interface ProviderValues {
  state?: DeepPartial<RootState>;
  theme?: Theme;
  uiMessenger?: UIMessenger;
  routeMessenger?: RouteMessenger;
}

export default function renderWithProvider(
  component: React.ReactElement,
  providerValues?: ProviderValues,
  includeNavigationContainer = true,
  includeFeatureFlagOverrideProvider = true,
) {
  const {
    state = {},
    theme = mockTheme,
    uiMessenger = createMockUIMessenger(),
    routeMessenger = null,
  } = providerValues ?? {};

  const store = configureStore(state);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../store')._updateMockState(state);

  const InnerProvider = ({ children }: { children: React.ReactElement }) => {
    let wrappedChildren = children;
    if (includeFeatureFlagOverrideProvider) {
      wrappedChildren = (
        <FeatureFlagOverrideProvider>
          {wrappedChildren}
        </FeatureFlagOverrideProvider>
      );
    }

    if (routeMessenger) {
      wrappedChildren = (
        <RouteMessengerContext.Provider value={routeMessenger}>
          {wrappedChildren}
        </RouteMessengerContext.Provider>
      );
    }

    return (
      <Provider store={store}>
        <UIMessengerProvider value={uiMessenger}>
          <ThemeContext.Provider value={theme}>
            {wrappedChildren}
          </ThemeContext.Provider>
        </UIMessengerProvider>
      </Provider>
    );
  };

  const AllProviders = ({ children }: { children: React.ReactElement }) => {
    let wrappedChildren = <InnerProvider>{children}</InnerProvider>;
    if (includeNavigationContainer) {
      wrappedChildren = (
        <NavigationContainer>{wrappedChildren}</NavigationContainer>
      );
    }
    return wrappedChildren;
  };

  return { ...render(component, { wrapper: AllProviders }), store };
}

export function renderScreen(
  Component: React.ComponentType,
  options: {
    name: string;
    options?: NativeStackNavigationOptions;
  },
  providerValues?: ProviderValues,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialParams: Record<string, any> = {},
) {
  const Stack = createNativeStackNavigator();
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen
        name={options.name}
        options={options.options}
        component={Component}
        initialParams={initialParams}
      ></Stack.Screen>
    </Stack.Navigator>,
    providerValues,
  );
}

export function renderHookWithProvider<Result, Props>(
  hook: (props: Props) => Result,
  providerValues?: ProviderValues,
) {
  const {
    state = {},
    uiMessenger = createMockUIMessenger(),
    routeMessenger = null,
  } = providerValues ?? {};

  const store = configureStore(state);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../store')._updateMockState(state);

  const Providers = ({ children }: { children: React.ReactElement }) => {
    let wrappedChildren = children;
    if (routeMessenger) {
      wrappedChildren = (
        <RouteMessengerContext.Provider value={routeMessenger}>
          {wrappedChildren}
        </RouteMessengerContext.Provider>
      );
    }

    return (
      <Provider store={store}>
        <UIMessengerProvider value={uiMessenger}>
          {wrappedChildren}
        </UIMessengerProvider>
      </Provider>
    );
  };

  return {
    ...renderHook(hook, { wrapper: Providers } as RenderHookOptions<Props>),
    store,
  };
}

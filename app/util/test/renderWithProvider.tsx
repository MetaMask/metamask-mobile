import React from 'react';
import { Provider } from 'react-redux';

import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import {
  render,
  renderHook,
  RenderHookOptions,
} from '@testing-library/react-native';

import { mockTheme, ThemeContext } from '../theme';
import { Theme } from '../theme/models';
import configureStore from './configureStore';
import { RootState } from '../../reducers';

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
}

export default function renderWithProvider(
  component: React.ReactElement,
  providerValues?: ProviderValues,
  includeNavigationContainer = true,
) {
  const { state = {}, theme = mockTheme } = providerValues ?? {};
  const store = configureStore(state);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../store')._updateMockState(state);

  const InnerProvider = ({ children }: { children: React.ReactElement }) => (
    <Provider store={store}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </Provider>
  );

  const AllProviders = ({ children }: { children: React.ReactElement }) => {
    if (includeNavigationContainer) {
      return (
        <NavigationContainer>
          <InnerProvider>{children}</InnerProvider>
        </NavigationContainer>
      );
    }
    return <InnerProvider>{children}</InnerProvider>;
  };

  return { ...render(component, { wrapper: AllProviders }), store };
}

export function renderScreen(
  Component: React.ComponentType,
  options: {
    name: string;
    options?: StackNavigationOptions;
  },
  providerValues?: ProviderValues,
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialParams: Record<string, any> = {},
) {
  const Stack = createStackNavigator();
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
  const { state = {} } = providerValues ?? {};
  const store = configureStore(state);
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  require('../../store')._updateMockState(state);
  const Providers = ({ children }: { children: React.ReactElement }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    ...renderHook(hook, { wrapper: Providers } as RenderHookOptions<Props>),
    store,
  };
}

import React from 'react';
import { Provider } from 'react-redux';

import { NavigationContainer } from '@react-navigation/native';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { render, renderHook } from '@testing-library/react-native';

import { mockTheme, ThemeContext } from '../theme';
import { Theme } from '../theme/models';
import configureStore from './configureStore';
import { RootState } from '../../reducers';

type _DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer U>
  ? _DeepPartialArray<U>
  : T extends object
  ? DeepPartial<T>
  : T | undefined;

interface _DeepPartialArray<T> extends Array<_DeepPartial<T>> {}

export type DeepPartial<T> = { [P in keyof T]?: _DeepPartial<T[P]> };

interface ProviderValues {
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

export function renderHookWithProvider(
  hook: () => void,
  providerValues?: ProviderValues,
) {
  const { state = {} } = providerValues ?? {};
  const store = configureStore(state);

  const Providers = ({ children }: { children: React.ReactElement }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(hook, { wrapper: Providers });
}

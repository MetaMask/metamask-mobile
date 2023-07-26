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
  RenderHookResult,
} from '@testing-library/react-native';

import { mockTheme, ThemeContext } from '../theme';
import { Theme } from '../theme/models';
import configureStore from './configureStore';

interface ProviderValues {
  state?: Record<any, any>;
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

  return render(component, { wrapper: AllProviders });
}

export function renderScreen(
  Component: React.ComponentType,
  options: {
    name: string;
    options?: StackNavigationOptions;
  },
  providerValues?: ProviderValues,
) {
  const Stack = createStackNavigator();
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen
        name={options.name}
        options={options.options}
        component={Component}
      ></Stack.Screen>
    </Stack.Navigator>,
    providerValues,
  );
}

export function renderHookWithProvider(
  hook: () => void,
  providerValues?: ProviderValues,
): RenderHookResult<any, any> {
  const { state = {} } = providerValues ?? {};
  const store = configureStore(state);

  const Providers = ({ children }: { children: React.ReactElement }) => (
    <Provider store={store}>{children}</Provider>
  );

  return renderHook(hook, { wrapper: Providers });
}

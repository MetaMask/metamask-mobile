import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import { mockTheme, ThemeContext } from '../theme';
import configureStore from './configureStore';
import { Theme } from '../theme/models';
import {
  createStackNavigator,
  StackNavigationOptions,
} from '@react-navigation/stack';

interface ProviderValues {
  state?: Record<any, any>;
  theme?: Theme;
}

export default function renderWithProvider(
  component: React.ReactElement,
  providerValues?: ProviderValues,
) {
  const { state = {}, theme = mockTheme } = providerValues ?? {};
  const store = configureStore(state);

  const AllProviders = ({ children }: { children: React.ReactElement }) => (
    <NavigationContainer>
      <Provider store={store}>
        <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
      </Provider>
    </NavigationContainer>
  );

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

import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import { mockTheme, ThemeContext } from '../theme';
import configureStore from './configureStore';
import { Theme } from '../theme/models';

export default function renderWithProvider(
  component: React.ReactElement,
  providerValues?: {
    state?: Record<any, any>;
    theme?: Theme;
  },
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

import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import { mockTheme, ThemeContext } from '../theme';

function renderWithProvider(component: React.ReactElement, store?: any) {
  const ThemeProvider = ({ children }: { children: React.ReactElement }) => (
    <ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
  );

  if (!store) {
    return render(component, { wrapper: ThemeProvider });
  }

  const AllProviders = ({ children }: { children: React.ReactElement }) => (
    <NavigationContainer>
      <Provider store={store}>
        <ThemeProvider>{children}</ThemeProvider>
      </Provider>
    </NavigationContainer>
  );

  return render(component, { wrapper: AllProviders });
}

export default renderWithProvider;

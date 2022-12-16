import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { Provider } from 'react-redux';
import { render } from '@testing-library/react-native';
import { ThemeContext, useAppTheme } from '../theme';

function renderWithProvider(component: React.ReactElement, store: any) {
  const ConnectedRoot = ({ children }: { children: React.ReactElement }) => {
    const theme = useAppTheme();
    return (
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    );
  };

  const Wrapper = ({ children }: { children: React.ReactElement }) => (
    <NavigationContainer>
      <Provider store={store}>
        <ConnectedRoot>{children}</ConnectedRoot>
      </Provider>
    </NavigationContainer>
  );

  return render(component, { wrapper: Wrapper });
}

export default renderWithProvider;

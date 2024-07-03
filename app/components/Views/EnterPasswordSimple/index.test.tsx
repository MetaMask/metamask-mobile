import React from 'react';
import { render } from '@testing-library/react-native';
import EnterPasswordSimple from './';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from 'styled-components/native';
import { mockTheme } from '../../../util/theme';

describe('EnterPasswordSimple', () => {
  it('should render correctly', () => {
    const mockNavigation = {
      setOptions: jest.fn(),
    };

    const { toJSON } = render(
      <NavigationContainer>
        <ThemeProvider theme={mockTheme}>
          <EnterPasswordSimple route={{ params: {} }} navigation={mockNavigation} />
        </ThemeProvider>
      </NavigationContainer>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EnterPasswordSimple from './';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeContext } from '../../../util/theme';

const mockTheme = {
  colors: {
    background: { default: 'white' },
    border: { default: 'red' },
    text: { default: 'black' },
    primary: { default: 'blue' },
    warning: { default: 'yellow' },
  },
  themeAppearance: 'light',
};

describe('EnterPasswordSimple', () => {
  it('should render correctly', () => {
    render(
      <ThemeContext.Provider value={mockTheme}>
        <NavigationContainer>
          <EnterPasswordSimple route={{ params: {} }} />
        </NavigationContainer>
      </ThemeContext.Provider>,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });
});

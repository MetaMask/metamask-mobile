import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';

// External dependencies
import { ThemeContext } from '../../../util/theme';
import ThemeProvider from './ThemeProvider';

// Mocking useAppTheme
jest.mock('../../../util/theme', () => ({
  ...jest.requireActual('../../../util/theme'),
  useAppTheme: jest.fn(() => ({
    colors: {
      background: {
        alternative: 'white',
      },
    },
  })),
}));

describe('ThemeProvider', () => {
  it('renders children correctly', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <View testID="child-component" />
      </ThemeProvider>,
    );

    expect(getByTestId('child-component')).toBeTruthy();
  });

  it('provides the correct theme via ThemeContext', () => {
    let themeValue;
    const TestComponent = () => {
      themeValue = React.useContext(ThemeContext);
      return null;
    };

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(themeValue).toStrictEqual({
      colors: {
        background: {
          alternative: 'white',
        },
      },
    });
  });
});

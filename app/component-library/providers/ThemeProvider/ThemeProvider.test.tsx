import React from 'react';
import { View } from 'react-native';
import { brandColors } from '@metamask/design-tokens';

// External dependencies
import { ThemeContext } from '../../../util/theme';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Internal dependencies
import ThemeProvider from './ThemeProvider';

describe('ThemeProvider', () => {
  it('renders children correctly', () => {
    const { getByTestId } = renderWithProvider(
      <ThemeProvider>
        <View testID="child-component" />
      </ThemeProvider>,
    );

    expect(getByTestId('child-component')).toBeTruthy();
  });

  it('provides the correct theme via ThemeContext', () => {
    let themeValue = {
      brandColors: {
        black: '',
      },
    };
    const TestComponent = () => {
      themeValue = React.useContext(ThemeContext);
      return null;
    };

    renderWithProvider(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(themeValue.brandColors.black).toStrictEqual(brandColors.black);
  });
});

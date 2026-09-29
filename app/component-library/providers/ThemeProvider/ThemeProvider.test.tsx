import React from 'react';
import { View } from 'react-native';
import { brandColor } from '@metamask/design-tokens';

// External dependencies
import { mockTheme, ThemeContext } from '../../../util/theme';
import { AppThemeKey } from '../../../util/theme/models';
import renderWithProvider from '../../../util/test/renderWithProvider';

// Internal dependencies
import ThemeProvider from './ThemeProvider';
import { Theme } from '@metamask/design-system-twrnc-preset';

const mockDesignSystemThemeProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => children,
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  ThemeProvider: (props: { children: React.ReactNode; theme?: string }) =>
    mockDesignSystemThemeProvider(props),
  Theme: { Light: 'light', Dark: 'dark' },
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    expect(themeValue.brandColors.black).toStrictEqual(brandColor.black);
  });

  it('maps dark app theme to DesignSystem Theme.Dark', () => {
    renderWithProvider(
      <ThemeProvider>
        <View />
      </ThemeProvider>,
      { state: { user: { appTheme: AppThemeKey.dark } } },
    );

    expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: Theme.Dark,
      }),
    );
  });

  it('maps light app theme to DesignSystem Theme.Light', () => {
    renderWithProvider(
      <ThemeProvider>
        <View />
      </ThemeProvider>,
      { state: { user: { appTheme: AppThemeKey.light } } },
    );

    expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: Theme.Light,
      }),
    );
  });
});

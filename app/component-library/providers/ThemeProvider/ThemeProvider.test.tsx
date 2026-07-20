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

let mockIsPureBlackEnabled = false;

jest.mock('../../../util/theme/themeUtils', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

const mockDesignSystemThemeProvider = jest.fn(
  ({ children }: { children: React.ReactNode }) => children,
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  ThemeProvider: (props: {
    children: React.ReactNode;
    isPureBlack?: boolean;
    theme?: string;
  }) => mockDesignSystemThemeProvider(props),
  Theme: { Light: 'light', Dark: 'dark' },
}));

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPureBlackEnabled = false;
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

  describe('isPureBlack', () => {
    it('passes isPureBlack false to DesignSystemThemeProvider when preview flag is off in dark mode', () => {
      renderWithProvider(
        <ThemeProvider>
          <View />
        </ThemeProvider>,
        { state: { user: { appTheme: AppThemeKey.dark } } },
      );

      expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          isPureBlack: false,
          theme: Theme.Dark,
        }),
      );
    });

    it('passes isPureBlack false to DesignSystemThemeProvider when preview flag is on in light mode', () => {
      mockIsPureBlackEnabled = true;

      renderWithProvider(
        <ThemeProvider>
          <View />
        </ThemeProvider>,
        { state: { user: { appTheme: AppThemeKey.light } } },
      );

      expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          isPureBlack: false,
          theme: Theme.Light,
        }),
      );
    });

    it('passes isPureBlack true to DesignSystemThemeProvider when preview flag is on in dark mode', () => {
      mockIsPureBlackEnabled = true;

      renderWithProvider(
        <ThemeProvider>
          <View />
        </ThemeProvider>,
        { state: { user: { appTheme: AppThemeKey.dark } } },
      );

      expect(mockDesignSystemThemeProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          isPureBlack: true,
          theme: Theme.Dark,
        }),
      );
    });
  });
});

import React from 'react';
import { brandColor, darkTheme, lightTheme } from '@metamask/design-tokens';
import { renderHook } from '@testing-library/react-native';
import { ThemeContext } from './index';
import { AppThemeKey, Theme } from './models';

let mockIsPureBlackEnabled = false;

jest.mock('./pureBlackPreview', () => ({
  get isPureBlackEnabled() {
    return mockIsPureBlackEnabled;
  },
}));

import {
  getElevatedSurfaceColor,
  isPureBlackEnabled,
  useElevatedSurface,
} from './themeUtils';

const createTheme = (
  themeAppearance: AppThemeKey.light | AppThemeKey.dark,
): Theme => {
  const base = themeAppearance === AppThemeKey.dark ? darkTheme : lightTheme;

  return {
    colors: base.colors,
    themeAppearance,
    typography: base.typography,
    shadows: base.shadows,
    brandColors: brandColor,
  };
};

const createWrapper =
  (theme: Theme) =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeContext.Provider, { value: theme }, children);

describe('isPureBlackEnabled re-export', () => {
  it('re-exports the pure black preview flag as a boolean', () => {
    expect(typeof isPureBlackEnabled).toBe('boolean');
  });
});

describe('getElevatedSurfaceColor', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('returns default background when pure black preview is off', () => {
    const theme = createTheme(AppThemeKey.dark);

    const result = getElevatedSurfaceColor(theme);

    expect(result).toBe(theme.colors.background.default);
  });

  it('returns alternative background for dark mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);

    const result = getElevatedSurfaceColor(theme);

    expect(result).toBe(theme.colors.background.alternative);
  });

  it('returns default background for light mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);

    const result = getElevatedSurfaceColor(theme);

    expect(result).toBe(theme.colors.background.default);
  });
});

describe('useElevatedSurface', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('returns bg-default when pure black preview is off', () => {
    const theme = createTheme(AppThemeKey.dark);

    const { result } = renderHook(() => useElevatedSurface(), {
      wrapper: createWrapper(theme),
    });

    expect(result.current).toBe('bg-default');
  });

  it('returns bg-alternative for dark mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);

    const { result } = renderHook(() => useElevatedSurface(), {
      wrapper: createWrapper(theme),
    });

    expect(result.current).toBe('bg-alternative');
  });

  it('returns bg-default for light mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);

    const { result } = renderHook(() => useElevatedSurface(), {
      wrapper: createWrapper(theme),
    });

    expect(result.current).toBe('bg-default');
  });
});

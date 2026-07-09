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
  getElevatedSurfaceBorderStyle,
  getElevatedSurfaceColor,
  isPureBlackEnabled,
  isPureBlackTheme,
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

describe('isPureBlackTheme', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('returns false when pure black preview is off', () => {
    const theme = createTheme(AppThemeKey.dark);

    expect(isPureBlackTheme(theme)).toBe(false);
  });

  it('returns true for dark mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);

    expect(isPureBlackTheme(theme)).toBe(true);
  });

  it('returns false for light mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);

    expect(isPureBlackTheme(theme)).toBe(false);
  });
});

describe('getElevatedSurfaceBorderStyle', () => {
  beforeEach(() => {
    mockIsPureBlackEnabled = false;
  });

  it('returns an empty object when pure black preview is off', () => {
    const theme = createTheme(AppThemeKey.dark);

    expect(getElevatedSurfaceBorderStyle(theme)).toEqual({});
  });

  it('returns muted border styles for dark mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.dark);

    expect(getElevatedSurfaceBorderStyle(theme)).toEqual({
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    });
  });

  it('returns an empty object for light mode when pure black preview is on', () => {
    mockIsPureBlackEnabled = true;
    const theme = createTheme(AppThemeKey.light);

    expect(getElevatedSurfaceBorderStyle(theme)).toEqual({});
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

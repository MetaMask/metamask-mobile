import { Appearance, StatusBar } from 'react-native';
import { darkTheme } from '@metamask/design-tokens';
import { renderHookWithProvider } from '../test/renderWithProvider';
import { useAppTheme } from './index';
import { AppThemeKey } from './models';

describe('useAppTheme', () => {
  let setBarStyleSpy: jest.SpyInstance;

  beforeEach(() => {
    setBarStyleSpy = jest.spyOn(StatusBar, 'setBarStyle').mockImplementation();
  });

  afterEach(() => {
    setBarStyleSpy.mockRestore();
  });

  it('returns resolved dark theme colors when app theme is dark', () => {
    const { result } = renderHookWithProvider(() => useAppTheme(), {
      state: { user: { appTheme: AppThemeKey.dark } },
    });

    expect(result.current.themeAppearance).toBe(AppThemeKey.dark);
    expect(result.current.colors.background.default).toBe(
      darkTheme.colors.background.default,
    );
  });

  it('returns resolved dark theme colors when app theme follows a dark OS scheme', () => {
    const getColorSchemeSpy = jest
      .spyOn(Appearance, 'getColorScheme')
      .mockReturnValue('dark');

    const { result } = renderHookWithProvider(() => useAppTheme(), {
      state: { user: { appTheme: AppThemeKey.os } },
    });

    expect(result.current.themeAppearance).toBe(AppThemeKey.dark);
    expect(result.current.colors.background.default).toBe(
      darkTheme.colors.background.default,
    );

    getColorSchemeSpy.mockRestore();
  });
});

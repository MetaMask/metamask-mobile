import { darkTheme, lightTheme } from '@metamask/design-tokens';
import {
  getThemeColors,
  Theme as TailwindTheme,
} from '@metamask/design-system-twrnc-preset';

import { AppThemeKey, type Theme } from './models';
import {
  FLOATING_SURFACE_DARK,
  applyPrototypeFloatingFill,
  getFloatingSurfaceStyle,
} from './floatingSurface';

const lightAppTheme = {
  colors: lightTheme.colors,
  themeAppearance: AppThemeKey.light,
  typography: lightTheme.typography,
  shadows: lightTheme.shadows,
  brandColors: {},
} as Theme;

const darkAppTheme = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: {},
} as Theme;

describe('floating surface', () => {
  beforeAll(() => {
    applyPrototypeFloatingFill();
  });

  it('overrides dark elevated1 with the provisional floating fill', () => {
    expect(FLOATING_SURFACE_DARK).toBe('#222226');
    expect(darkTheme.colors.background.elevated1).toBe(FLOATING_SURFACE_DARK);
    expect(darkTheme.colors.background.subsection).toBe(FLOATING_SURFACE_DARK);
    expect(getThemeColors(TailwindTheme.Dark)?.['background-elevated1']).toBe(
      FLOATING_SURFACE_DARK,
    );
  });

  it('paints dark floating surfaces with the provisional fill and a hairline', () => {
    expect(getFloatingSurfaceStyle(darkAppTheme)).toEqual(
      expect.objectContaining({
        backgroundColor: FLOATING_SURFACE_DARK,
        borderColor: darkTheme.colors.border.alternative,
        borderWidth: expect.any(Number),
      }),
    );
  });

  it('paints light floating surfaces white with a shadow', () => {
    expect(getFloatingSurfaceStyle(lightAppTheme, 'md')).toEqual(
      expect.objectContaining({
        backgroundColor: lightTheme.colors.background.default,
        ...lightTheme.shadows.size.md,
      }),
    );
  });
});

import { useTheme } from './index';
import { AppThemeKey, Theme } from './models';

// In dark mode, background.section is used so surfaces stay visible when the
// pure black preview flag overrides background.default to #000000.
export const getElevatedSurfaceColor = (theme: Theme): string =>
  theme.themeAppearance === AppThemeKey.dark
    ? theme.colors.background.section
    : theme.colors.background.default;

export const useElevatedSurface = () => {
  const { themeAppearance } = useTheme();
  return themeAppearance === AppThemeKey.dark ? 'bg-section' : 'bg-default';
};

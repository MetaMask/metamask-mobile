import { useTheme } from './index';
import { AppThemeKey, Theme } from './models';

/**
 * Returns the correct Tailwind background class for a surface (e.g. bottom
 * sheets, action list rows) based on the current theme. In dark mode,
 * `background.section` is used so surfaces remain visible against a pure black
 * background when the pure black preview flag is enabled.
 *
 * Replace all callsites with `bg-section` once pure black ships as default.
 */
/**
 * Plain function for use inside `useStyles` style sheet functions.
 * Returns the correct background color for an elevated surface.
 */
export const getElevatedSurfaceColor = (theme: Theme): string =>
  theme.themeAppearance === AppThemeKey.dark
    ? theme.colors.background.section
    : theme.colors.background.default;

export const useElevatedSurface = () => {
  const { themeAppearance } = useTheme();
  return themeAppearance === AppThemeKey.dark ? 'bg-section' : 'bg-default';
};

import { useTheme } from './index';
import { AppThemeKey, Theme } from './models';

// When pure black is off, bg-section is the standard elevated surface color for
// both light and dark. When pure black is on, bg-default is overridden to
// #000000 so light mode still uses bg-default while dark mode uses bg-section.
const PURE_BLACK_ENABLED = process.env.MM_PURE_BLACK_PREVIEW === 'true';

export const getElevatedSurfaceColor = (theme: Theme): string => {
  if (!PURE_BLACK_ENABLED) return theme.colors.background.default;
  return theme.themeAppearance === AppThemeKey.dark
    ? theme.colors.background.section
    : theme.colors.background.default;
};

export const useElevatedSurface = () => {
  const { themeAppearance } = useTheme();
  if (!PURE_BLACK_ENABLED) return 'bg-default';
  return themeAppearance === AppThemeKey.dark ? 'bg-section' : 'bg-default';
};

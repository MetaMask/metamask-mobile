import { useTheme } from './index';
import { AppThemeKey, Theme } from './models';

// Stopgap surface helper for the MM_PURE_BLACK_PREVIEW rollout.
//
// When pure black is OFF, returns `bg-default` (current behavior — no change
// for normal light/dark mode users).
//
// When pure black is ON:
//   - dark  → `bg-section` (elevated `#1c1d1f` so surfaces don't collapse
//             into the pure-black screen background)
//   - light → `bg-default` (unchanged, light mode is unaffected)
//
// Remove these helpers once the MMDS package ships its own pure-black-aware
// surface tokens and the flag is enabled by default.
export const isPureBlackEnabled = process.env.MM_PURE_BLACK_PREVIEW === 'true';

export const getElevatedSurfaceColor = (theme: Theme): string => {
  if (!isPureBlackEnabled) return theme.colors.background.default;
  return theme.themeAppearance === AppThemeKey.dark
    ? theme.colors.background.section
    : theme.colors.background.default;
};

export const useElevatedSurface = () => {
  const { themeAppearance } = useTheme();
  if (!isPureBlackEnabled) return 'bg-default';
  return themeAppearance === AppThemeKey.dark ? 'bg-section' : 'bg-default';
};

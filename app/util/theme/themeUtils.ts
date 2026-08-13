import { AppThemeKey, Theme } from './models';
import { isPureBlackEnabled } from './pureBlackPreview';

export { isPureBlackEnabled };

// Stopgap surface helper for the MM_PURE_BLACK_PREVIEW rollout.
//
// When pure black is OFF, returns the default background (current behavior —
// no change for normal light/dark mode users).
//
// When pure black is ON:
//   - dark  → alternative background (elevated so surfaces don't collapse
//             into the pure-black screen background)
//   - light → default background (unchanged, light mode is unaffected)
//
// Remove this helper once the MMDS package ships its own pure-black-aware
// surface tokens and the flag is enabled by default.

export const getElevatedSurfaceColor = (theme: Theme): string => {
  if (!isPureBlackEnabled) return theme.colors.background.default;
  return theme.themeAppearance === AppThemeKey.dark
    ? theme.colors.background.alternative
    : theme.colors.background.default;
};

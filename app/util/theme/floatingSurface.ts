import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import {
  getThemeColors,
  Theme as TailwindTheme,
} from '@metamask/design-system-twrnc-preset';
import { darkTheme } from '@metamask/design-tokens';

import { AppThemeKey, type Theme } from './models';

/**
 * Provisional dark fill for L3 floating surfaces (sheets, toasts, menus,
 * and the trade tray when it cannot draw glass).
 *
 * MMDS `background.elevated2` is `#18181b` in dark, the same hex as
 * `background.section`, so a sheet painted with it does not step above the
 * cards. `background.subsection` is already this value. Sheets today use
 * `background.elevated1` (`#0d0d0f`), which is darker than those cards.
 *
 * TODO(design-tokens): Replace this local override with an MMDS floating
 * token once design-tokens decides the dark floating-surface color. Do not
 * treat the hex as a long-term API.
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
export const FLOATING_SURFACE_DARK = '#222226';

const ELEVATED_BACKGROUND_KEY = 'background-elevated1';

let didApplyFloatingFill = false;

/**
 * Points dark `background.elevated1` at {@link FLOATING_SURFACE_DARK}.
 *
 * MMDS `BottomSheet` hardcodes `bg-elevated1`, and the component-library
 * sheet reads `colors.background.elevated1`. Overriding the dark token in
 * both the JS theme and the Tailwind map lifts every sheet without a second
 * fill primitive. Light `elevated1` is already white.
 */
export const applyPrototypeFloatingFill = (): void => {
  if (didApplyFloatingFill) {
    return;
  }
  didApplyFloatingFill = true;

  darkTheme.colors.background.elevated1 = FLOATING_SURFACE_DARK;
  const darkColors = getThemeColors(TailwindTheme.Dark);
  if (darkColors) {
    darkColors[ELEVATED_BACKGROUND_KEY] = FLOATING_SURFACE_DARK;
  }
};

/**
 * Light floating surfaces are white with a shadow. Dark ones use the
 * provisional fill and a `border.alternative` hairline. `md` suits compact
 * UI (toasts). `lg` suits sheets.
 *
 * @param theme - Resolved app theme.
 * @param shadow - Which light-mode shadow step to use.
 * @returns Style for an L3 surface.
 */
export const getFloatingSurfaceStyle = (
  theme: Theme,
  shadow: 'md' | 'lg' = 'lg',
): ViewStyle => {
  const isLight = theme.themeAppearance === AppThemeKey.light;

  return {
    backgroundColor: isLight
      ? theme.colors.background.default
      : FLOATING_SURFACE_DARK,
    borderColor: theme.colors.border.alternative,
    borderWidth: StyleSheet.hairlineWidth,
    ...(isLight
      ? {
          ...theme.shadows.size[shadow],
          // iOS reads the shadow props. Android only lifts with elevation.
          ...(Platform.OS === 'android'
            ? { elevation: shadow === 'lg' ? 8 : 4 }
            : {}),
        }
      : {}),
  };
};

applyPrototypeFloatingFill();

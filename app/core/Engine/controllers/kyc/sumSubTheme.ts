import { Appearance } from 'react-native';
import { lightTheme, darkTheme } from '@metamask/design-tokens';
import ReduxService from '../../../redux/ReduxService';
import { AppThemeKey, type Colors } from '../../../../util/theme/models';
import { getAssetFromTheme } from '../../../../util/theme';

interface SumSubThemeSections {
  colors?: Record<string, string>;
  metrics?: Record<string, string | number | boolean>;
}

/** SumSub `withTheme` JSON. `ios` / `android` override `universal`. */
export interface SumSubTheme {
  universal: SumSubThemeSections;
  ios?: SumSubThemeSections;
  android?: SumSubThemeSections;
}

/** Wallet-aligned SumSub theme. Flat `{ colors, metrics }` is ignored on iOS. */
export function buildSumSubTheme(): SumSubTheme {
  return {
    universal: { colors: buildColors(), metrics: buildMetrics() },
    ios: { colors: iosOnlyColors(), metrics: iosOnlyMetrics() },
    android: { colors: androidOnlyColors() },
  };
}

/** iOS-only colors (toolbar, field button, progress shimmer). */
function iosOnlyColors(): Record<string, string> {
  const c = resolveColors();

  return {
    toolbarTint: c.icon.alternative,
    toolbarBackground: c.background.default,

    fieldButtonBackgroundHighlighted: c.background.pressed,
    progressBarShimmer: c.primary.muted,
  };
}

/** Android-only colors (status bar, field border states). */
function androidOnlyColors(): Record<string, string> {
  const c = resolveColors();

  return {
    statusBarColor: c.background.default,

    fieldBorderFocused: c.primary.default,
    fieldBorderDisabled: c.border.muted,
  };
}

function buildColors(): Record<string, string> {
  const c = resolveColors();
  // Camera overlay is always dark.
  const onCamera = darkTheme.colors;

  return {
    navigationBarItem: c.icon.alternative,
    alertTint: c.primary.default,

    backgroundCommon: c.background.default,
    backgroundCritical: c.error.muted,
    backgroundInfo: c.info.muted,
    backgroundNeutral: c.background.section,
    backgroundSuccess: c.success.muted,
    backgroundWarning: c.warning.muted,
    // Sheets sit on `bg-elevated1`, which differs from the page background in dark.
    bottomSheetBackground: c.background.elevated1,
    bottomSheetHandle: c.border.muted,

    cameraBackground: onCamera.background.default,
    cameraBackgroundOverlay: onCamera.overlay.alternative,
    cameraContent: onCamera.icon.default,

    cardBorderedBackground: c.background.default,
    cardPlainBackground: c.background.default,

    contentCritical: c.error.default,
    contentInfo: c.info.default,
    contentLink: c.primary.default,
    contentNeutral: c.text.alternative,
    contentStrong: c.text.default,
    contentSuccess: c.success.default,
    contentWarning: c.warning.default,
    contentWeak: c.text.muted,

    fieldBackground: c.background.muted,
    fieldBackgroundInvalid: c.error.muted,
    fieldBorder: c.border.muted,
    fieldContent: c.text.default,
    fieldPlaceholder: c.text.muted,
    fieldTint: c.primary.default,

    linkButtonContent: c.primary.default,
    linkButtonContentDisabled: c.text.muted,
    linkButtonBackgroundHighlighted: c.primary.muted,

    listSelectedItemBackground: c.background.pressed,
    listSeparator: c.border.muted,

    // The design system's primary button is `bg-icon-default`, which inverts
    // per appearance (near-black on light, white on dark). `primary.default`
    // is the link accent and would render blue.
    primaryButtonBackground: c.icon.default,
    primaryButtonBackgroundDisabled: c.icon.muted,
    primaryButtonBackgroundHighlighted: c.icon.defaultPressed,
    primaryButtonContent: c.primary.inverse,
    primaryButtonContentDisabled: c.primary.inverse,
    primaryButtonContentHighlighted: c.primary.inverse,

    secondaryButtonBackground: c.background.muted,
    secondaryButtonBackgroundDisabled: c.background.muted,
    secondaryButtonBackgroundHighlighted: c.background.mutedPressed,
    secondaryButtonContent: c.text.default,
    secondaryButtonContentDisabled: c.text.muted,
    secondaryButtonContentHighlighted: c.text.default,

    progressBarTint: c.primary.default,
    progressBarBackground: c.primary.muted,
  };
}

/** Design system buttons and fields are both `h-12`. */
const CONTROL_HEIGHT = 48;

function buildMetrics(): Record<string, string | number | boolean> {
  return {
    buttonBorderWidth: 1,
    // Buttons are `rounded-full`; SumSub has no pill flag, so use half the height.
    buttonCornerRadius: CONTROL_HEIGHT / 2,
    buttonHeight: CONTROL_HEIGHT,
    cardBorderWidth: 1,
    cardCornerRadius: 12,
    fieldBorderWidth: 1,
    // Fields are `rounded-lg`.
    fieldCornerRadius: 8,
    fieldHeight: CONTROL_HEIGHT,
    // Sheets are `rounded-t-3xl`.
    bottomSheetCornerRadius: 24,
    documentFrameCornerRadius: 14,
    screenHorizontalMargin: 16,
  };
}

/** iOS-only: filled document-type cards. */
function iosOnlyMetrics(): Record<string, string | number | boolean> {
  return { documentTypeCardStyle: 'filled' };
}

function resolveColors(): Colors {
  return getAssetFromTheme(
    getAppThemeKey(),
    Appearance.getColorScheme(),
    lightTheme.colors,
    darkTheme.colors,
  );
}

/** Pinned app theme, or OS if the store is missing. */
function getAppThemeKey(): AppThemeKey {
  try {
    const appTheme = ReduxService.store.getState()?.user?.appTheme;
    return appTheme === AppThemeKey.light || appTheme === AppThemeKey.dark
      ? appTheme
      : AppThemeKey.os;
  } catch {
    return AppThemeKey.os;
  }
}

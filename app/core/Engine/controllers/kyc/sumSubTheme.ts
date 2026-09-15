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

/** iOS toolbar colors. */
function iosOnlyColors(): Record<string, string> {
  const c = resolveColors();

  return {
    toolbarTint: c.icon.alternative,
    toolbarBackground: c.background.default,
  };
}

/** Android-only colors (links, progress, focused field). */
function androidOnlyColors(): Record<string, string> {
  const c = resolveColors();

  return {
    statusBarColor: c.background.default,

    linkButtonContent: c.primary.default,
    linkButtonContentDisabled: c.text.muted,
    linkButtonBackgroundHighlighted: c.primary.muted,

    progressBarTint: c.primary.default,
    progressBarBackground: c.primary.muted,

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
    bottomSheetBackground: c.background.default,
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

    fieldBackground: c.background.section,
    fieldBackgroundInvalid: c.error.muted,
    fieldBorder: c.border.muted,
    fieldContent: c.text.default,
    fieldPlaceholder: c.text.muted,
    fieldTint: c.primary.default,

    listSelectedItemBackground: c.background.section,
    listSeparator: c.border.muted,

    primaryButtonBackground: c.primary.default,
    primaryButtonBackgroundDisabled: c.primary.muted,
    primaryButtonBackgroundHighlighted: c.primary.defaultPressed,
    primaryButtonContent: c.primary.inverse,
    primaryButtonContentDisabled: c.text.muted,
    primaryButtonContentHighlighted: c.primary.inverse,

    secondaryButtonBackground: c.background.default,
    secondaryButtonBackgroundDisabled: c.background.default,
    secondaryButtonBackgroundHighlighted: c.background.defaultPressed,
    secondaryButtonContent: c.text.default,
    secondaryButtonContentDisabled: c.text.muted,
    secondaryButtonContentHighlighted: c.text.default,
  };
}

function buildMetrics(): Record<string, string | number | boolean> {
  return {
    buttonBorderWidth: 1,
    buttonCornerRadius: 12,
    buttonHeight: 48,
    cardBorderWidth: 1,
    cardCornerRadius: 12,
    fieldBorderWidth: 1,
    fieldCornerRadius: 12,
    fieldHeight: 48,
    bottomSheetCornerRadius: 16,
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

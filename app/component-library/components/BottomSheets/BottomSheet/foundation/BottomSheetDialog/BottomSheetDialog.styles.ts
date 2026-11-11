// Third party dependencies.
// eslint-disable-next-line @typescript-eslint/no-shadow
import { Platform, StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BottomSheetDialogStyleSheetVars } from './BottomSheetDialog.types';

/**
 * Bottom padding for the sheet so its content clears the device's bottom
 * system UI (home indicator on iOS, navigation bar on Android).
 *
 * @param platform - Platform the sheet renders on.
 * @param screenBottomPadding - Bottom safe-area inset reported for the screen.
 * @returns Bottom padding in dp.
 */
export const getBottomSheetBottomPadding = (
  platform: typeof Platform.OS,
  screenBottomPadding: number,
): number => {
  if (platform === 'ios' || platform === 'macos') {
    return screenBottomPadding;
  }
  if (platform === 'android') {
    // Android 16 edge-to-edge can report a zero bottom safe-area inset while
    // the three-button navigation bar still overlays the app. Keep the
    // existing 16dp footer spacing and reserve the remaining 32dp so actions
    // stay above the 48dp navigation bar. A real (larger) inset still wins.
    return Math.max(screenBottomPadding, 32) + 16;
  }
  return screenBottomPadding + 16;
};

/**
 * Style sheet function for BottomSheetDialog component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetDialogStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors, shadows } = theme;
  const { isFullscreen, maxSheetHeight, screenBottomPadding, style } = vars;

  return StyleSheet.create({
    base: Object.assign({
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    } as ViewStyle) as ViewStyle,
    sheet: Object.assign(
      {
        backgroundColor: theme.colors.background.elevated1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: maxSheetHeight,
        overflow: 'hidden',
        paddingBottom: getBottomSheetBottomPadding(
          Platform.OS,
          screenBottomPadding,
        ),
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: colors.border.alternative,
        ...(isFullscreen && { height: maxSheetHeight }),
        ...shadows.size.lg,
      },
      style,
    ) as ViewStyle,
    notchWrapper: {
      alignSelf: 'stretch',
      padding: 4,
      alignItems: 'center',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
    },
  });
};

export default styleSheet;

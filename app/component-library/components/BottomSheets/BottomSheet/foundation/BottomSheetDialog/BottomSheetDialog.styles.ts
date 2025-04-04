// Third party dependencies.
// eslint-disable-next-line @typescript-eslint/no-shadow
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { BottomSheetDialogStyleSheetVars } from './BottomSheetDialog.types';

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
        backgroundColor: colors.background.default,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        maxHeight: maxSheetHeight,
        overflow: 'hidden',
        paddingBottom: screenBottomPadding,
        borderWidth: 1,
        borderColor: colors.border.muted,
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

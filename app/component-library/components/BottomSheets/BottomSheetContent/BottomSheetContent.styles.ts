// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { BottomSheetContentStyleSheetVars } from './BottomSheetContent.types';

/**
 * Style sheet function for BottomSheetContent component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetContentStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors, shadows } = theme;
  const { maxSheetHeight, screenBottomPadding, isFullscreen } = vars;
  const positionObject = isFullscreen
    ? { ...StyleSheet.absoluteFillObject }
    : {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      };

  return StyleSheet.create({
    base: Object.assign({
      ...positionObject,
    } as ViewStyle) as ViewStyle,
    sheet: {
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

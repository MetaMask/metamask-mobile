// Third party dependencies.
import { Dimensions, StyleSheet, ViewStyle } from 'react-native';

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
        width: Dimensions.get('window').width,
      };

  return StyleSheet.create({
    base: Object.assign({
      ...positionObject,
    } as ViewStyle) as ViewStyle,
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: isFullscreen ? 0 : 8,
      borderTopRightRadius: isFullscreen ? 0 : 8,
      maxHeight: maxSheetHeight,
      overflow: 'hidden',
      paddingBottom: screenBottomPadding,
      borderWidth: 1,
      borderColor: colors.border.muted,
      ...(isFullscreen && { height: maxSheetHeight }),
      ...shadows.size.lg,
    },
  });
};

export default styleSheet;

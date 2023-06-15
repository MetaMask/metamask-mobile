// Third party dependencies.
import { Dimensions, StyleSheet } from 'react-native';

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
  const { colors } = theme;
  const { maxSheetHeight, screenBottomPadding } = vars;
  return StyleSheet.create({
    base: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: Dimensions.get('window').width,
    },
    sheet: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: maxSheetHeight,
      overflow: 'hidden',
      paddingBottom: screenBottomPadding,
    },
  });
};

export default styleSheet;

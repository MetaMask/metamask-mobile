// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { ButtonsAlignment } from './BottomSheetFooter.types';

/**
 * Style sheet function for BottomSheetFooter component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars } = params;
  const { style, buttonsAlignment } = vars;
  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    subsequentButton: {
      marginLeft: buttonsAlignment === ButtonsAlignment.Horizontal ? 16 : 0,
      marginTop: buttonsAlignment === ButtonsAlignment.Vertical ? 16 : 0,
    },
  });
};

export default styleSheet;

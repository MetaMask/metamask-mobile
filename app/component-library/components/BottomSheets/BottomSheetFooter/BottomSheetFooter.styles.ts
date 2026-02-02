// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import {
  ButtonsAlignment,
  BottomSheetFooterStyleSheetVars,
} from './BottomSheetFooter.types';

/**
 * Style sheet function for BottomSheetFooter component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetFooterStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, buttonsAlignment, buttonGap = 16 } = vars;
  const buttonStyle: ViewStyle =
    buttonsAlignment === ButtonsAlignment.Horizontal
      ? { flex: 1 }
      : { alignSelf: 'stretch' };

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection:
          buttonsAlignment === ButtonsAlignment.Horizontal ? 'row' : 'column',
        paddingVertical: 4,
        paddingHorizontal: 8,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    button: {
      ...buttonStyle,
    },
    subsequentButton: {
      ...buttonStyle,
      marginLeft:
        buttonsAlignment === ButtonsAlignment.Horizontal ? buttonGap : 0,
      marginTop: buttonsAlignment === ButtonsAlignment.Vertical ? buttonGap : 0,
    },
  });
};

export default styleSheet;

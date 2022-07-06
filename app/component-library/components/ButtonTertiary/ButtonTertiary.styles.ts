import { StyleSheet, ViewStyle } from 'react-native';
import {
  ButtonTertiaryStyleSheet,
  ButtonTertiaryStyleSheetVars,
} from './ButtonTertiary.types';

/**
 * Style sheet function for ButtonPrimary component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  vars: ButtonTertiaryStyleSheetVars;
}): ButtonTertiaryStyleSheet => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: 'transparent',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

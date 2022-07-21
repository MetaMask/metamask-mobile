import { StyleSheet, ViewStyle } from 'react-native';
import {
  IconButtonStyleSheet,
  IconButtonStyleSheetVars,
} from './IconButton.types';

/**
 * Style sheet function for IconButton component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  vars: IconButtonStyleSheetVars;
}): IconButtonStyleSheet => {
  const { vars } = params;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        alignItems: 'center',
        justifyContent: 'center',
        height: 32,
        width: 32,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

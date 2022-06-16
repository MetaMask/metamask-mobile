import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import {
  ButtonSecondaryStyleSheet,
  ButtonSecondaryStyleSheetVars,
} from './ButtonSecondary.types';

/**
 * Style sheet function for ButtonPrimary component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonSecondaryStyleSheetVars;
}): ButtonSecondaryStyleSheet => {
  const { vars, theme } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: theme.colors.secondary.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

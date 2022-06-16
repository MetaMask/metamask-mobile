import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import {
  ButtonPrimaryStyleSheet,
  ButtonPrimaryStyleSheetVars,
} from './ButtonPrimary.types';

/**
 * Style sheet function for ButtonPrimary component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonPrimaryStyleSheetVars;
}): ButtonPrimaryStyleSheet => {
  const { vars, theme } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: theme.colors.primary.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

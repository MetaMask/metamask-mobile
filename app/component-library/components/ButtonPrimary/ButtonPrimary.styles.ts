import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import {
  ButtonPrimaryStyleSheet,
  ButtonPrimaryStyleSheetVars,
  ButtonPrimaryVariant,
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
  const { colors } = theme;
  const { style, variant, pressed } = vars;
  let backgroundColor: string;
  switch (variant) {
    case ButtonPrimaryVariant.Normal:
      backgroundColor = pressed
        ? colors.primary.alternative
        : colors.primary.default;
      break;
    case ButtonPrimaryVariant.Danger:
      backgroundColor = pressed
        ? colors.error.alternative
        : colors.error.default;
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

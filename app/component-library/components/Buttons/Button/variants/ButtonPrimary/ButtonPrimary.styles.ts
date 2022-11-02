// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  ButtonPrimaryStyleSheetVars,
  ButtonPrimaryVariants,
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
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, buttonPrimaryVariants, pressed } = vars;
  let backgroundColor: string;
  switch (buttonPrimaryVariants) {
    case ButtonPrimaryVariants.Normal:
      backgroundColor = pressed
        ? colors.primary.alternative
        : colors.primary.default;
      break;
    case ButtonPrimaryVariants.Danger:
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

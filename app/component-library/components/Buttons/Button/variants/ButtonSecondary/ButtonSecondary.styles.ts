// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  ButtonSecondaryStyleSheetVars,
  ButtonSecondaryVariants,
} from './ButtonSecondary.types';

/**
 * Style sheet function for ButtonSecondary component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonSecondaryStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, buttonSecondaryVariants, pressed } = vars;
  let borderColor: string;
  switch (buttonSecondaryVariants) {
    case ButtonSecondaryVariants.Normal:
      borderColor = pressed
        ? colors.primary.alternative
        : colors.primary.default;
      break;
    case ButtonSecondaryVariants.Danger:
      borderColor = pressed ? colors.error.alternative : colors.error.default;
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

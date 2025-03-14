// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { ButtonToggleStyleSheetVars } from './ButtonToggle.types';

/**
 * Style sheet function for ButtonToggle component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonToggleStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isActive, pressed } = vars;
  const colorObj = colors.primary;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: isActive
          ? pressed
            ? colorObj.alternative
            : colorObj.default
          : pressed
          ? colorObj.alternative
          : 'transparent',
        borderWidth: 1,
        borderColor: colorObj.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

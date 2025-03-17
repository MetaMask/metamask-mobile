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
  const { style, isActive } = vars;
  const colorObj = colors.primary;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: isActive ? colorObj.muted : 'transparent',
        borderWidth: 1,
        borderColor: isActive ? colorObj.default : colors.border.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

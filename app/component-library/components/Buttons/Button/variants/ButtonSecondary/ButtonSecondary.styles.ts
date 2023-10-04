// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { ButtonSecondaryStyleSheetVars } from './ButtonSecondary.types';

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
  const { style, isDanger, pressed } = vars;
  const colorObj = isDanger ? colors.error : colors.primary;

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: pressed ? colorObj.alternative : 'transparent',
        borderWidth: 1,
        borderColor: colorObj.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

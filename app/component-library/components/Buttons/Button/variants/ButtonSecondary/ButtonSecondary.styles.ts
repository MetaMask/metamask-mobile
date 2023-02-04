// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

/**
 * Style sheet function for ButtonSecondary component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDanger, pressed } = vars;
  const borderColorObj = isDanger ? colors.error : colors.primary;
  const borderColor: string = pressed
    ? borderColorObj.alternative
    : borderColorObj.default;

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

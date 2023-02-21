// Third party dependencies.
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';
import { colors } from '../../../../../../styles/common';

/**
 * Style sheet function for ButtonLink component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { style, isDanger, pressed } = vars;
  const colorObj = isDanger ? theme.colors.error : theme.colors.primary;
  const labelColor: string = pressed ? colorObj.alternative : colorObj.default;

  return StyleSheet.create({
    base: Object.assign(
      { backgroundColor: colors.transparent },
      style,
    ) as ViewStyle,
    baseText: Object.assign(
      { color: labelColor } as TextStyle,
      style,
    ) as TextStyle,
  });
};

export default styleSheet;

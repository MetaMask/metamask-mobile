// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../util/theme/models';

/**
 * Style sheet function for SelectButtonBase component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars } = params;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
      style,
    ) as ViewStyle,
    value: { flex: 1, marginRight: 8 },
  });
};

export default styleSheet;

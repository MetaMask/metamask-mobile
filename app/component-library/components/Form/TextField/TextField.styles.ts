// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for TextField component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { style, size, error, disabled, isFocused } = vars;
  let borderColor = theme.colors.border.default;
  if (error) {
    borderColor = theme.colors.error.default;
  }
  if (isFocused) {
    borderColor = theme.colors.primary.default;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        height: Number(size),
        borderWidth: 1,
        borderColor,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 16,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    startAccessory: {
      marginRight: 8,
    },
    input: {
      flex: 1,
    },
    endAccessory: {
      marginLeft: 8,
    },
  });
};

export default styleSheet;

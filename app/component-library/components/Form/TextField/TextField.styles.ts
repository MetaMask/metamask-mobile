// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies
import { TextFieldStyleSheetVars } from './TextField.types';

/**
 * Style sheet function for TextField component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TextFieldStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, size, isError, isDisabled, isFocused } = vars;
  let borderColor = theme.colors.border.default;
  if (isError) {
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
        opacity: isDisabled ? 0.5 : 1,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.background.default,
      },
      StyleSheet.flatten(style),
    ) as ViewStyle,
    startAccessory: {
      marginRight: 8,
    },
    inputContainer: {
      flex: 1,
    },
    // This is needed to override the background color of the input and inherit configurable parent background color
    // eslint-disable-next-line react-native/no-color-literals
    input: {
      backgroundColor: 'inherit',
    },
    endAccessory: {
      marginLeft: 8,
    },
  });
};

export default styleSheet;

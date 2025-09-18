// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies
import { TextFieldStyleSheetVars } from './TextField.types';

const BORDER_WIDTH = 1;

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
  const { style, size, isDisabled } = vars;

  // Placeholder text color based on state
  const placeholderTextColor = isDisabled
    ? theme.colors.text.muted
    : theme.colors.text.alternative;

  const styles = StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        height: Number(size),
        paddingHorizontal: 16,
        opacity: isDisabled ? 0.5 : 1,
        backgroundColor: theme.colors.background.section,
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
      // subtract border width from height so it won't overflow the container
      height: Number(size) - BORDER_WIDTH * 2,
    },
    endAccessory: {
      marginLeft: 8,
    },
  });

  return {
    ...styles,
    placeholderTextColor,
  };
};

export default styleSheet;

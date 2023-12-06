// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { RadioButtonStyleSheetVars } from './RadioButton.types';

/**
 * Style sheet function for RadioButton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: RadioButtonStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, isChecked, isDisabled } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: isDisabled ? 0.5 : 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    radioButton: {
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 99,
      borderWidth: 2,
      backgroundColor: theme.colors.background.default,
      borderColor: isChecked
        ? theme.colors.primary.default
        : theme.colors.border.default,
    },
    icon: {
      width: 12,
      height: 12,
      backgroundColor: theme.colors.primary.default,
      borderRadius: 99,
    },
    label: {
      marginLeft: 12,
    },
  });
};

export default styleSheet;

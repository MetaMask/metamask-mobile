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
  const { style, isChecked, isDisabled, isReadOnly, isDanger } = vars;
  let iconColor;
  let borderColor;

  if (isReadOnly) {
    iconColor = theme.colors.icon.alternative;
    borderColor = theme.colors.background.default;
  } else if (isDanger) {
    iconColor = theme.colors.error.default;
    borderColor = theme.colors.error.default;
  } else if (isChecked) {
    iconColor = theme.colors.primary.default;
    borderColor = theme.colors.primary.default;
  } else {
    iconColor = theme.colors.background.default;
    borderColor = theme.colors.border.default;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        height: 24,
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
      borderColor,
    },
    icon: {
      width: 12,
      height: 12,
      backgroundColor: iconColor,
      borderRadius: 99,
    },
    label: {
      marginLeft: 12,
    },
  });
};

export default styleSheet;

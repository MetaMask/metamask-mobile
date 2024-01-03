// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  DropdownButtonStyleSheetVars,
  DropdownButtonSize,
} from './DropdownButton.types';

/**
 * Style sheet function for DropdownButton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: DropdownButtonStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, size, isDisabled, isDanger } = vars;
  let height;

  switch (size) {
    case DropdownButtonSize.Sm:
      height = 32;
      break;
    case DropdownButtonSize.Md:
      height = 40;
      break;
    case DropdownButtonSize.Lg:
      height = 48;
      break;
    default:
      height = 40;
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        paddingHorizontal: 12,
        borderRadius: height / 2,
        borderColor: isDanger
          ? theme.colors.error.default
          : theme.colors.border.default,
        borderWidth: isDanger ? 2 : 1,
        backgroundColor: theme.colors.background.default,
        opacity: isDisabled ? 0.5 : 1,
        height,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

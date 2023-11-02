// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import {
  SelectButtonStyleSheetVars,
  SelectButtonSize,
} from './SelectButton.types';

/**
 * Style sheet function for SelectButton component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: SelectButtonStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, size, isDisabled, isDanger } = vars;
  let verticalPadding;

  switch (size) {
    case SelectButtonSize.Sm:
      verticalPadding = 4;
      break;
    case SelectButtonSize.Md:
      verticalPadding = 8;
      break;
    case SelectButtonSize.Lg:
      verticalPadding = 12;
      break;
    default:
      verticalPadding = 8;
      break;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        paddingHorizontal: 16,
        paddingVertical: verticalPadding,
        borderRadius: 8,
        borderColor: isDanger
          ? theme.colors.error.default
          : theme.colors.border.default,
        borderWidth: 1,
        backgroundColor: theme.colors.background.default,
        opacity: isDisabled ? 0.5 : 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { CheckboxStyleSheetVars } from './Checkbox.types';

/**
 * Style sheet function for Checkbox component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: CheckboxStyleSheetVars }) => {
  const { vars, theme } = params;
  const { style, isChecked, isIndeterminate, isDisabled, isReadonly } = vars;
  const backgroundColor = isReadonly
    ? isChecked || isIndeterminate
      ? theme.colors.icon.alternative
      : theme.colors.background.default
    : isChecked || isIndeterminate
    ? theme.colors.primary.default
    : theme.colors.background.default;
  const borderColor = isReadonly
    ? isChecked || isIndeterminate
      ? theme.colors.icon.alternative
      : theme.colors.border.default
    : isChecked || isIndeterminate
    ? theme.colors.primary.default
    : theme.colors.border.default;

  return StyleSheet.create({
    base: Object.assign(
      {
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        borderWidth: 1.5,
        opacity: isDisabled ? 0.5 : 1,
        backgroundColor,
        borderColor,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    icon: {
      color: theme.colors.primary.inverse,
    },
  });
};

export default styleSheet;

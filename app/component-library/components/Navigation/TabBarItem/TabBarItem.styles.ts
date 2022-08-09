// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies
import { TabBarItemStyleSheetVars } from './TabBarItem.types';

/**
 * Style sheet function for TabBarItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: TabBarItemStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { style, isSelected } = vars;
  return StyleSheet.create({
    base: Object.assign(
      { flex: 1, alignItems: 'center' } as ViewStyle,
      style,
    ) as ViewStyle,
    label: {
      color: isSelected
        ? theme.colors.primary.default
        : theme.colors.icon.alternative,
    },
  });
};

export default styleSheet;

import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import {
  CellContainerMultiSelectOptionStyleSheet,
  CellContainerMultiSelectOptionStyleSheetVars,
} from './CellContainerMultiSelectOption.types';

/**
 * Style sheet function for CellContainerMultiSelectOption component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellContainerMultiSelectOptionStyleSheetVars;
}): CellContainerMultiSelectOptionStyleSheet => {
  const { vars, theme } = params;
  const { style } = vars;
  const { colors } = theme;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 4,
        backgroundColor: colors.background.default
      } as ViewStyle,
      style,
    ) as ViewStyle,
    baseSelected: {
      backgroundColor: colors.primary.muted,
    },
    checkbox: {
      marginRight: 10,
    },
    childrenContainer: {
      flex: 1
    }
  });
};

export default styleSheet;

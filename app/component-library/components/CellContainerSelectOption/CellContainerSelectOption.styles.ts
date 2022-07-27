import { StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../../util/theme/models';
import {
  CellContainerSelectOptionStyleSheet,
  CellContainerSelectOptionStyleSheetVars,
} from './CellContainerSelectOption.types';

/**
 * Style sheet function for CellContainerSelectOption component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellContainerSelectOptionStyleSheetVars;
}): CellContainerSelectOptionStyleSheet => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        position: 'relative',
        padding: 16,
        borderRadius: 4,
        backgroundColor: colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    baseSelected: {
      backgroundColor: colors.primary.muted,
    },
    verticalBar: {
      position: 'absolute',
      top: 4,
      left: 4,
      bottom: 4,
      width: 4,
      borderRadius: 2,
      backgroundColor: colors.primary.default,
    },
  });
};

export default styleSheet;

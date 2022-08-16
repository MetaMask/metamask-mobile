// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { CellAccountDisplayItemContainerStyleSheetVars } from './CellAccountDisplayItemContainer.types';

/**
 * Style sheet function for CellAccountDisplayItemContainer component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellAccountDisplayItemContainerStyleSheetVars;
}) => {
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
        borderWidth: 1,
        borderColor: colors.border.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

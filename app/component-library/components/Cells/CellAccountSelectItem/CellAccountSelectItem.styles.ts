// Third library dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { CellAccountSelectItemStyleSheetVars } from './CellAccountSelectItem.types';

// Internal dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for CellAccountSelectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: CellAccountSelectItemStyleSheetVars;
}) => {
  const { vars } = params;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    cellAccountSelectItem: {
      flexDirection: 'row',
    },
  });
};

export default styleSheet;

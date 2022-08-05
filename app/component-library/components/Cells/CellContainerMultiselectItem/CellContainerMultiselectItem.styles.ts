// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// Internal dependencies.
import { CellContainerMultiselectItemStyleSheetVars } from './CellContainerMultiselectItem.types';

/**
 * Style sheet function for CellContainerMultiselectItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  vars: CellContainerMultiselectItemStyleSheetVars;
}) => {
  const { vars } = params;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    checkbox: {
      marginRight: 16,
    },
  });
};

export default styleSheet;

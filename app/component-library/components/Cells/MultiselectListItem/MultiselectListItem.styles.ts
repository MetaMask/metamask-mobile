import { StyleSheet, ViewStyle } from 'react-native';
import {
  MultiselectListItemStyleSheet,
  MultiselectListItemStyleSheetVars,
} from './MultiselectListItem.types';

/**
 * Style sheet function for MultiselectListItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  vars: MultiselectListItemStyleSheetVars;
}): MultiselectListItemStyleSheet => {
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

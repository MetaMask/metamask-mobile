// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { VerticalAlignment, ListItemStyleSheetVars } from './ListItem.types';

/**
 * Style sheet function for ListItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: ListItemStyleSheetVars }) => {
  const { vars } = params;
  const { style, verticalAlignment } = vars;
  let alignItems;
  switch (verticalAlignment) {
    case VerticalAlignment.Top:
      alignItems = 'flex-start';
      break;
    case VerticalAlignment.Center:
      alignItems = 'center';
      break;
    case VerticalAlignment.Bottom:
      alignItems = 'flex-end';
      break;
    default:
      alignItems = 'flex-start';
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

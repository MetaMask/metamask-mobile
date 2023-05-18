// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import {
  ListItemColumnStyleSheetVars,
  WidthType,
} from './ListItemColumn.types';

/**
 * Style sheet function for ListItemColumn component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ListItemColumnStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, widthType } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        flex: widthType === WidthType.Auto ? -1 : 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

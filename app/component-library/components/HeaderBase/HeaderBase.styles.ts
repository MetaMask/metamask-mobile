// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

// Internal dependencies.
import { HeaderBaseStyleSheetVars } from './HeaderBase.types';

/**
 * Style sheet function for HeaderBase component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: HeaderBaseStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { style, startAccessorySize, endAccessorySize } = vars;
  let accessoryWidth;
  if (startAccessorySize && endAccessorySize) {
    accessoryWidth = Math.max(startAccessorySize.width, endAccessorySize.width);
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor: theme.colors.background.default,
        flexDirection: 'row',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    titleWrapper: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: accessoryWidth ? 0 : 16,
    },
    title: {
      textAlign: 'center',
    },
    accessoryWrapper: {
      width: accessoryWidth,
    },
  });
};

export default styleSheet;

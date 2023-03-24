// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for Header component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars } = params;
  const { style, startAccessorySize, endAccessorySize } = vars;
  const accessoryWidth =
    Math.max(startAccessorySize?.width, endAccessorySize?.width) || 'auto';

  return StyleSheet.create({
    base: Object.assign(
      {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    titleWrapper: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: accessoryWidth === 'auto' ? 0 : 16,
    },
    title: {
      textAlign: 'center',
    },
    accessoryWrapper: {
      flex: 0,
      width: accessoryWidth,
    },
  });
};

export default styleSheet;

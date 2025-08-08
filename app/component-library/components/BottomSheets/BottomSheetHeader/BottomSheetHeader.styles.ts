// Third party dependencies.
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { BottomSheetHeaderStyleSheetVars } from './BottomSheetHeader.types';

/**
 * Style sheet function for BottomSheetHeader component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BottomSheetHeaderStyleSheetVars;
}) => {
  const { theme, vars } = params;
  const { colors } = theme;
  const { style } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        padding: 16,
        backgroundColor: colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    leftAlignedContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    } as ViewStyle,
    leftAccessory: {
      marginRight: 16,
    } as ViewStyle,
    leftAlignedTitleWrapper: {
      flex: 1,
    } as ViewStyle,
    leftAlignedTitle: {
      textAlign: 'left',
      color: colors.text.default,
    } as TextStyle,
    rightAccessory: {
      marginLeft: 16,
    } as ViewStyle,
  });
};

export default styleSheet;

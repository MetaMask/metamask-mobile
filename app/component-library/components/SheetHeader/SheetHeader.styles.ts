import { StyleSheet, ViewStyle } from 'react-native';
import { SheetHeaderStyleSheetVars } from './SheetHeader.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for SheetHeader component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: SheetHeaderStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    leftItemContainer: {
      flex: 1,
    },
    rightItemContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
  });
};

export default styleSheet;

import { StyleSheet, ViewStyle } from 'react-native';
import { PickerAccountStyleSheetVars } from './PickerAccount.types';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for PickerAccount component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: PickerAccountStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;
  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    accountAvatar: {
      marginRight: 16,
    },
    accountAddressLabel: {
      color: colors.text.alternative,
    },
    cellAccount: {
      flex: 1,
      flexDirection: 'row',
      marginVertical: 16,
    },
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { PickerAccountStyleSheetVars } from './PickerAccount.types';

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
    base: {
      ...(style as ViewStyle),
      flexDirection: 'row',
      borderWidth: 0,
    },
    basePressed: {
      ...(style as ViewStyle),
      flexDirection: 'row',
      borderWidth: 0,
      borderRadius: 2,
      backgroundColor: colors.background.pressed,
    },
    accountAddressLabel: {
      color: colors.text.alternative,
      textAlign: 'center',
    },
    dropDownIcon: {
      marginLeft: 8,
    },
  });
};

export default styleSheet;

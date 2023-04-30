import { StyleSheet } from 'react-native';
// External dependencies.
import { Theme } from '../../../util/theme/models';
import { WalletAccountStyleSheetVars } from './WalletAccount.types';

const styleSheet = (params: {
  theme: Theme;
  vars: WalletAccountStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style } = vars;
  return StyleSheet.create({
    base: {
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      ...style,
    },
    account: {
      alignItems: 'center',
    },
    accountPicker: {
      borderWidth: 0,
      borderColor: colors.border.default,
      borderRadius: 8,
    },
    middleBorder: {
      borderTopWidth: 1,
      borderColor: colors.border.default,
      marginHorizontal: 16,
    },
    addressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.background.default,
      padding: 20,
      borderWidth: 0,
      borderColor: colors.border.default,
      borderRadius: 8,
    },
  });
};
export default styleSheet;

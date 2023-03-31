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
      // This padding it's a tricky way of having the border radius filled on the corners
      padding: 2,
      marginHorizontal: 18,
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      ...style,
    },
    account: {
      alignItems: 'center',
    },
    accountPicker: { borderWidth: 0 },
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
      padding: 16,
    },
    address: { flexDirection: 'row' },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.defaultHover,
      borderRadius: 20,
      paddingHorizontal: 8,
      marginLeft: 8,
    },
  });
};
export default styleSheet;

import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      flex: 1,
      flexDirection: 'column',
    },
    selectionRow: {
      flexDirection: 'row',
      fontWeight: 500,
      justifyContent: 'center',
      gap: 12,
    },
    selectionBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
      borderRadius: 12,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      alignSelf: 'flex-start',
    },
    centerGroup: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      flexGrow: 1,
    },
    amountContainer: {
      alignItems: 'center',
    },
    mainAmount: {
      textAlign: 'center',
      fontSize: 64,
      lineHeight: 100,
      fontWeight: 400,
    },
    convertedAmount: {
      textAlign: 'center',
    },
    fiatSelector: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    cryptoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 100,
      paddingVertical: 8,
      paddingLeft: 8,
      paddingRight: 12,
      backgroundColor: theme.colors.background.muted,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    tokenLogo: {
      width: 32,
      height: 32,
    },
    cryptoText: {
      marginLeft: 8,
    },
    paymentMethodBox: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    paymentMethodContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    keypad: {
      paddingHorizontal: 0,
    },
  });
};

export default styleSheet;

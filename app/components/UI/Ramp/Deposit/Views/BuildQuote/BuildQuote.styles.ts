import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    selectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 32,
      gap: 12,
    },
    selectionBox: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      minHeight: 44,
    },
    centerGroup: {
      alignItems: 'center',
      marginBottom: 32,
    },
    amountContainer: {
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 16,
    },
    mainAmount: {
      textAlign: 'center',
      marginBottom: 8,
    },
    convertedAmount: {
      textAlign: 'center',
    },
    cryptoPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    cryptoText: {
      marginLeft: 8,
    },
    paymentMethodBox: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    paymentMethodContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    tokenLogo: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    keypadContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      paddingBottom: 16,
    },
    keypad: {
      paddingHorizontal: 8,
    },
  });
};

export default styleSheet;

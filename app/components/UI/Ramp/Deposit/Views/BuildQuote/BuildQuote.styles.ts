import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    amountContainer: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingTop: 48,
    },
    mainAmount: {
      textAlign: 'center',
      marginBottom: 8,
    },
    convertedAmount: {
      textAlign: 'center',
    },
    combinedInfoBox: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    infoSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    infoTextContainer: {
      marginLeft: 12,
      flex: 1,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
      marginVertical: 16,
      marginHorizontal: -16,
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

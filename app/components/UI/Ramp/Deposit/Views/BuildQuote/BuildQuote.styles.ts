import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../../styles/common';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    content: {
      flex: 1,
    },
    selectionRow: {
      flexDirection: 'row',
      ...fontStyles.medium,
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
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      flex: 1,
    },
    amountContainer: {
      alignItems: 'center',
    },
    mainAmount: {
      textAlign: 'center',
      fontSize: 64,
      lineHeight: 64 + 8,
      ...fontStyles.normal,
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
    regionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cryptoPill: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      borderRadius: 100,
      paddingVertical: 8,
      paddingLeft: 8,
      paddingRight: 12,
      backgroundColor: theme.colors.background.muted,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
    },
    paymentMethodBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      marginBottom: 16,
    },
    errorText: {
      textAlign: 'center',
    },
    errorContainer: {
      width: '100%',
      alignSelf: 'stretch',
    },
  });
};

export default styleSheet;

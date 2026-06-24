import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    mainSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    iconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 16,
    },
    successIconContainer: {
      width: 40,
      height: 40,
      padding: 4,
      borderRadius: 20,
      backgroundColor: theme.colors.success.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorIconContainer: {
      width: 40,
      height: 40,
      padding: 4,
      borderRadius: 20,
      backgroundColor: theme.colors.error.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    processingIconContainer: {
      width: 40,
      height: 40,
      padding: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainAmount: {
      textAlign: 'center',
      marginBottom: 16,
      fontSize: 40,
    },
    subtitle: {
      textAlign: 'center',
    },
    detailsContainer: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      paddingHorizontal: 16,
      marginBottom: 16,
      paddingVertical: 8,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 8,
    },
    accountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingLeft: 4,
      paddingRight: 8,
      backgroundColor: theme.colors.background.muted,
      borderRadius: 36,
    },
    networkInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    networkIcon: {
      width: 16,
      height: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orderIdContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    transakLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    separator: {
      height: 1,
      marginVertical: 8,
      marginHorizontal: -16,
      backgroundColor: theme.colors.border.muted,
    },
  });
};

export default styleSheet;

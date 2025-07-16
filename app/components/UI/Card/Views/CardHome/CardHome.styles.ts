import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme, itemHeight: number, deviceWidth: number) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background.default,
    },
    wrapper: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    defaultPadding: {
      paddingHorizontal: 16,
      gap: 16,
    },
    spendingWithTitle: {
      marginBottom: 8,
    },
    balanceContainer: {
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    balanceTextContainer: {
      alignItems: 'center',
    },
    mainBalanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    privacyIcon: {
      marginLeft: 8,
    },
    spendingWith: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      paddingBottom: 16,
      height: itemHeight,
      width: deviceWidth - 16 * 2, // Subtracting horizontal padding
    },
    addFundsButtonContainer: {
      paddingHorizontal: 16,
    },
    spendingWithContainer: {
      marginTop: 16,
      gap: 8,
    },
  });

export const headerStyle = StyleSheet.create({
  icon: { marginHorizontal: 16 },
  invisibleIcon: {
    display: 'none',
  },
  title: { alignSelf: 'center' },
});

export default createStyles;

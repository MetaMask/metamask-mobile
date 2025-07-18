import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (theme: Theme) =>
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
      justifyContent: 'center',
      paddingTop: 8,
      paddingHorizontal: 16,
    },
    limitedAllowanceWarningContainer: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderColor: theme.colors.border.muted,
      marginTop: 12,
    },
    addFundsButtonContainer: {
      paddingTop: 18,
      width: '100%',
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

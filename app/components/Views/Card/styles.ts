import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (theme: Theme, itemHeight: number, deviceWidth: number) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
    },
    defaultPadding: {
      paddingHorizontal: 16,
      gap: 16,
    },
    spendingWithTitle: {
      marginBottom: 8,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    privacyIcon: {
      marginLeft: 8,
    },
    spendingWith: {
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingBottom: 16,
      height: itemHeight,
      width: deviceWidth - 16 * 2, // Subtracting horizontal padding
    },
    spendingWithContainer: {
      gap: 8,
    },
  });

export const headerStyle = StyleSheet.create({
  icon: { marginHorizontal: 16 },
  title: { alignSelf: 'center' },
});

export default createStyles;

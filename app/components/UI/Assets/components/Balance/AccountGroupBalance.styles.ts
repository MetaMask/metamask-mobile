import { StyleSheet } from 'react-native';
const createStyles = () =>
  StyleSheet.create({
    accountGroupBalance: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 24,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    skeletonContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
    },
  });

export default createStyles;

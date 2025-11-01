import { StyleSheet } from 'react-native';
const createStyles = () =>
  StyleSheet.create({
    accountGroupBalance: {
      marginHorizontal: 16,
    },
    balanceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    skeletonContainer: {
      flexDirection: 'column',
      gap: 4,
    },
  });

export default createStyles;

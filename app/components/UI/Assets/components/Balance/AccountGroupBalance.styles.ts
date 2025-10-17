import { StyleSheet } from 'react-native';
const createStyles = () =>
  StyleSheet.create({
    accountGroupBalance: {
      marginHorizontal: 16,
    },
    balanceContainer: {
      paddingTop: 24,
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

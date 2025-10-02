import { StyleSheet } from 'react-native';
const createStyles = () =>
  StyleSheet.create({
    accountGroupBalance: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
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

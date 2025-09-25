import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    networkList: {
      flex: 1,
      marginBottom: 8,
    },
    skeleton: {
      marginBottom: 8,
      borderRadius: 16,
    },
    switchSkeleton: {
      marginBottom: 8,
      borderRadius: 16,
    },
  });

export default createStyles;

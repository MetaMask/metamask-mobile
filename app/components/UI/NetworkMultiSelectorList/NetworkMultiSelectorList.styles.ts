import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    // bottom sheet
    networkAvatar: {
      marginHorizontal: 10,
    },
    networkName: {
      flex: 1,
      fontSize: 16,
    },
    networkList: {
      marginHorizontal: 6,
      flex: 1,
    },
  });

export default createStyles;

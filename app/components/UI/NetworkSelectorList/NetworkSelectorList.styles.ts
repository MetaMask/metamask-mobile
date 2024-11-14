import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    networkItemContainer: {
      paddingHorizontal: 10,
      paddingVertical: 14,
    },
    networkAvatar: {
      marginHorizontal: 10,
    },
    networkName: {
      flex: 1,
      fontSize: 16,
    },
    networkList: { marginHorizontal: 6 },
  });

export default styleSheet;

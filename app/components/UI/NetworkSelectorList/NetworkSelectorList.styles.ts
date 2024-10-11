import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    networkItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
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

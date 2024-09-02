import { StyleSheet } from 'react-native';

const styleSheet = () => {
  return StyleSheet.create({
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
  });
};

export default styleSheet;

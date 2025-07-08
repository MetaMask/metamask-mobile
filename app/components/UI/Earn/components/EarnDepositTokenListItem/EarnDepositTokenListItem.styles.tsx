import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    right: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingLeft: 16,
    },
    assetName: {
      flex: 1,
    },
  });

export default styleSheet;

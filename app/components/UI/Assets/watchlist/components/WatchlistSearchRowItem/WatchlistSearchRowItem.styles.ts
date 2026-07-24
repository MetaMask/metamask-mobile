import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rowContent: {
      flex: 1,
    },
    starContainer: {
      paddingLeft: 16,
      zIndex: 1,
    },
  });

export default styleSheet;

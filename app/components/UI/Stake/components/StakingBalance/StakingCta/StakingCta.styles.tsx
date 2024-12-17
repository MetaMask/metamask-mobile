import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    title: {
      paddingBottom: 16,
      paddingTop: 14,
    },
    contentMain: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    rightPad: {
      paddingRight: 3,
    },
  });

export default styleSheet;

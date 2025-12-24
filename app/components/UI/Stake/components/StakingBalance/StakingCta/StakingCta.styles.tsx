import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    contentMain: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      borderRadius: 12,
      marginBottom: 8,
      alignSelf: 'center',
    },
    text: {
      textAlign: 'center',
    },
  });

export default styleSheet;

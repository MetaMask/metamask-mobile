import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    setting: {
      marginTop: 32,
    },
    desc: {
      marginTop: 8,
    },
    transactionsContainer: {
      marginTop: 24,
      marginLeft: -16,
      marginRight: -16,
    },
    switch: {
      alignSelf: 'flex-start',
    },
    cellBorder: { borderWidth: 0 },
  });

export default styleSheet;

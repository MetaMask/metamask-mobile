import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
    },

    container: {
      flex: 1,
    },
    header: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 16,
    },
  });

export default styleSheet;

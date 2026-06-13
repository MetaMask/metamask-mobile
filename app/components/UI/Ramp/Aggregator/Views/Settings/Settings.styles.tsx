import { StyleSheet } from 'react-native';

const styles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    buttons: {
      flexDirection: 'row',
      columnGap: 8,
    },
    button: {
      flex: 1,
    },
    activationKeysRow: {
      marginVertical: 0,
      marginTop: 20,
    },
  });

export default styles;

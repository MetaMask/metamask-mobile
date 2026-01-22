import { Platform, StyleSheet } from 'react-native';

const styles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    buttons: {
      flexDirection: 'row',
      columnGap: 8,
    },
    button: {
      flex: 1,
    },
    footer: {
      marginTop: 24,
      paddingHorizontal: 16,
      marginBottom: Platform.OS === 'android' ? 0 : 16,
    },
  });

export default styles;

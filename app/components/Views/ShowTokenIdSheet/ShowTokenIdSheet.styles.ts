import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,

      marginBottom: 8,

      height: 32,
    },
    textContent: {
      paddingHorizontal: 16,

      alignItems: 'center',
    },
  });

export default createStyles;

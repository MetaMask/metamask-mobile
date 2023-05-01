import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      marginTop: 20,
      paddingHorizontal: 16,
      marginBottom: 16,
      width: '100%',
    },
    title: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: 'bold',
      marginVertical: 0,
      marginBottom: 4,
    },
  });

export default createStyles;

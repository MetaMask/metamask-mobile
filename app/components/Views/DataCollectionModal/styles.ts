import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    content: {
      margin: 20,
      gap: 10,
      display: 'flex',
      flexDirection: 'column',
    },
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 10,
    },
  });

export default createStyles;

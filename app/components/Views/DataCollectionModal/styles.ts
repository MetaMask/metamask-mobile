import { StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    title: {
      textAlign: 'center',
      marginTop: 15,
    },
    content: {
      margin: 20,
      gap: 10,
      display: 'flex',
      flexDirection: 'column',
    },
  });

export default createStyles;

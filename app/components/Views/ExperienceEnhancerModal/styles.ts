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
    list: {
      marginLeft: 10,
      display: 'flex',
      gap: 10,
    },
    dot: {
      marginRight: 10,
    },
    line: {
      display: 'flex',
      flexDirection: 'row',
      gap: 10,
    },
  });

export default createStyles;

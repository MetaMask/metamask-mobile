import { StyleSheet } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 15,
    },
    formTitle: {
      paddingVertical: 5,
    },
    form: {
      paddingVertical: 10,
    },
    input: {
      paddingVertical: 5,
    },
    button: {
      width: '100%',
    },
    clipboardText: {
      marginVertical: 5,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: colors.background.alternative,
      borderRadius: 15,
    },
  });

export default createStyles;

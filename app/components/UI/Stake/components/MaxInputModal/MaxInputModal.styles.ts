import { StyleSheet } from 'react-native';

const createMaxInputModalStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
    },
    textContainer: {
      paddingBottom: 16,
      paddingRight: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    button: {
      flex: 1,
    },
  });

export default createMaxInputModalStyles;

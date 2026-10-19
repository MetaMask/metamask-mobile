import { StyleSheet } from 'react-native';

export const createStyles = () =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      flexGrow: 1,
    },
  });

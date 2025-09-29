import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    contentContainer: {
      paddingBottom: 32,
    },
    errorText: {
      lineHeight: 24,
    },
  });

export default styleSheet;

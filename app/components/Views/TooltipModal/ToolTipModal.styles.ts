import { Platform, StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
    },
    footerContainer: {
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
    },
  });

export default styleSheet;

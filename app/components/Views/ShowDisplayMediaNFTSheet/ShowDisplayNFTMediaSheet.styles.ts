import { Platform, StyleSheet } from 'react-native';

const createStyles = () =>
  StyleSheet.create({
    textContent: { paddingHorizontal: 16 },
    footerContainer: {
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
      paddingHorizontal: 16,
    },
  });

export default createStyles;

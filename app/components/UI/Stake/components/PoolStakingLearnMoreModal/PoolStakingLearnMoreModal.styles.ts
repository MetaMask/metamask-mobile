import { Platform, StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    bodyTextContainer: {
      gap: 16,
      padding: 16,
    },
    italicText: {
      fontStyle: 'italic',
    },
    footer: {
      paddingTop: 24,
      paddingBottom: Platform.OS === 'android' ? 0 : 16,
      paddingHorizontal: 16,
    },
  });

export default styleSheet;

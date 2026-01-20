import { StyleSheet } from 'react-native';

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
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    apyContainer: {
      alignItems: 'center',
      paddingVertical: 24,
      paddingHorizontal: 16,
    },
  });

export default styleSheet;

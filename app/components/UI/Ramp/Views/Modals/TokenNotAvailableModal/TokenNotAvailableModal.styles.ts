import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    footer: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    footerButton: {
      flex: 1,
    },
  });

export default styleSheet;

import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    bodyTextContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
      paddingVertical: 16,
    },
    icon: {
      paddingTop: 2,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

export default styleSheet;

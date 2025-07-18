import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    textContainer: {
      flex: 1,
    },
    bodyTextContainer: {
      paddingBottom: 8,
      paddingHorizontal: 16,
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
      paddingTop: 16,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

export default styleSheet;

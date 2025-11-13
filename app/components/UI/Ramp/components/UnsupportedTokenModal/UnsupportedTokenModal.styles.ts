import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      paddingBottom: 16,
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      right: 16,
      top: 16,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
  });

export default styleSheet;

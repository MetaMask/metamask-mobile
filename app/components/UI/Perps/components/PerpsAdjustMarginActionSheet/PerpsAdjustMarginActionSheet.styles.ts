import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      paddingBottom: 16,
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 12,
    },
    actionContent: {
      flex: 1,
      gap: 4,
    },
    separator: {
      height: 1,
      marginHorizontal: 16,
    },
  });

export default styleSheet;

import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      //   maxHeight: 552,
      paddingHorizontal: 16,
      gap: 12,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    listItemContainer: {
      paddingVertical: 16,
    },
  });

export default styleSheet;

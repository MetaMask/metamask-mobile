import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    listContainer: {
      flex: 1,
    },
    headerContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default styleSheet;

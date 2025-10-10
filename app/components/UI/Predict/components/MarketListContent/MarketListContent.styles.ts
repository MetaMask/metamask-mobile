import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      width: '100%',
    },
    skeleton: {
      marginVertical: 8,
      borderRadius: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      padding: 16,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      padding: 16,
    },
    marketListContainer: {
      flex: 1,
      width: '100%',
    },
  });

export default styleSheet;

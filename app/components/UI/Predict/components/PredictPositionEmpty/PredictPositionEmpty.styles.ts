import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    emptyState: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 16,
    },
    emptyStateTitle: {
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateDescription: {
      textAlign: 'center',
      marginBottom: 24,
    },
    emptyStateButton: {
      alignSelf: 'center',
    },
  });

export default styleSheet;

import { StyleSheet } from 'react-native';

const styleSheet = () => StyleSheet.create({
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 48,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateTitle: {
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateDescription: {
      textAlign: 'center',
      marginBottom: 24,
    },
    exploreMarketsButton: {
      width: '100%',
    },
  });

export default styleSheet;

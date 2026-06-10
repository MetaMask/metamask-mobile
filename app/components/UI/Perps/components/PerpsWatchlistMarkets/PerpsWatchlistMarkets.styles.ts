import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    section: {
      marginBottom: 24,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      paddingTop: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    listContent: {
      paddingHorizontal: 16,
    },
    // Empty state
    emptyStateContainer: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    // Suggested sub-section
    suggestedSection: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    suggestedHeader: {
      marginBottom: 4,
    },
    // Show more / show less toggle
    showMoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 4,
    },
  });
};

export default styleSheet;

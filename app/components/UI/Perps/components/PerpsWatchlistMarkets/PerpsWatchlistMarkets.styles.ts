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
    sectionNoHeader: {
      borderTopWidth: 0,
      paddingTop: 0,
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
    listContent: {},
    // Empty state
    emptyStateContainer: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    // Suggested sub-section
    suggestedSection: {
      paddingTop: 4,
      paddingBottom: 8,
    },
    suggestedSubtitle: {
      marginBottom: 4,
    },
    suggestedHeader: {
      marginBottom: 4,
    },
    // Show more / show less toggle
    showMoreButton: {
      marginTop: 4,
      marginBottom: 8,
    },
    showMoreButtonContainer: {},
  });
};

export default styleSheet;

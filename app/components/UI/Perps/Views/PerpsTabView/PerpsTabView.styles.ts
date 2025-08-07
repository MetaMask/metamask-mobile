import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      marginBottom: 12,
    },
    sectionTitle: {
      paddingTop: 8,
    },
    emptyContainer: {
      padding: 24,
      alignItems: 'center' as const,
    },
    emptyText: {
      textAlign: 'center' as const,
      marginTop: 8,
    },
    loadingContainer: {
      padding: 24,
      alignItems: 'center' as const,
    },
    bottomSheetContent: {
      padding: 24,
    },
    actionButton: {
      marginBottom: 12,
    },
  });
};

export default styleSheet;

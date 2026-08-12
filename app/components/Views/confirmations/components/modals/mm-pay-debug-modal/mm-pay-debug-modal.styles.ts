import { Platform, StyleSheet } from 'react-native';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'column',
    },
    scrollView: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    sectionContainer: {
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      borderRadius: 8,
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.background.alternative,
    },
    sectionTitleContainer: {
      flex: 1,
    },
    sectionContent: {
      padding: 12,
      backgroundColor: theme.colors.background.default,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
    },
    monospaceText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      color: theme.colors.text.default,
    },
    emptyStateText: {
      fontStyle: 'italic',
      color: theme.colors.text.muted,
      padding: 12,
    },
    sectionNote: {
      fontStyle: 'italic',
      color: theme.colors.text.muted,
      marginBottom: 8,
    },
    copyAllButtonContainer: {
      marginTop: 24,
      marginBottom: 24,
      alignItems: 'center',
    },
    quoteSection: {
      marginBottom: 16,
    },
    quoteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    quoteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    quoteValueGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 6,
    },
  });
};

export default styleSheet;

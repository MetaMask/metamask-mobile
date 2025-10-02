import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 300,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    searchPlaceholder: {
      padding: 12,
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchPlaceholderText: {
      color: theme.colors.text.muted,
    },
    searchTextField: {
      backgroundColor: theme.colors.background.muted,
      borderWidth: 0,
      borderRadius: 16,
      padding: 0,
    },
    listContainer: {
      flexGrow: 1,
      flexShrink: 1,
      flexDirection: 'row',
      minHeight: 200,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.background.default,
    },
    sectionHeaderText: {
      color: theme.colors.text.alternative,
    },
    accountItem: {
      paddingHorizontal: 16,
      width: '100%',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 32,
      minHeight: 200,
    },
    emptyStateText: {
      color: theme.colors.text.muted,
      textAlign: 'center',
    },
    footerSpacing: {
      height: 8,
    },
  });

export default createStyles;

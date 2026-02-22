import { StyleSheet } from 'react-native';
import { Theme } from '../../../../util/theme/models';

const createStyles = (params: {
  theme: Theme;
  vars: { isSelected?: boolean };
}) => {
  const { theme, vars } = params;
  const { isSelected } = vars;
  const { colors } = theme;

  return StyleSheet.create({
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
      borderRadius: 9999,
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      width: '100%',
      backgroundColor: isSelected
        ? colors.background.muted
        : colors.background.default,
    },
    selectedIndicator: {
      marginLeft: -12, // The width of the indicator is 4px, so we need to offset by 12px to align with the cell
      marginRight: 8,
      width: 4,
      height: 56, // Cell height (68px) - 4px
      borderRadius: 8,
      backgroundColor: theme.colors.primary.default,
    },
    accountCellWrapper: {
      flex: 1,
    },
    externalAccountContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: 16,
    },
    textContainer: {
      flex: 1,
      flexDirection: 'column',
      gap: 4,
    },
    networkAvatarContainer: {
      marginLeft: 8,
      alignSelf: 'center',
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
};

export default createStyles;

import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 40, // Same width as ButtonIcon to center the title
    },
    searchButton: {
      padding: 4,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.muted,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 50,
    },
    searchIcon: {
      marginRight: 10,
      color: colors.icon.muted,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text.default,
      includeFontPadding: false, // Android-specific: removes extra font padding
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: 16,
    },
    tabBarContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    actionButtonsContainer: {
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 16,
    },
    actionButton: {
      backgroundColor: colors.background.alternative,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border.muted,
      marginBottom: 12,
      overflow: 'hidden',
    },
    actionButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    actionButtonTextContainer: {
      flex: 1,
      marginRight: 12,
    },
    bottomSpacer: {
      height: 80, // Space for tab bar + safe area
    },
    section: {
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      paddingBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    sectionContent: {
      paddingHorizontal: 16,
    },
  });
};

export default styleSheet;

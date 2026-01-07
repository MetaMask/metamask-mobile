import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    // Container for TabsList - ensures full width
    container: {
      width: '100%', // Explicit width needed for consistent Android layout
      flex: 1,
    },
    // Tab content styles (TabsList provides tab bar styling and spacing)
    tabContent: {
      paddingTop: 16, // Add spacing between tabs and content
    },
    // Full-width tab wrapper
    fullWidthTabWrapper: {
      flex: 1,
    },
    // Navigation panel styles
    navigationPanel: {
      paddingTop: 16,
    },
    // ... existing styles ...
    tabContainer: {
      paddingTop: 18,
    },
    tabStyle: {
      paddingVertical: 8,
    },
    statisticsTitle: {
      marginBottom: 16,
    },
    singleTabContainer: {
      paddingHorizontal: 16, // Match TabsList px-4 padding for consistent alignment
    },
    statisticsGrid: {
      gap: 12,
    },
    statisticsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    statisticsItem: {
      flex: 1,
      backgroundColor: theme.colors.background.alternative,
      padding: 16,
      borderRadius: 8,
    },
    statisticsLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    statisticsValue: {
      fontSize: 16,
      fontWeight: '600',
    },
    emptyStateContainer: {
      alignItems: 'center',
      paddingTop: 24,
      paddingBottom: 24,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateText: {
      textAlign: 'center',
    },
    riskDisclaimer: {
      paddingTop: 8,
      textAlign: 'left',
    },
    // Scrollable orders styles
    ordersScrollView: {
      maxHeight: 400, // Limit height for scrolling
    },
    ordersScrollContent: {
      paddingBottom: 8,
    },
    // Loading skeleton styles
    skeletonTabBar: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background.default,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
      height: 50,
    },
    skeletonTab: {
      flex: 1,
      height: 50,
      paddingVertical: 16,
      alignItems: 'center',
    },
    skeletonContent: {
      borderRadius: 12,
      width: '100%',
    },
  });

export default styleSheet;

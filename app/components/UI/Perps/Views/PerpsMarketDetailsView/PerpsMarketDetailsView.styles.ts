import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../../util/theme/models';

/**
 * Enterprise-grade layout styles with clear separation of concerns
 * Architecture: Fixed Header + Flex Content + Fixed Actions Footer
 */
export const createStyles = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    // Main container - fills entire screen
    mainContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },

    // Scrollable content container - takes remaining space
    scrollableContentContainer: {
      flex: 1,
    },

    // Main content scroll view
    mainContentScrollView: {
      flex: 1,
    },

    // Content padding for proper spacing
    scrollViewContent: {
      paddingBottom: 16, // Consistent bottom padding
    },

    // Container for error state
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    section: {
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    chartSection: {
      paddingTop: 0,
      marginTop: 16,
      position: 'relative',
    },
    tabsSection: {
      paddingVertical: 8,
      // No horizontal padding - TabsList provides its own
    },
    // Fixed actions footer - positioned at bottom of screen
    actionsFooter: {
      backgroundColor: theme.colors.background.default,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 26,
    },
    // Action buttons container
    actionsContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    // Single action container (for add funds)
    singleActionContainer: {
      alignItems: 'center',
      gap: 12,
    },
    actionButtonWrapper: {
      flex: 1,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    riskDisclaimer: {
      textAlign: 'left',
      lineHeight: 14,
      paddingTop: 8,
    },
  });

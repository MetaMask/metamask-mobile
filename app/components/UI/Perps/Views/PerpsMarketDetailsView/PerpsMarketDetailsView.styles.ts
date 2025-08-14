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

    // Fixed header section
    headerSection: {
      // Header height is determined by PerpsMarketHeader component
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

    // Legacy container style for backward compatibility
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.muted,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    assetInfo: {
      gap: 4,
    },
    assetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    assetName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    priceInfo: {
      alignItems: 'flex-end',
    },
    price: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text.default,
    },
    section: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    chartSection: {
      paddingTop: 0,
      marginTop: 16,
    },
    // Fixed actions footer - positioned at bottom of screen
    actionsFooter: {
      backgroundColor: theme.colors.background.default,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.muted,
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32, // Extra padding for safe area
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
    actionButton: {
      flex: 1,
    },
    longButton: {
      backgroundColor: theme.colors.success.default,
    },
    shortButton: {
      backgroundColor: theme.colors.error.default,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    positionWarning: {
      marginBottom: 12,
      paddingHorizontal: 16,
    },
    positionWarningText: {
      textAlign: 'center',
    },
    riskDisclaimer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      textAlign: 'left',
    },
  });

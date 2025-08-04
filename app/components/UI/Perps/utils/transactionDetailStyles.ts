import type { Theme } from '../../../../util/theme/models';

/**
 * Shared styles for Perps transaction detail views
 * Extracts common styling patterns used across PerpsOrderTransactionView,
 * PerpsPositionTransactionView, and PerpsFundingTransactionView
 */
export const createTransactionDetailStyles = (theme: Theme) => {
  const { colors } = theme;

  return {
    // Container styles
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 24,
    },

    // Asset container styles (for views with asset hero)
    assetContainer: {
      alignItems: 'center' as const,
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    assetIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 36,
      marginBottom: 16,
      overflow: 'hidden' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    assetIcon: {
      width: 44,
      height: 44,
      borderRadius: 36,
    },
    assetAmount: {
      fontWeight: '700' as const,
      color: colors.text.default,
    },

    // Details container and rows
    detailsContainer: {
      flex: 1,
    },
    detailRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 8,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text.default,
      fontWeight: '400' as const,
    },

    // Section separator
    sectionSeparator: {
      height: 16,
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },

    // Block explorer button
    blockExplorerButton: {
      marginTop: 16,
      marginBottom: 16,
    },

    // Status-specific styles
    profitValue: {
      color: colors.success.default,
      fontWeight: '500' as const,
    },
  };
};

/**
 * Type for the shared transaction detail styles
 */
export type TransactionDetailStyles = ReturnType<
  typeof createTransactionDetailStyles
>;

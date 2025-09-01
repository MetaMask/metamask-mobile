import { StyleSheet } from 'react-native';
import type { Theme } from '../../../../util/theme/models';

/**
 * Shared styles for Perps transaction detail views
 * Extracts common styling patterns used across PerpsOrderTransactionView,
 * PerpsPositionTransactionView, and PerpsFundingTransactionView
 */
export const createTransactionDetailStyles = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
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
      alignItems: 'center',
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    assetIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 36,
      marginBottom: 16,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    assetIcon: {
      width: 44,
      height: 44,
      borderRadius: 36,
    },
    assetAmount: {
      fontWeight: '700',
      color: colors.text.default,
    },

    // Details container and rows
    detailsContainer: {
      flex: 1,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
      fontWeight: '400',
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
      fontWeight: '500',
    },
  });
};

/**
 * Type for the shared transaction detail styles
 */
export type TransactionDetailStyles = ReturnType<
  typeof createTransactionDetailStyles
>;

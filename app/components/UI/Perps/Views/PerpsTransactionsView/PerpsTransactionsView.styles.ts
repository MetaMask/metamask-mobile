import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flex: 1,
    },
    filterContainer: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    tabDescription: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    transactionItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 72,
    },
    tokenIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 12,
      overflow: 'hidden' as const,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    transactionContent: {
      flex: 1,
    },
    transactionContentCentered: {
      flex: 1,
      justifyContent: 'center' as const,
    },
    transactionTitle: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text.default,
      marginBottom: 4,
    },
    transactionTitleCentered: {
      fontSize: 16,
      fontWeight: '400' as const,
      color: colors.text.default,
      marginBottom: 0, // No margin when centered
    },
    transactionSubtitle: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    rightContent: {
      alignItems: 'flex-end' as const,
    },
    profitAmount: {
      color: colors.success.default,
    },
    lossAmount: {
      color: colors.error.default,
    },
    statusFilled: {
      color: colors.text.muted,
    },
    statusCanceled: {
      color: colors.text.muted,
    },
    statusPending: {
      color: colors.text.muted,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingVertical: 40,
    },
    sectionHeader: {
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
  };
};

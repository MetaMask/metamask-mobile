import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      flex: 1,
    },
    filterTabText: {
      color: colors.text.alternative,
    },
    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.background.default,
    },
    filterScrollView: {
      flexGrow: 0,
    },
    filterTabContainer: {
      gap: 8,
    },
    filterTabActive: {
      backgroundColor: colors.background.defaultPressed,
    },
    transactionList: {
      flex: 1,
      minHeight: 1, // Prevents FlashList layout issues
    },
    tabDescription: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sectionHeader: {
      paddingTop: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    sectionHeaderText: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: colors.text.alternative,
    },
    transactionItem: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 16,
      paddingHorizontal: 16,
      minHeight: 72, // Consistent height for FlashList
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
      paddingVertical: 48,
    },
    fillTag: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 10,
    },
  };
};

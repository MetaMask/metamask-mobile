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
      backgroundColor: colors.background.default,
    },
    filterScrollView: {
      flexGrow: 0,
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
  };
};

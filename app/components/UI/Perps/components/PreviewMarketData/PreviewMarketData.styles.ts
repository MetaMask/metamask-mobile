import type { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    container: {
      marginTop: 24,
      padding: 16,
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
    },
    header: {
      marginBottom: 16,
      alignItems: 'center' as const,
    },
    marketRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    lastMarketRow: {
      borderBottomWidth: 0,
    },
    symbolText: {
      fontWeight: '600' as const,
    },
    priceContainer: {
      alignItems: 'flex-end' as const,
    },
    priceText: {
      fontWeight: '500' as const,
    },
  };
};

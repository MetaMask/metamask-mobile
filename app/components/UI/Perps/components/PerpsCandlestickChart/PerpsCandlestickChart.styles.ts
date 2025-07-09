import { Theme } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return {
    chartContainer: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    loadingText: {
      textAlign: 'center' as const,
    },
    noDataText: {
      textAlign: 'center' as const,
    },
    priceLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
      alignSelf: 'flex-start' as const,
    },
    priceText: {
      color: colors.text.default,
      fontSize: 14,
      fontWeight: '600' as const,
    },
    dateLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
      alignSelf: 'flex-start' as const,
    },
    dateText: {
      color: colors.text.muted,
      fontSize: 12,
    },
    // Grid line styles
    gridLine: {
      color: colors.border.muted,
      opacity: 0.6,
    },
    majorGridLine: {
      color: colors.border.muted,
      opacity: 0.8,
    },
    gridContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      pointerEvents: 'none' as const,
    },
    gridLineWithLabel: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    gridLineBar: {
      flex: 1,
      height: 1,
    },
    gridPriceLabel: {
      position: 'absolute' as const,
      right: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      minWidth: 60,
    },
    gridPriceLabelText: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: colors.text.muted,
      textAlign: 'right' as const,
      textShadowColor: colors.background.default,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    },
    // Tooltip styling
    tooltipContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border.muted,
      shadowColor: colors.shadow.default,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    tooltipText: {
      color: colors.text.default,
      fontSize: 12,
      fontWeight: '600' as const,
    },
    tooltipDateText: {
      color: colors.text.muted,
      fontSize: 10,
      marginTop: 2,
    },
    // Interval selector styling
    intervalSelector: {
      flexDirection: 'row' as const,
      //   backgroundColor: 'red',
      alignSelf: 'center' as const,
      //   paddingRight: 16,
      marginTop: 24,
    },
    intervalTab: {
      paddingVertical: 6,
      borderRadius: 6,
      padding: 10,
      alignItems: 'center' as const,
    },
    intervalTabActive: {
      backgroundColor: colors.primary.muted,
    },
    intervalTabInactive: {
      backgroundColor: 'transparent',
    },
    intervalTabText: {
      fontSize: 12,
    },
    intervalTabTextActive: {
      color: colors.primary.inverse,
    },
    intervalTabTextInactive: {
      color: colors.text.muted,
    },
  };
};

import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme, Colors } from '../../../../../util/theme/models';

export const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    chartContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      textAlign: 'center',
    },
    noDataText: {
      textAlign: 'center',
    },
    priceLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginBottom: 8,
      alignSelf: 'flex-start',
    },
    priceText: {
      color: colors.text.default,
      fontSize: 14,
      fontWeight: '600',
    },
    dateLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
      alignSelf: 'flex-start',
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
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1,
      pointerEvents: 'none',
    },
    gridLineWithLabel: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    gridLineBar: {
      flex: 1,
      height: 1,
    },
    gridPriceLabel: {
      position: 'absolute',
      right: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      minWidth: 60,
    },
    gridPriceLabelText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text.muted,
      textAlign: 'right',
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
      fontWeight: '600',
    },
    tooltipDateText: {
      color: colors.text.muted,
      fontSize: 10,
      marginTop: 2,
    },
    // Interval selector styling
    intervalSelector: {
      flexDirection: 'row',
      //   backgroundColor: 'red',
      alignSelf: 'center',
      //   paddingRight: 16,
      marginTop: 24,
    },
    intervalTab: {
      paddingVertical: 6,
      borderRadius: 6,
      padding: 10,
      alignItems: 'center',
    },
    intervalTabActive: {
      backgroundColor: colors.primary.muted,
    },
    intervalTabInactive: {
      backgroundColor: importedColors.transparent,
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
    chartLoadingContainer: {
      backgroundColor: importedColors.transparent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Add new styles for inline styles
    relativeContainer: {
      position: 'relative',
    },
    noDataContainer: {
      backgroundColor: importedColors.transparent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gridLineStyle: {
      position: 'absolute',
      left: 0,
      right: 0,
      zIndex: 10,
    },
    majorGridLineStyle: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      zIndex: 10,
      backgroundColor: colors.border.muted,
      opacity: 0.8,
    },
    minorGridLineStyle: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      zIndex: 10,
      backgroundColor: colors.border.muted,
      opacity: 0.6,
    },
  });
};

export const getGridLineStyle = (
  colors: Colors,
  isEdge: boolean,
  position: number,
) => ({
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: position,
  height: isEdge ? 2 : 1,
  zIndex: 10,
  backgroundColor: colors.border.muted,
  opacity: isEdge ? 0.8 : 0.6,
});

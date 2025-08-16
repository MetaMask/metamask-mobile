import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme, Colors } from '../../../../../util/theme/models';
import { PERPS_CHART_CONFIG } from '../../constants/chartConfig';

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

    dateLabel: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginTop: 8,
      alignSelf: 'flex-start',
    },

    // Grid line styles
    gridLine: {
      color: colors.border.muted,
      opacity: PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MINOR,
    },
    majorGridLine: {
      color: colors.border.muted,
      opacity: PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MAJOR,
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
      opacity: PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MAJOR,
    },
    minorGridLineStyle: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      zIndex: 10,
      backgroundColor: colors.border.muted,
      opacity: PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MINOR,
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
  opacity: isEdge
    ? PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MAJOR
    : PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MINOR,
});

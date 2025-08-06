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
    tpslContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: -999, // Far below everything including tooltip
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
      zIndex: 10,
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
    chartWithPadding: {
      paddingRight: 65,
    },
    timeAxisContainer: {
      width: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      height: 20,
      marginTop: 4,
      marginBottom: 8,
      paddingRight: 50, // Match the chart's right padding to align with rightmost candle
    },
    timeLabel: {
      position: 'absolute',
      textAlign: 'center',
      minWidth: 40,
      transform: [{ translateX: -20 }], // Center the label on its position
    },
    tpslLine: {
      position: 'absolute',
      left: 0,
      height: 1,
      zIndex: -999, // Far below everything
      opacity: 0.8,
      pointerEvents: 'none',
      borderTopWidth: 1,
      borderStyle: 'dashed',
      backgroundColor: importedColors.transparent,
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
    loadingIndicator: {
      position: 'absolute',
      zIndex: 20, // Above everything
      backgroundColor: colors.overlay.default,
      borderRadius: 12,
      padding: 4,
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingIndicatorLeft: {
      left: 0,
    },
    loadingIndicatorRight: {
      right: 0,
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

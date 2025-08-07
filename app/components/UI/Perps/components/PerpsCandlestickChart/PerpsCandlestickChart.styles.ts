import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import { Theme } from '../../../../../util/theme/models';
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
      height: 40, // Increased height to accommodate two lines
      marginTop: 4,
      marginBottom: 8,
      paddingRight: 50, // Match the chart's right padding to align with rightmost candle
    },
    timeLabel: {
      position: 'absolute',
      textAlign: 'center',
      minWidth: 50, // Increased width to accommodate date text
      transform: [{ translateX: -25 }], // Adjusted centering for wider label
      lineHeight: 16, // Set line height for better spacing between lines
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

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
    // Zoom controls styles
    zoomControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 8,
      gap: 16,
    },
    zoomButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      borderWidth: 1,
      borderColor: colors.border.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomButtonDisabled: {
      opacity: 0.5,
      backgroundColor: colors.background.muted,
    },
    candleCountText: {
      minWidth: 80,
      textAlign: 'center',
    },
    candleCountPreview: {
      fontWeight: '600',
      // Add subtle animation or highlighting for preview state
    },
    chartGesturing: {
      opacity: 0.8,
      // Subtle visual feedback during pinch gesture
    },
  });
};

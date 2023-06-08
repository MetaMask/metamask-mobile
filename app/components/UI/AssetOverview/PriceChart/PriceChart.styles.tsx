import { Theme } from '@metamask/design-tokens';
import { Dimensions, StyleSheet, TextStyle } from 'react-native';

export const CHART_HEIGHT = Dimensions.get('screen').height * 0.44;

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { typography } = theme;
  return StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: CHART_HEIGHT - 10, // hack to remove internal padding that is not configurable
      paddingTop: 0,
      marginVertical: 10,
      width: Dimensions.get('screen').width,
    },
    chartArea: {
      flex: 1,
    },
    chartLoading: {
      width: Dimensions.get('screen').width,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    noDataOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 96,
      zIndex: 1,
    },
    noDataOverlayTitle: {
      ...typography.sHeadingMD,
      textAlign: 'center',
    } as TextStyle,
    noDataOverlayText: {
      ...typography.sBodyLGMedium,
      textAlign: 'center',
    } as TextStyle,
  });
};

export default styleSheet;

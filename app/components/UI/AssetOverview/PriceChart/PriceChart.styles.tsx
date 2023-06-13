import { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

export const getChartHeight = (height: number) => height * 0.44;

const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { theme, vars } = params;
  const { typography } = theme;

  return StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: getChartHeight(vars.height) - 10, // hack to remove internal padding that is not configurable
      paddingTop: 0,
      marginVertical: 10,
      width: vars.width,
    },
    chartArea: {
      flex: 1,
    },
    chartLoading: {
      width: vars.width,
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

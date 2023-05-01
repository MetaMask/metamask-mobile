import { Dimensions, StyleSheet } from 'react-native';

export const CHART_HEIGHT = Dimensions.get('screen').height * 0.35;

const createStyles = () =>
  StyleSheet.create({
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
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 96,
      zIndex: 1,
    },
    noDataOverlayTitle: {
      textAlign: 'center',
      fontSize: 18,
      lineHeight: 24,
    },
    noDataOverlayText: {
      textAlign: 'center',
      fontSize: 16,
      lineHeight: 24,
    },
  });

export default createStyles;

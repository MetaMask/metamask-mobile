import type { Theme } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: { chartHeight: number };
}) => {
  const { theme } = params;
  const { chartHeight } = params.vars;
  return StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: chartHeight,
      paddingTop: 0,
      marginVertical: 0,
      // Match parent width (e.g. token overview with horizontal padding). Full screen width here
      // overflows the padded container and clips the SVG on the right — hiding the end dot.
      width: '100%',
      alignSelf: 'stretch',
      overflow: 'visible',
    },
    /** Touch + overlay host; `AreaChart` stays full-size while overlays are absolutely positioned. */
    chartAreaWrapper: {
      flex: 1,
      position: 'relative',
    },
    chartArea: {
      flex: 1,
    },
    /** Same pattern as AdvancedChart: overlay does not participate in flex layout with AreaChart. */
    loadingOverlayContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    noDataOverlayContainer: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 5,
    },
    chartLoading: {
      width: '100%',
      alignSelf: 'stretch',
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    tooltipLine: {
      color: theme.colors.icon.alternative,
    },
    tooltipCircle: {
      color: theme.colors.primary.inverse,
    },
  });
};

export default styleSheet;

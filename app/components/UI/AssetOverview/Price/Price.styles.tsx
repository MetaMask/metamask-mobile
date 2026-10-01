import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';
import { TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT } from './tokenOverviewChart.constants';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    wrapper: {
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'column',
      alignItems: 'flex-start',
    } as ViewStyle,
    assetWrapper: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    stockBadge: {
      marginLeft: 8,
    },
    chartContainer: {
      width: '100%',
      alignSelf: 'stretch',
    } as ViewStyle,
    edgeOverlay: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 15,
      zIndex: 10,
    } as ViewStyle,
    timeRangeContainer: {
      width: '100%',
      alignSelf: 'stretch',
      paddingTop: 12,
      paddingBottom: 24,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 10,
    } as ViewStyle,
    /** Container for IntervalBar above chart (technical indicators flag ON) - exactly 16px spacing to chart */
    intervalBarContainer: {
      width: '100%',
      alignSelf: 'stretch',
      paddingTop: 8,
      paddingBottom: 8,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 10,
    } as ViewStyle,
    /** Under flex-start parent, stretch so inner space-between uses full screen width */
    timeRangeSelectorWrap: {
      width: '100%',
      alignSelf: 'stretch',
    } as ViewStyle,
    intervalSelectorScrollView: {
      flex: 1,
    } as ViewStyle,
    intervalSelectorScrollViewContent: {
      flexGrow: 1,
    } as ViewStyle,
    noDataOverlay: {
      ...StyleSheet.absoluteFill,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    } as ViewStyle,
    /** Layout container for the legacy chart's MMDS time-period filter group. */
    chartNavigationWrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      borderRadius: 8,
      minHeight: TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT,
    } as ViewStyle,
  });

export default styleSheet;

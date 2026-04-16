import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';
import { TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT } from './tokenOverviewChart.constants';

const styleSheet = (_params: { theme: Theme }) =>
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
    loadingPrice: {
      paddingTop: 8,
    },
    loadingPriceDiff: {
      paddingTop: 2,
    },
    chartContainer: {
      width: '100%',
      alignSelf: 'stretch',
    } as ViewStyle,
    /** Figma: column, py 12, align start, gap 10; child row is full width */
    timeRangeContainer: {
      width: '100%',
      alignSelf: 'stretch',
      paddingTop: 12,
      paddingBottom: 24,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 10,
    } as ViewStyle,
    /** Under flex-start parent, stretch so inner space-between uses full screen width */
    timeRangeSelectorWrap: {
      width: '100%',
      alignSelf: 'stretch',
    } as ViewStyle,
    noDataOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    } as ViewStyle,
    /**
     * Segment row for legacy chart periods; matches {@link TimeRangeSelector} segment padding (`py-1` / `px-4`).
     * Vertical spacing chart→selector and selector→actions comes from the parent `timeRangeContainer`
     * (same as `Price.advanced`).
     */
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

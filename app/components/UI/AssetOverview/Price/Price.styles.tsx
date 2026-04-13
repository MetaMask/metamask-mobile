import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, ViewStyle } from 'react-native';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
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
  });
};

export default styleSheet;

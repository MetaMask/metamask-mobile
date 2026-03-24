import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

const styleSheet = (params: {
  theme: Theme;
  vars: {
    priceDiff: number;
  };
}) => {
  const {
    theme,
    vars: { priceDiff },
  } = params;
  const { colors } = theme;
  return StyleSheet.create({
    wrapper: {
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 4,
      gap: 4,
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
    priceDiff: {
      color:
        priceDiff > 0
          ? colors.success.default
          : priceDiff < 0
            ? colors.error.default
            : colors.text.alternative,
    } as TextStyle,
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
    noDataOverlayTitle: {
      textAlign: 'center',
    } as TextStyle,
    noDataOverlayText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    } as TextStyle,
  });
};

export default styleSheet;

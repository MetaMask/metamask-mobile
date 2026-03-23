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
      marginBottom: 12,
    } as ViewStyle,
    timeRangeContainer: {
      paddingBottom: 16,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      width: '100%',
      alignSelf: 'stretch',
    } as ViewStyle,
    placeholderChart: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 0,
    } as ViewStyle,
    noDataOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      paddingVertical: 16,
      gap: 8,
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

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
    } as ViewStyle,
    timeRangeContainer: {
      paddingBottom: 16,
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 16,
      alignSelf: 'stretch',
    } as ViewStyle,
  });
};

export default styleSheet;

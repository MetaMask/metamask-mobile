import type { Theme } from '@metamask/design-tokens';
import { StyleSheet, TextStyle } from 'react-native';

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
      paddingHorizontal: 16,
    },
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
  });
};

export default styleSheet;

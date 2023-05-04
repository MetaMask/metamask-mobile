import { Theme } from '@metamask/design-tokens';
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
  const { colors, typography } = theme;
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    symbol: {
      ...typography.sBodySM,
    } as TextStyle,
    name: {
      ...typography.lBodyLGMedium,
    } as TextStyle,
    price: {
      ...typography.lHeadingLG,
    } as TextStyle,
    priceDiff: {
      ...typography.sBodyMD,
      color:
        priceDiff > 0
          ? colors.success.default
          : priceDiff < 0
          ? colors.error.default
          : colors.text.alternative,
      lineHeight: 22,
    } as TextStyle,
    priceDiffIcon: {
      marginTop: 10,
    },
    timePeriod: {
      ...typography.sBodyMD,
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

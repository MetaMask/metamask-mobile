import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { StyleSheet } from 'react-native';

const createStyles = (colors: ThemeColors, priceDiff: number) => {
  const red = '#FF3B30';
  const green = '#28A745';
  return StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    symbol: {
      fontSize: 12,
      color: colors.text.alternative,
      marginVertical: 0,
      lineHeight: 20,
    },
    name: {
      fontSize: 18,
      lineHeight: 24,
      color: colors.text.default,
    },
    price: {
      fontSize: 32,
      fontWeight: 'bold',
      marginVertical: 0,
      lineHeight: 40,
    },
    priceDiff: {
      marginVertical: 0,
      fontSize: 14,
      color:
        priceDiff > 0 ? green : priceDiff < 0 ? red : colors.text.alternative,
      lineHeight: 22,
    },
    priceDiffIcon: {
      marginTop: 10,
    },
    timePeriod: {
      fontSize: 14,
      color: colors.text.alternative,
    },
    loadingPrice: {
      paddingTop: 8,
    },
    loadingPriceDiff: {
      paddingTop: 2,
    },
  });
};

export default createStyles;

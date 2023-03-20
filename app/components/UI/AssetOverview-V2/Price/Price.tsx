import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { addCurrencySymbol } from '../../../../util/number';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import React, { useContext, useMemo } from 'react';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { Asset } from '../AssetOverview.types';

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

interface PriceProps {
  asset: Asset;
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: '1d' | '7d' | '1w' | '1m' | '3m' | '1y' | '3y';
}

const Price = ({
  asset,
  priceDiff,
  currentPrice,
  currentCurrency,
  comparePrice,
  isLoading,
  timePeriod,
}: PriceProps) => {
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(
    () => createStyles(colors, priceDiff),
    [colors, priceDiff],
  );
  const timePeriodTextDict: Record<
    '1d' | '7d' | '1w' | '1m' | '3m' | '1y' | '3y',
    string
  > = {
    '1d': 'Today',
    '7d': 'Past 7 days',
    '1w': 'Past week',
    '1m': 'Past month',
    '3m': 'Past 3 months',
    '1y': 'Past year',
    '3y': 'Past 3 years',
  };
  return (
    <View style={styles.wrapper}>
      <Text style={styles.symbol}>{asset.symbol}</Text>
      {asset.name && <Text style={styles.name}>{asset.name}</Text>}
      <Title style={styles.price}>
        {isLoading ? (
          <View style={styles.loadingPrice}>
            <SkeletonPlaceholder>
              <SkeletonPlaceholder.Item
                width={100}
                height={32}
                borderRadius={6}
              />
            </SkeletonPlaceholder>
          </View>
        ) : (
          addCurrencySymbol(currentPrice, currentCurrency)
        )}
      </Title>
      <Text>
        {isLoading ? (
          <View style={styles.loadingPriceDiff}>
            <SkeletonPlaceholder>
              <SkeletonPlaceholder.Item
                width={150}
                height={18}
                borderRadius={6}
              />
            </SkeletonPlaceholder>
          </View>
        ) : (
          <Text style={styles.priceDiff}>
            <Icon
              name={
                priceDiff > 0
                  ? 'trending-up'
                  : priceDiff < 0
                  ? 'trending-down'
                  : 'minus'
              }
              size={16}
              style={styles.priceDiffIcon}
            />{' '}
            {addCurrencySymbol(priceDiff, currentCurrency)} (
            {priceDiff > 0 ? '+' : ''}
            {priceDiff === 0
              ? '0'
              : ((priceDiff / comparePrice) * 100).toFixed(2)}
            %){' '}
            <Text style={styles.timePeriod}>
              {timePeriodTextDict[timePeriod]}
            </Text>
          </Text>
        )}
      </Text>
    </View>
  );
};

export default Price;

import { StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { addCurrencySymbol } from '../../../../util/number';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import React, { useContext, useMemo, useState } from 'react';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { Asset } from '../AssetOverview.types';
import { strings } from '../../../../../locales/i18n';
import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import PriceChart from '../PriceChart/PriceChart';
import { distributeDataPoints } from '../PriceChart/utils';
import { toDateFormat } from '../../../../util/date';

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
  prices: TokenPrice[];
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: '1d' | '7d' | '1w' | '1m' | '3m' | '1y' | '3y';
}

const Price = ({
  asset,
  prices,
  priceDiff,
  currentPrice,
  currentCurrency,
  comparePrice,
  isLoading,
  timePeriod,
}: PriceProps) => {
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const [activeChartIndex, setActiveChartIndex] = useState<number>(-1);

  const distributedPriceData = useMemo(() => {
    if (prices.length > 0) {
      return distributeDataPoints(prices);
    }
    return [];
  }, [prices]);

  const handleChartInteraction = (index: number) => {
    setActiveChartIndex(index);
  };

  const timePeriodTextDict: Record<
    '1d' | '7d' | '1w' | '1m' | '3m' | '1y' | '3y',
    string
  > = {
    '1d': strings('asset_overview.chart_time_period.1d'),
    '7d': strings('asset_overview.chart_time_period.7d'),
    '1w': strings('asset_overview.chart_time_period.1w'),
    '1m': strings('asset_overview.chart_time_period.1m'),
    '3m': strings('asset_overview.chart_time_period.3m'),
    '1y': strings('asset_overview.chart_time_period.1y'),
    '3y': strings('asset_overview.chart_time_period.3y'),
  };

  const price: number =
    distributedPriceData[activeChartIndex]?.[1] || currentPrice;
  const date: string | undefined = distributedPriceData[activeChartIndex]?.[0]
    ? toDateFormat(distributedPriceData[activeChartIndex]?.[0])
    : timePeriodTextDict[timePeriod];

  const diff: number | undefined = distributedPriceData[activeChartIndex]?.[1]
    ? distributedPriceData[activeChartIndex]?.[1] - comparePrice
    : priceDiff;

  const styles = useMemo(() => createStyles(colors, diff), [colors, diff]);

  return (
    <>
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
            addCurrencySymbol(price, currentCurrency, true)
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
                  diff > 0
                    ? 'trending-up'
                    : diff < 0
                    ? 'trending-down'
                    : 'minus'
                }
                size={16}
                style={styles.priceDiffIcon}
              />{' '}
              {addCurrencySymbol(diff, currentCurrency, true)} (
              {diff > 0 ? '+' : ''}
              {diff === 0 ? '0' : ((diff / comparePrice) * 100).toFixed(2)}
              %) <Text style={styles.timePeriod}>{date}</Text>
            </Text>
          )}
        </Text>
      </View>
      <PriceChart
        prices={distributedPriceData}
        priceDiff={priceDiff}
        isLoading={isLoading}
        onChartIndexChange={handleChartInteraction}
      />
    </>
  );
};

export default Price;

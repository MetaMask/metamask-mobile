import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Icon from 'react-native-vector-icons/Feather';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { toDateFormat } from '../../../../util/date';
import { addCurrencySymbol } from '../../../../util/number';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
import { Asset } from '../AssetOverview.types';
import PriceChart from '../PriceChart/PriceChart';
import { distributeDataPoints } from '../PriceChart/utils';
import styleSheet from './Price.styles';

interface PriceProps {
  asset: Asset;
  prices: TokenPrice[];
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: TimePeriod;
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

  const timePeriodTextDict: Record<TimePeriod, string> = {
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

  const { styles } = useStyles(styleSheet, { priceDiff: diff });

  return (
    <>
      <View style={styles.wrapper}>
        <Text style={styles.symbol}>{asset.symbol}</Text>
        {asset.name && <Text style={styles.name}>{asset.name}</Text>}
        {!isNaN(price) && (
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
        )}
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
          ) : distributedPriceData.length > 0 ? (
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
          ) : null}
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

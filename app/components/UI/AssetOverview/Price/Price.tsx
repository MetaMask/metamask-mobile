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
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import PriceChart from '../PriceChart/PriceChart';
import { distributeDataPoints } from '../PriceChart/utils';
import styleSheet from './Price.styles';
import { TokenOverviewSelectorsIDs } from '../../../../../e2e/selectors/wallet/TokenOverview.selectors';
import { TokenI } from '../../Tokens/types';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { CaipAssetType } from '@metamask/utils';
import { AssetConversion } from '@metamask/snaps-sdk';
///: END:ONLY_INCLUDE_IF

interface PriceProps {
  asset: TokenI;
  prices: TokenPrice[];
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: TimePeriod;
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  multichainAssetsRates: Record<CaipAssetType, AssetConversion>;
  ///: END:ONLY_INCLUDE_IF
  isEvmAssetSelected: boolean;
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
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  multichainAssetsRates,
  ///: END:ONLY_INCLUDE_IF
  isEvmAssetSelected,
}: PriceProps) => {
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const assetAddress = asset.address;
  const isCaipAssetType = assetAddress.startsWith(`${asset.chainId}`);
  const normalizedCaipAssetTypeAddress = isCaipAssetType
    ? assetAddress
    : `${asset.chainId}/token:${asset.address}`;
  const multichainAssetRates =
    multichainAssetsRates[normalizedCaipAssetTypeAddress as CaipAssetType];
  ///: END:ONLY_INCLUDE_IF

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
    all: strings('asset_overview.chart_time_period.all'),
  };

  const price: number = isEvmAssetSelected
    ? distributedPriceData[activeChartIndex]?.[1] || currentPrice
    : Number(multichainAssetRates?.rate);

  const date: string | undefined = distributedPriceData[activeChartIndex]?.[0]
    ? toDateFormat(Number(distributedPriceData[activeChartIndex]?.[0]))
    : timePeriodTextDict[timePeriod];

  const diff: number | undefined = distributedPriceData[activeChartIndex]?.[1]
    ? distributedPriceData[activeChartIndex]?.[1] - comparePrice
    : priceDiff;

  const { styles, theme } = useStyles(styleSheet, { priceDiff: diff });
  const ticker = asset.ticker || asset.symbol;
  return (
    <>
      <View style={styles.wrapper}>
        {asset.name ? (
          <Text
            variant={TextVariant.BodyMDMedium}
            color={TextColor.Alternative}
          >
            {asset.name} ({ticker})
          </Text>
        ) : (
          <Text variant={TextVariant.BodyMDMedium}>{ticker}</Text>
        )}
        {!isNaN(price) && (
          <Text
            testID={TokenOverviewSelectorsIDs.TOKEN_PRICE}
            variant={TextVariant.HeadingLG}
          >
            {isLoading ? (
              <View style={styles.loadingPrice}>
                <SkeletonPlaceholder
                  backgroundColor={theme.colors.background.section}
                  highlightColor={theme.colors.background.subsection}
                >
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
          </Text>
        )}
        <Text>
          {isLoading ? (
            <View testID="loading-price-diff" style={styles.loadingPriceDiff}>
              <SkeletonPlaceholder
                backgroundColor={theme.colors.background.section}
                highlightColor={theme.colors.background.subsection}
              >
                <SkeletonPlaceholder.Item
                  width={150}
                  height={18}
                  borderRadius={6}
                />
              </SkeletonPlaceholder>
            </View>
          ) : distributedPriceData.length > 0 ? (
            <Text style={styles.priceDiff} variant={TextVariant.BodyMDMedium}>
              {
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
                />
              }{' '}
              {addCurrencySymbol(diff, currentCurrency, true)} (
              {diff > 0 ? '+' : ''}
              {diff === 0 ? '0' : ((diff / comparePrice) * 100).toFixed(2)}
              %){' '}
              <Text
                testID="price-label"
                color={TextColor.Alternative}
                variant={TextVariant.BodyMDMedium}
              >
                {date}
              </Text>
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

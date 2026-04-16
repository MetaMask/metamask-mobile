import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { toDateFormat } from '../../../../util/date';
import { addCurrencySymbol } from '../../../../util/number';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import PriceChart from '../PriceChart/PriceChart';
import { distributeDataPoints } from '../PriceChart/utils';
import styleSheet from './Price.styles';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import ChartNavigationButton from '../ChartNavigationButton';

export interface PriceLegacyProps {
  prices: TokenPrice[];
  priceDiff: number;
  currentPrice: number;
  currentCurrency: string;
  comparePrice: number;
  isLoading: boolean;
  timePeriod: TimePeriod;
  chartNavigationButtons?: TimePeriod[];
  onTimePeriodChange?: (period: TimePeriod) => void;
}

const PriceLegacy = ({
  prices,
  priceDiff,
  currentPrice,
  currentCurrency,
  comparePrice,
  isLoading,
  timePeriod,
  chartNavigationButtons = [],
  onTimePeriodChange,
}: PriceLegacyProps) => {
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

  const price: number =
    activeChartIndex >= 0 &&
    distributedPriceData[activeChartIndex]?.[1] !== undefined
      ? distributedPriceData[activeChartIndex][1]
      : currentPrice;

  const date: string | undefined =
    activeChartIndex >= 0 &&
    distributedPriceData[activeChartIndex]?.[0] !== undefined
      ? toDateFormat(Number(distributedPriceData[activeChartIndex][0]))
      : timePeriodTextDict[timePeriod];

  const diff: number | undefined =
    activeChartIndex >= 0 &&
    distributedPriceData[activeChartIndex]?.[1] !== undefined
      ? distributedPriceData[activeChartIndex][1] - comparePrice
      : priceDiff;

  const displayDiff = diff ?? priceDiff;
  const diffSign = displayDiff > 0 ? '+' : displayDiff < 0 ? '-' : '';

  const { styles, theme } = useStyles(styleSheet);

  return (
    <>
      <View style={styles.wrapper}>
        {!isNaN(price) && (
          <Text
            testID={TokenOverviewSelectorsIDs.TOKEN_PRICE}
            variant={TextVariant.DisplayLg}
          >
            {isLoading ? (
              <View style={styles.loadingPrice}>
                <SkeletonPlaceholder
                  backgroundColor={theme.colors.background.section}
                  highlightColor={theme.colors.background.subsection}
                >
                  <SkeletonPlaceholder.Item
                    width={100}
                    height={40}
                    borderRadius={6}
                  />
                </SkeletonPlaceholder>
              </View>
            ) : (
              formatPriceWithSubscriptNotation(price, currentCurrency)
            )}
          </Text>
        )}
        <Text allowFontScaling={false}>
          {isLoading ? (
            <View testID="loading-price-diff" style={styles.loadingPriceDiff}>
              <SkeletonPlaceholder
                backgroundColor={theme.colors.background.section}
                highlightColor={theme.colors.background.subsection}
              >
                <SkeletonPlaceholder.Item
                  width={150}
                  height={24}
                  borderRadius={6}
                />
              </SkeletonPlaceholder>
            </View>
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                displayDiff > 0
                  ? TextColor.SuccessDefault
                  : displayDiff < 0
                    ? TextColor.ErrorDefault
                    : TextColor.TextAlternative
              }
              allowFontScaling={false}
            >
              {diffSign}
              {displayDiff !== 0
                ? formatPriceWithSubscriptNotation(
                    Math.abs(displayDiff),
                    currentCurrency,
                  )
                : addCurrencySymbol(0, currentCurrency, true)}{' '}
              {'('}
              {displayDiff > 0 ? '+' : ''}
              {displayDiff === 0 || comparePrice === 0
                ? '0'
                : ((displayDiff / comparePrice) * 100).toFixed(2)}
              %){' '}
              <Text
                testID="price-label"
                color={TextColor.TextAlternative}
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                allowFontScaling={false}
              >
                {date}
              </Text>
            </Text>
          )}
        </Text>
      </View>
      <Box twClassName={'mt-3'}>
        <PriceChart
          prices={distributedPriceData}
          priceDiff={priceDiff}
          isLoading={isLoading}
          onChartIndexChange={handleChartInteraction}
        />
      </Box>
      {chartNavigationButtons.length > 0 && onTimePeriodChange && (
        <View style={styles.chartNavigationWrapper}>
          {chartNavigationButtons.map((label) => (
            <ChartNavigationButton
              key={label}
              label={strings(
                `asset_overview.chart_time_period_navigation.${label}`,
              )}
              onPress={() => onTimePeriodChange(label)}
              selected={timePeriod === label}
            />
          ))}
        </View>
      )}
    </>
  );
};

export default PriceLegacy;

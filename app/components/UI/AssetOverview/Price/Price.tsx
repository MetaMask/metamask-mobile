import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { addCurrencySymbol } from '../../../../util/number';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

import styleSheet from './Price.styles';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import StockBadge from '../../shared/StockBadge/StockBadge';
import { BridgeToken } from '../../Bridge/types';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import AdvancedChart from '../../Charts/AdvancedChart/AdvancedChart';
import {
  ChartType,
  type IndicatorType,
} from '../../Charts/AdvancedChart/AdvancedChart.types';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '1H': 'asset_overview.chart_time_period.1h',
  '1D': 'asset_overview.chart_time_period.1d',
  '1W': 'asset_overview.chart_time_period.1w',
  '1M': 'asset_overview.chart_time_period.1m',
  '1Y': 'asset_overview.chart_time_period.1y',
};

interface PriceProps {
  asset: TokenI;
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
  priceDiff,
  currentPrice,
  currentCurrency,
  comparePrice,
  isLoading,
}: PriceProps) => {
  const { isStockToken } = useRWAToken();

  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [chartType, setChartType] = useState<ChartType>(ChartType.Line);
  const indicators: IndicatorType[] = [];

  const toggleChartType = useCallback(() => {
    setChartType((prev) =>
      prev === ChartType.Candles ? ChartType.Line : ChartType.Candles,
    );
  }, []);

  const assetId = useMemo(
    () => formatAddressToAssetId(asset.address, asset.chainId as Hex) ?? '',
    [asset.address, asset.chainId],
  );
  const config = TIME_RANGE_CONFIGS[timeRange];

  const {
    ohlcvData,
    isLoading: chartLoading,
    fetchMoreHistory,
  } = useOHLCVChart({
    assetId,
    timePeriod: config.timePeriod,
    interval: config.interval,
    vsCurrency: currentCurrency,
  });

  const dateLabel = strings(TIME_RANGE_LABELS[timeRange]);

  const { styles, theme } = useStyles(styleSheet, { priceDiff });
  const ticker = asset.ticker || asset.symbol;

  const stockTokenBadge = isStockToken(asset as BridgeToken) && (
    <StockBadge style={styles.stockBadge} token={asset as BridgeToken} />
  );
  return (
    <>
      <View style={styles.wrapper}>
        {asset.name ? (
          stockTokenBadge ? (
            <View>
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Alternative}
              >
                {asset.name}
              </Text>
              <View style={styles.assetWrapper}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Alternative}
                >
                  {ticker}
                </Text>
                {stockTokenBadge}
              </View>
            </View>
          ) : (
            <Text
              variant={TextVariant.BodyMDMedium}
              color={TextColor.Alternative}
            >
              {asset.name} ({ticker})
            </Text>
          )
        ) : (
          <View style={styles.assetWrapper}>
            <Text variant={TextVariant.BodyMDMedium}>{ticker}</Text>
            {stockTokenBadge}
          </View>
        )}
        {!isNaN(currentPrice) && (
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
              formatPriceWithSubscriptNotation(currentPrice, currentCurrency)
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
                  height={18}
                  borderRadius={6}
                />
              </SkeletonPlaceholder>
            </View>
          ) : priceDiff !== undefined ? (
            <Text
              style={styles.priceDiff}
              variant={TextVariant.BodyMDMedium}
              allowFontScaling={false}
            >
              {priceDiff > 0 ? '+' : ''}
              {addCurrencySymbol(priceDiff, currentCurrency, true)} (
              {priceDiff > 0 ? '+' : ''}
              {priceDiff === 0
                ? '0'
                : ((priceDiff / comparePrice) * 100).toFixed(2)}
              %){' '}
              <Text
                testID="price-label"
                color={TextColor.Alternative}
                variant={TextVariant.BodyMDMedium}
                allowFontScaling={false}
              >
                {dateLabel}
              </Text>
            </Text>
          ) : null}
        </Text>
      </View>
      {/* TODO: Line chart color should match percentage color (green when positive, red when negative) */}
      <View style={styles.chartContainer}>
        <AdvancedChart
          ohlcvData={ohlcvData}
          height={322}
          showVolume={chartType === ChartType.Candles}
          chartType={chartType}
          indicators={indicators}
          isLoading={chartLoading}
          onRequestMoreHistory={fetchMoreHistory}
        />
      </View>
      <View style={styles.timeRangeContainer}>
        <TimeRangeSelector
          selected={timeRange}
          onSelect={setTimeRange}
          chartType={chartType}
          onChartTypeToggle={toggleChartType}
        />
        {/* TODO: Re-enable indicators when ready for production */}
        {/* <IndicatorToggle
          activeIndicators={indicators}
          onToggle={handleToggleIndicator}
        /> */}
      </View>
    </>
  );
};

export default Price;

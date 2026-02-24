import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { toDateFormat } from '../../../../util/date';
import { addCurrencySymbol } from '../../../../util/number';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

import PriceChart from '../PriceChart/PriceChart';
import { distributeDataPoints } from '../PriceChart/utils';
import styleSheet from './Price.styles';
import { TokenOverviewSelectorsIDs } from '../TokenOverview.testIds';
import { TokenI } from '../../Tokens/types';
import StockBadge from '../../shared/StockBadge/StockBadge';
import { BridgeToken } from '../../Bridge/types';
import { useRWAToken } from '../../Bridge/hooks/useRWAToken';
// --- LOCAL TESTING ONLY: remove before pushing ---
import AdvancedChart from '../../Charts/AdvancedChart/AdvancedChart';
import {
  ChartType,
  type IndicatorType,
} from '../../Charts/AdvancedChart/AdvancedChart.types';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import IndicatorToggle from '../../Charts/AdvancedChart/IndicatorToggle';
import { generateMockOHLCVData } from '../../Charts/AdvancedChart/mockOHLCVData';
import { useHyperliquidCandles } from '../../Charts/AdvancedChart/useHyperliquidCandles';
// --- END LOCAL TESTING ---

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

// --- LOCAL TESTING ONLY ---
const USE_LIVE_HL_DATA = true; // toggle: true = Hyperliquid REST, false = mock
const HL_COIN = 'ETH';
// --- END LOCAL TESTING ---

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
  const { isStockToken } = useRWAToken();

  // --- LOCAL TESTING ONLY ---
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [indicators, setIndicators] = useState<IndicatorType[]>([]);
  const handleToggleIndicator = useCallback((ind: IndicatorType) => {
    setIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind],
    );
  }, []);
  const hlConfig = TIME_RANGE_CONFIGS[timeRange];

  const {
    ohlcvData: hlData,
    isLoading: hlLoading,
    fetchMoreHistory,
  } = useHyperliquidCandles({
    coin: HL_COIN,
    interval: hlConfig.hlInterval,
    count: hlConfig.count,
    enabled: USE_LIVE_HL_DATA,
  });
  const mockData = useMemo(
    () =>
      USE_LIVE_HL_DATA ? [] : generateMockOHLCVData(200, 2500, '5', 0.015),
    [],
  );
  const chartData = USE_LIVE_HL_DATA ? hlData : mockData;
  // --- END LOCAL TESTING ---

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

  const { styles, theme } = useStyles(styleSheet, { priceDiff: diff });
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
                  height={18}
                  borderRadius={6}
                />
              </SkeletonPlaceholder>
            </View>
          ) : distributedPriceData.length > 0 ? (
            <Text
              style={styles.priceDiff}
              variant={TextVariant.BodyMDMedium}
              allowFontScaling={false}
            >
              {diff > 0 ? '+' : ''}
              {addCurrencySymbol(diff, currentCurrency, true)} (
              {diff > 0 ? '+' : ''}
              {diff === 0 ? '0' : ((diff / comparePrice) * 100).toFixed(2)}
              %){' '}
              <Text
                testID="price-label"
                color={TextColor.Alternative}
                variant={TextVariant.BodyMDMedium}
                allowFontScaling={false}
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
      {/* --- LOCAL TESTING ONLY: remove before pushing --- */}
      <AdvancedChart
        ohlcvData={chartData}
        height={450}
        showVolume
        chartType={ChartType.Candles}
        indicators={indicators}
        isLoading={USE_LIVE_HL_DATA && hlLoading}
        onRequestMoreHistory={USE_LIVE_HL_DATA ? fetchMoreHistory : undefined}
      />
      <IndicatorToggle
        activeIndicators={indicators}
        onToggle={handleToggleIndicator}
      />
      {USE_LIVE_HL_DATA && (
        <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
      )}
      {/* --- END LOCAL TESTING --- */}
    </>
  );
};

export default Price;

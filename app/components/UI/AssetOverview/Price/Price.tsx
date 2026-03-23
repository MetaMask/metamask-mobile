import {
  TimePeriod,
  TokenPrice,
} from '../../../../components/hooks/useTokenHistoricalPrices';
import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Svg, { Path } from 'react-native-svg';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import { addCurrencySymbol } from '../../../../util/number';
import { formatPriceWithSubscriptNotation } from '../../Predict/utils/format';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Title from '../../../Base/Title';

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
  type CrosshairData,
  type IndicatorType,
} from '../../Charts/AdvancedChart/AdvancedChart.types';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../../Charts/AdvancedChart/TimeRangeSelector';
import { useOHLCVChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import { OHLCVBar } from '../../Charts/AdvancedChart/OHLCVBar';

/**
 * Fixed chart block height for line and candle (design: same height when toggling; only axis
 * show/hide changes). Horizontal: line bleeds to screen edges via `chartContainerLineBleed`;
 * candle keeps inset — Y-axis uses the right gutter.
 */
//const CHART_HEIGHT = 322;
const CHART_HEIGHT = Dimensions.get('screen').height * 0.44;

const PLACEHOLDER_DATA = [
  3, 5, 6, 8, 7, 5, 7, 9, 10, 12, 14, 15, 14, 12, 11, 10, 9, 10, 8, 7, 5, 6, 5,
  4, 5, 4, 3, 4, 5, 6, 7, 8, 10, 12, 13, 12, 10, 9, 8, 10, 11, 10, 8, 7, 8, 10,
  12, 13, 14, 16, 15, 13, 12, 11, 12, 14, 15, 13, 11, 10, 9, 7, 6, 5, 4, 3, 2,
  3, 4, 5, 6, 5, 7, 8, 10, 11, 13, 14, 16, 15, 14, 12, 10, 9, 11, 12, 10, 8, 7,
  8, 9, 11, 13, 14, 16, 15, 13, 11, 9, 7, 6, 5, 4, 5, 7, 8, 28, 26, 24, 22, 20,
  18, 20, 22, 19, 18, 20, 22, 24, 26, 23, 21, 20, 19, 22, 21, 20, 22, 23, 21,
  19, 18, 16, 14, 12, 14, 13, 15, 16, 18, 20, 22, 24, 22, 21, 20, 18, 16, 15,
  14, 12, 14, 13, 11, 10, 11, 13, 12, 10, 12, 14, 16, 18, 17, 16, 14, 12, 10, 9,
  8, 10, 11, 13, 14, 12, 11, 9, 8, 7, 6, 7, 8, 10, 11, 12, 10, 9, 8, 7, 5, 10,
  11, 12, 10, 12, 13, 14, 15, 17, 19, 21, 22, 24, 23, 26, 27, 29, 27, 32, 28,
  35, 30, 39, 40, 38, 41, 36, 39, 42, 40, 37, 35, 38, 39, 40, 41, 43, 45, 47,
  43, 41, 38, 36, 35, 33, 31, 30, 28, 27, 29, 30,
];

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

interface NoDataOverlayProps {
  hasInsufficientData: boolean;
  styles: ReturnType<typeof styleSheet>;
  backgroundColor: string;
  lineColor: string;
}

const createPlaceholderPath = (
  data: number[],
  width: number,
  height: number,
): string => {
  const padding = 40;
  const chartHeight = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const stepX = width / (data.length - 1);

  let path = '';
  data.forEach((value, index) => {
    const x = index * stepX;
    const y = padding + chartHeight * (1 - (value - min) / range);
    path += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  return path;
};

const NoDataOverlay: React.FC<NoDataOverlayProps> = ({
  hasInsufficientData,
  styles,
  backgroundColor,
  lineColor,
}) => {
  const gradientColors = useMemo(() => {
    const hexToRgba = (hex: string, opacity: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    };

    return [
      hexToRgba(backgroundColor, 1),
      hexToRgba(backgroundColor, 0.5),
      hexToRgba(backgroundColor, 1),
    ];
  }, [backgroundColor]);

  const placeholderPath = useMemo(() => {
    const width = Dimensions.get('screen').width;
    return createPlaceholderPath(PLACEHOLDER_DATA, width, CHART_HEIGHT);
  }, []);

  const overlayContent = hasInsufficientData ? (
    <View style={styles.noDataOverlay} testID="price-chart-insufficient-data">
      <Text variant={TextVariant.BodyLGMedium} style={styles.noDataOverlayText}>
        {strings('asset_overview.no_chart_data.insufficient_data')}
      </Text>
    </View>
  ) : (
    <View style={styles.noDataOverlay} testID="price-chart-no-data">
      <Text>
        <Icon
          name={IconName.Warning}
          color={IconColor.Muted}
          size={IconSize.Xl}
          testID="price-chart-no-data-icon"
        />
      </Text>
      <Title style={styles.noDataOverlayTitle}>
        {strings('asset_overview.no_chart_data.title')}
      </Title>
      <Text variant={TextVariant.BodyLGMedium} style={styles.noDataOverlayText}>
        {strings('asset_overview.no_chart_data.description')}
      </Text>
    </View>
  );

  return (
    <>
      <Svg
        width={Dimensions.get('screen').width}
        height={CHART_HEIGHT}
        style={styles.placeholderChart}
      >
        <Path
          d={placeholderPath}
          stroke={lineColor}
          strokeWidth={2}
          fill="none"
          opacity={0.85}
        />
      </Svg>
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.noDataGradientBackground}
      />
      {overlayContent}
    </>
  );
};

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
  const [crosshairData, setCrosshairData] = useState<CrosshairData | null>(
    null,
  );
  const indicators: IndicatorType[] = [];

  const handleCrosshairMove = useCallback(
    (data: CrosshairData | null) => setCrosshairData(data),
    [],
  );

  const toggleChartType = useCallback(() => {
    setChartType((prev) => {
      const next =
        prev === ChartType.Candles ? ChartType.Line : ChartType.Candles;
      if (next !== ChartType.Candles) setCrosshairData(null);
      return next;
    });
  }, []);

  const assetId = useMemo(
    () => formatAddressToAssetId(asset.address, asset.chainId as Hex) ?? '',
    [asset.address, asset.chainId],
  );
  const config = TIME_RANGE_CONFIGS[timeRange];

  const {
    ohlcvData,
    isLoading: chartLoading,
    error: chartError,
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

  const hasChartData = ohlcvData.length > 1;
  const hasInsufficientData = ohlcvData.length === 1;
  const showEmptyState = !chartLoading && (!hasChartData || !!chartError);

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
      {crosshairData && chartType === ChartType.Candles && (
        <OHLCVBar data={crosshairData} currency={currentCurrency} />
      )}
      {/* TODO: Line chart color should match percentage color (green when positive, red when negative) */}
      <View style={[styles.chartContainer, { height: CHART_HEIGHT }]}>
        {showEmptyState ? (
          <NoDataOverlay
            hasInsufficientData={hasInsufficientData}
            styles={styles}
            backgroundColor={theme.colors.background.default}
            lineColor={theme.colors.text.alternative}
          />
        ) : (
          <AdvancedChart
            ohlcvData={ohlcvData}
            height={CHART_HEIGHT}
            showVolume={chartType === ChartType.Candles}
            chartType={chartType}
            indicators={indicators}
            isLoading={chartLoading}
            onRequestMoreHistory={fetchMoreHistory}
            onCrosshairMove={handleCrosshairMove}
          />
        )}
      </View>
      {!showEmptyState && (
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
      )}
    </>
  );
};

export default Price;

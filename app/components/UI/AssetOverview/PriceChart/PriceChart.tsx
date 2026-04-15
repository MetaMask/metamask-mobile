import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import React, { useCallback, useContext, useMemo } from 'react';
import { Dimensions, View } from 'react-native';
import { LineGraph, GraphPoint } from 'react-native-graph';

import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Title from '../../../Base/Title';
import { TOKEN_OVERVIEW_CHART_HEIGHT } from '../Price/tokenOverviewChart.constants';
import styleSheet from './PriceChart.styles';
import PriceChartContext from './PriceChart.context';

interface PriceChartProps {
  prices: TokenPrice[];
  priceDiff: number;
  isLoading: boolean;
  onChartIndexChange: (index: number) => void;
  /** Match token overview AdvancedChart height. */
  chartHeight?: number;
}

const PriceChart = ({
  prices,
  priceDiff,
  isLoading,
  onChartIndexChange,
  chartHeight = TOKEN_OVERVIEW_CHART_HEIGHT,
}: PriceChartProps) => {
  const { setIsChartBeingTouched } = useContext(PriceChartContext);
  const { styles, theme } = useStyles(styleSheet, { chartHeight });

  const chartColor =
    priceDiff > 0
      ? theme.colors.success.default
      : priceDiff < 0
        ? theme.colors.error.default
        : theme.colors.text.alternative;

  // Convert TokenPrice[] to GraphPoint[] for react-native-graph
  const graphPoints: GraphPoint[] = useMemo(
    () =>
      prices.map(([timestamp, value]) => ({
        value,
        date: new Date(timestamp),
      })),
    [prices],
  );

  const chartHasData = graphPoints.length > 1;

  const onPointSelected = useCallback(
    (point: GraphPoint) => {
      const index = graphPoints.findIndex(
        (p) => p.date.getTime() === point.date.getTime(),
      );
      onChartIndexChange(index >= 0 ? index : -1);
    },
    [graphPoints, onChartIndexChange],
  );

  const onGestureStart = useCallback(() => {
    setIsChartBeingTouched(true);
  }, [setIsChartBeingTouched]);

  const onGestureEnd = useCallback(() => {
    setIsChartBeingTouched(false);
    onChartIndexChange(-1);
  }, [setIsChartBeingTouched, onChartIndexChange]);

  const NoDataOverlay = () => {
    const hasInsufficientData =
      prices.length > 0 && prices.length <= 1;

    if (hasInsufficientData) {
      return (
        <View
          style={styles.noDataOverlay}
          testID="price-chart-insufficient-data"
        >
          <Text
            variant={TextVariant.BodyLGMedium}
            style={styles.noDataOverlayText}
          >
            {strings('asset_overview.no_chart_data.insufficient_data')}
          </Text>
        </View>
      );
    }

    return (
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
        <Text
          variant={TextVariant.BodyLGMedium}
          style={styles.noDataOverlayText}
        >
          {strings('asset_overview.no_chart_data.description')}
        </Text>
      </View>
    );
  };

  const LoadingOverlay = () => (
    <View style={styles.noDataOverlay} testID="price-chart-loading">
      <SkeletonPlaceholder
        backgroundColor={theme.colors.background.section}
        highlightColor={theme.colors.background.subsection}
      >
        <SkeletonPlaceholder.Item
          width={Dimensions.get('window').width - 32}
          height={chartHeight}
          borderRadius={6}
        />
      </SkeletonPlaceholder>
    </View>
  );

  return (
    <View style={styles.chart}>
      <View
        style={styles.chartArea}
        testID={chartHasData ? 'price-chart-area' : undefined}
      >
        {isLoading ? (
          <LoadingOverlay />
        ) : !chartHasData ? (
          <NoDataOverlay />
        ) : (
          <LineGraph
            animated
            points={graphPoints}
            color={chartColor}
            gradientFillColors={[
              chartColor + '40',
              chartColor + '20',
              chartColor + '00',
            ]}
            style={{ width: '100%', height: chartHeight }}
            enablePanGesture
            enableIndicator
            indicatorPulsating
            enableFadeInMask
            onPointSelected={onPointSelected}
            onGestureStart={onGestureStart}
            onGestureEnd={onGestureEnd}
          />
        )}
      </View>
    </View>
  );
};

export default PriceChart;

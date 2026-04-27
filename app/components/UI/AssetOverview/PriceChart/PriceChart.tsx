import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Dimensions, View } from 'react-native';
import { LineGraph, GraphPoint } from 'react-native-graph';

import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  CHART_DATA_THRESHOLD,
  TOKEN_OVERVIEW_CHART_HEIGHT,
} from '../Price/tokenOverviewChart.constants';
import styleSheet from './PriceChart.styles';
import PriceChartContext from './PriceChart.context';
import NoDataOverlay from '../NoDataOverlay/NoDataOverlay';
import { Box } from '@metamask/design-system-react-native';

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
  const { trackEvent, createEventBuilder } = useAnalytics();
  const emptyDisplayTrackedRef = useRef(false);
  const { setIsChartBeingTouched } = useContext(PriceChartContext);
  const { styles, theme } = useStyles(styleSheet, { chartHeight });
  useTheme();

  const chartColor =
    priceDiff > 0
      ? theme.colors.success.default
      : priceDiff < 0
        ? theme.colors.error.default
        : theme.colors.text.alternative;

  const graphPoints: GraphPoint[] = useMemo(
    () =>
      prices.map(([timestamp, value]) => ({
        value,
        date: new Date(timestamp),
      })),
    [prices],
  );

  const chartHasData = graphPoints.length >= CHART_DATA_THRESHOLD;
  const hasInsufficientData =
    graphPoints.length > 0 && graphPoints.length < CHART_DATA_THRESHOLD;

  useEffect(() => {
    if (chartHasData || isLoading) {
      emptyDisplayTrackedRef.current = false;
      return;
    }
    if (emptyDisplayTrackedRef.current) {
      return;
    }
    emptyDisplayTrackedRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CHART_EMPTY_DISPLAYED).build(),
    );
  }, [chartHasData, isLoading, trackEvent, createEventBuilder]);

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

  /**
   * Loading overlay component.
   * Note: We render this conditionally in the return statement rather than early-returning
   * to work around an Android bug where charts wouldn't render until screen interaction.
   * @see https://github.com/MetaMask/metamask-mobile/issues/20854
   */
  const LoadingOverlay = () => (
    <Box twClassName="justify-center items-center" testID="price-chart-loading">
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
    </Box>
  );

  return (
    <View style={styles.chart}>
      <View
        style={styles.chartAreaWrapper}
        testID={chartHasData ? 'price-chart-area' : undefined}
      >
        {chartHasData && !isLoading ? (
          <LineGraph
            animated
            points={graphPoints}
            color={chartColor}
            gradientFillColors={[
              chartColor + '40',
              chartColor + '20',
              chartColor + '00',
            ]}
            style={styles.chartArea}
            enablePanGesture
            enableIndicator
            indicatorPulsating
            enableFadeInMask
            onPointSelected={onPointSelected}
            onGestureStart={onGestureStart}
            onGestureEnd={onGestureEnd}
          />
        ) : null}
        {isLoading && (
          <View style={styles.loadingOverlayContainer}>
            <LoadingOverlay />
          </View>
        )}
        {!isLoading && !chartHasData && (
          <View style={styles.noDataOverlayContainer} pointerEvents="box-none">
            <NoDataOverlay
              chartHeight={chartHeight}
              chartPlaceholderFill={theme.colors.border.muted}
              hasInsufficientData={hasInsufficientData}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export default PriceChart;

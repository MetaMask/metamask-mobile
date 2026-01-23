/* eslint-disable react/no-unstable-nested-components */
import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  View,
} from 'react-native';
import {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Line as SvgLine,
} from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';

import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { strings } from '../../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Title from '../../../../../Base/Title';
import styleSheet, { CHART_HEIGHT } from './PriceChart.styles';
import { placeholderData } from './utils';
import PriceChartContext from './PriceChart.context';

interface LineProps {
  line: string;
  chartHasData: boolean;
}

interface TooltipProps {
  x: (index: number) => number;
  y: (value: number) => number;
  ticks: number[];
}

interface PriceChartProps {
  prices: TokenPrice[];
  priceDiff: number;
  isLoading: boolean;
  onChartIndexChange: (index: number) => void;
}

const PriceChart = ({
  prices,
  priceDiff,
  isLoading,
  onChartIndexChange,
}: PriceChartProps) => {
  const { setIsChartBeingTouched } = useContext(PriceChartContext);

  const [positionX, setPositionX] = useState(-1); // The currently selected X coordinate position
  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    setPositionX(-1);
  }, [prices]);

  const chartColor =
    priceDiff > 0
      ? theme.colors.primary.default
      : priceDiff < 0
        ? theme.colors.primary.default
        : theme.colors.text.alternative;

  const apx = (size = 0) => {
    const width = Dimensions.get('window').width;
    return (width / 750) * size;
  };

  const priceList = prices.map((_: TokenPrice) => _[1]);

  // Detect if this is a stablecoin and calculate appropriate Y-axis range
  const { isStablecoin, yMin, yMax } = useMemo(() => {
    if (priceList.length === 0) {
      return { isStablecoin: false, yMin: undefined, yMax: undefined };
    }

    // Use median for better outlier resistance
    const sortedPrices = [...priceList].sort((a, b) => a - b);
    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const minPrice = sortedPrices[0];
    const maxPrice = sortedPrices[sortedPrices.length - 1];

    // Detect stablecoin: median price between $0.90 and $1.10
    const isStablecoinPrice = medianPrice >= 0.9 && medianPrice <= 1.1;

    if (!isStablecoinPrice) {
      return { isStablecoin: false, yMin: undefined, yMax: undefined };
    }

    // For stablecoins, create an intelligently zoomed view
    const priceRange = maxPrice - minPrice;

    // Ensure minimum range of 2% of median price for meaningful visualization
    // This prevents over-zooming on very stable prices (e.g., all $1.000)
    const minRange = medianPrice * 0.02; // 2% range minimum

    // Use larger of actual range or minimum range
    const effectiveRange = Math.max(priceRange, minRange);

    // Add 20% padding to the effective range for visual breathing room
    const padding = effectiveRange * 0.2;

    // Center the range around the median for balanced visualization
    const halfRange = effectiveRange / 2;

    return {
      isStablecoin: true,
      yMin: Math.max(0, medianPrice - halfRange - padding),
      yMax: medianPrice + halfRange + padding,
    };
  }, [priceList]);

  const onActiveIndexChange = (index: number) => {
    setPositionX(index);
    onChartIndexChange(index);
  };

  const updatePosition = (x: number) => {
    if (x === -1) {
      onActiveIndexChange(-1);
      return;
    }
    const chartWidth = Dimensions.get('window').width;
    const xDistance = chartWidth / priceList.length;
    if (x <= 0) {
      x = 0;
    }
    if (x >= chartWidth) {
      x = chartWidth;
    }
    let value = Number((x / xDistance).toFixed(0));
    if (value >= priceList.length - 1) {
      value = priceList.length - 1;
    }
    onActiveIndexChange(value);
  };

  const prevTouch = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        // save current touch for the next move
        prevTouch.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
        updatePosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        const deltaX = evt.nativeEvent.locationX - prevTouch.current.x;
        const deltaY = evt.nativeEvent.locationY - prevTouch.current.y;
        const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

        setIsChartBeingTouched(isHorizontalSwipe);
        updatePosition(isHorizontalSwipe ? evt.nativeEvent.locationX : -1);

        // save current touch for the next move
        prevTouch.current = {
          x: evt.nativeEvent.locationX,
          y: evt.nativeEvent.locationY,
        };
      },

      onPanResponderRelease: () => {
        setIsChartBeingTouched(false);
        updatePosition(-1);
      },
    }),
  );

  const Line = (props: Partial<LineProps>) => {
    const { line, chartHasData } = props as LineProps;
    return (
      <Path
        key="line"
        d={line}
        stroke={chartHasData ? chartColor : theme.colors.text.alternative}
        strokeWidth={apx(4)}
        fill="none"
        opacity={chartHasData ? 1 : 0.85}
      />
    );
  };

  const DataGradient = () => (
    <Defs key="dataGradient">
      <LinearGradient
        id="dataGradient"
        x1="0"
        y1="0%"
        x2="0%"
        y2={`${CHART_HEIGHT}px`}
      >
        <Stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
        <Stop offset="90%" stopColor={chartColor} stopOpacity={0} />
      </LinearGradient>
    </Defs>
  );

  const NoDataGradient = () => {
    // gradient with transparent center and grey edges
    const gradient = (
      <Defs key="gradient">
        <LinearGradient id="gradient" x1="0" y1="1" x2="0" y2="0">
          <Stop
            offset="0"
            stopColor={theme.colors.background.default}
            stopOpacity="1"
          />
          <Stop
            offset="0.5"
            stopColor={theme.colors.background.default}
            stopOpacity="0.5"
          />
          <Stop
            offset="1"
            stopColor={theme.colors.background.default}
            stopOpacity="1"
          />
        </LinearGradient>
      </Defs>
    );

    return (
      <G key="no-data-gradient">
        {gradient}
        <Rect
          x="0"
          y="0"
          width={Dimensions.get('screen').width}
          height={CHART_HEIGHT}
          fill="url(#gradient)"
        />
      </G>
    );
  };

  const NoDataOverlay = () => {
    const hasInsufficientData = priceList.length > 0 && priceList.length <= 1;

    if (hasInsufficientData) {
      // Show simplified message for 1 data point
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

    // Show full overlay for no data
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

  const Tooltip = ({ x, y }: Partial<TooltipProps>) => {
    if (positionX < 0) {
      return null;
    }
    return (
      <G x={x?.(positionX)} key="tooltip">
        <G>
          <SvgLine
            y1={1}
            y2={CHART_HEIGHT}
            stroke={styles.tooltipLine.color}
            strokeWidth={1}
          />
          <Circle
            cy={y?.(priceList[positionX])}
            r={apx(20 / 2)}
            stroke={styles.tooltipLine.color}
            strokeWidth={apx(1)}
            fill={chartColor}
          />
        </G>
      </G>
    );
  };

  /**
   * Loading overlay component.
   * Note: We render this conditionally in the return statement rather than early-returning
   * to work around an Android bug where charts wouldn't render until screen interaction.
   * @see https://github.com/MetaMask/metamask-mobile/issues/20854
   */
  const LoadingOverlay = () => (
    <View style={styles.noDataOverlay} testID="price-chart-loading">
      <SkeletonPlaceholder
        backgroundColor={theme.colors.background.section}
        highlightColor={theme.colors.background.subsection}
      >
        <SkeletonPlaceholder.Item
          width={Dimensions.get('screen').width - 32}
          height={CHART_HEIGHT}
          borderRadius={6}
        ></SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
  );

  const chartHasData = priceList.length > 1;

  return (
    <View style={styles.chart}>
      <View
        style={styles.chartArea}
        testID={chartHasData ? 'price-chart-area' : undefined}
        {...panResponder.current.panHandlers}
      >
        {isLoading ? <LoadingOverlay /> : !chartHasData && <NoDataOverlay />}
        {/* Chart is always rendered to avoid Android rendering bug; visible elements are conditionally hidden during loading. See: https://github.com/MetaMask/metamask-mobile/issues/20854 */}
        <AreaChart
          style={styles.chartArea}
          data={chartHasData ? priceList : placeholderData}
          contentInset={{ top: apx(40), bottom: apx(40) }}
          svg={
            chartHasData && !isLoading
              ? { fill: `url(#dataGradient)` }
              : undefined
          }
          yMin={isStablecoin && chartHasData ? yMin : undefined}
          yMax={isStablecoin && chartHasData ? yMax : undefined}
        >
          {!isLoading && <Line chartHasData={chartHasData} />}
          {chartHasData ? <Tooltip /> : <NoDataGradient />}
          {chartHasData && <DataGradient />}
        </AreaChart>
      </View>
    </View>
  );
};

export default PriceChart;

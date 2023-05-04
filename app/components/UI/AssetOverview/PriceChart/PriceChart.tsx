import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import React, { useContext, useEffect, useRef, useState } from 'react';
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
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../component-library/hooks';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';
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
      ? theme.colors.success.default
      : priceDiff < 0
      ? theme.colors.error.default
      : theme.colors.text.alternative;

  const apx = (size = 0) => {
    const width = Dimensions.get('window').width;
    return (width / 750) * size;
  };

  const priceList = prices.map((_: TokenPrice) => _[1]);

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsChartBeingTouched(true);
        updatePosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        setIsChartBeingTouched(true);
        updatePosition(evt.nativeEvent.locationX);
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

  const NoDataOverlay = () => (
    <View style={styles.noDataOverlay}>
      <Text>
        <Icon
          name={IconName.Warning}
          color={IconColor.Muted}
          size={IconSize.Xl}
        />
      </Text>
      <Title style={styles.noDataOverlayTitle}>
        {strings('asset_overview.no_chart_data.title')}
      </Title>
      <Text style={styles.noDataOverlayText}>
        {strings('asset_overview.no_chart_data.description')}
      </Text>
    </View>
  );

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
            stroke={'#848C96'}
            strokeWidth={1}
          />
          <Circle
            cy={y?.(priceList[positionX])}
            r={apx(20 / 2)}
            stroke="#fff"
            strokeWidth={apx(1)}
            fill={chartColor}
          />
        </G>
      </G>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.chartLoading}>
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item
            width={Dimensions.get('screen').width - 32}
            height={CHART_HEIGHT}
            borderRadius={6}
          ></SkeletonPlaceholder.Item>
        </SkeletonPlaceholder>
      </View>
    );
  }

  const chartHasData = priceList.length > 0;

  return (
    <View style={styles.chart}>
      <View style={styles.chartArea} {...panResponder.current.panHandlers}>
        {!chartHasData && <NoDataOverlay />}
        <AreaChart
          style={styles.chartArea}
          data={chartHasData ? priceList : placeholderData}
          contentInset={{ top: apx(40), bottom: apx(40) }}
        >
          <Line chartHasData={chartHasData} />
          {chartHasData ? <Tooltip /> : <NoDataGradient />}
        </AreaChart>
      </View>
    </View>
  );
};

export default PriceChart;

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
// import * as React from 'react'
import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';
import { curveMonotoneX } from 'd3-shape';
import {
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native';
import {
  Circle,
  Defs,
  G,
  Line as SvgLine,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';

import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { addCurrencySymbol } from '../../../../util/number';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import Text from '../../../Base/Text';
import Title from '../../../Base/Title';

const placeholderData = [
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

const createStyles = () =>
  StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: 305, // hack to remove internal padding that is not configurable
      paddingTop: 0,
      marginVertical: 10,
      width: Dimensions.get('screen').width,
    },
    chartArea: {
      flex: 1,
    },
    chartLoading: {
      width: Dimensions.get('screen').width,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    priceChannel: {
      height: 14,
      marginBottom: 10,
    },
    priceChannelText: {
      textAlign: 'center',
      fontSize: 12,
    },
    noDataOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 96,
      zIndex: 1,
    },
    noDataOverlayTitle: {
      textAlign: 'center',
      fontSize: 18,
      lineHeight: 24,
    },
    noDataOverlayText: {
      textAlign: 'center',
      fontSize: 16,
      lineHeight: 24,
    },
  });
const styles = createStyles();

// this function is used to sample the data points to be displayed on the chart
// it will return a maximum of 100 data points
// if there are less than 100 data points, it will return all of them
// if there are more than 100 data points, it will return 100 data points
// the first and last data points will always be included
// the data points in between will be sampled at an interval of (numDataPoints / 98)
// this is to ensure that the chart does not become unresponsive when there are too many data points
function distributeDataPoints(dataPoints: TokenPrice[]): TokenPrice[] {
  const numDataPoints = dataPoints.length;
  const interval = Math.max(1, Math.floor(numDataPoints / 98));
  const sampledDataPoints: [string, number][] = [];
  sampledDataPoints.push(dataPoints[0]);
  for (let i = interval; i < numDataPoints - 1; i += interval) {
    if (sampledDataPoints.length === 98) break;
    sampledDataPoints.push(dataPoints[i]);
  }
  sampledDataPoints.push(dataPoints[numDataPoints - 1]);
  if (sampledDataPoints.length === 99) {
    sampledDataPoints.push(dataPoints[numDataPoints - 2]);
  }
  return sampledDataPoints;
}

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
  currentCurrency: string;
}

const PriceChart = ({
  prices,
  priceDiff,
  isLoading,
  currentCurrency,
}: PriceChartProps) => {
  const [positionX, setPositionX] = useState(-1); // The currently selected X coordinate position
  const { colors = mockTheme.colors as ThemeColors } = useContext(ThemeContext);

  useEffect(() => {
    setPositionX(-1);
  }, [prices]);

  const chartColor =
    priceDiff > 0
      ? '#28A745'
      : priceDiff < 0
      ? '#FF3B30'
      : colors.text.alternative;

  const apx = (size = 0) => {
    const width = Dimensions.get('window').width;
    return (width / 750) * size;
  };

  const sampled = useMemo(() => {
    if (prices.length > 0) {
      return distributeDataPoints(prices);
    }
    return [];
  }, [prices]);

  const dateList = sampled.map((_: TokenPrice) => _[0]);
  const priceList = sampled.map((_: TokenPrice) => _[1]);

  const updatePosition = (x: number) => {
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
    setPositionX(value);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        updatePosition(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        updatePosition(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        setPositionX(-1);
      },
    }),
  );

  const Line = (props: Partial<LineProps>) => {
    const { line, chartHasData } = props as LineProps;
    return (
      <Path
        key="line"
        d={line}
        stroke={chartHasData ? chartColor : colors.text.alternative}
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
            stopColor={colors.background.default}
            stopOpacity="1"
          />
          <Stop
            offset="0.5"
            stopColor={colors.background.default}
            stopOpacity="0.5"
          />
          <Stop
            offset="1"
            stopColor={colors.background.default}
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
          height={315}
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
      <Title style={styles.noDataOverlayTitle}>No chart data</Title>
      <Text style={styles.noDataOverlayText}>
        We could not fetch any data for this token
      </Text>
    </View>
  );

  const Tooltip = ({ x, y, ticks }: Partial<TooltipProps>) => {
    const tooltipWidth = apx(300);
    if (positionX < 0) {
      return null;
    }

    const date = dateList[positionX];

    return (
      <G x={x?.(positionX)} key="tooltip">
        <G
          x={
            positionX > dateList.length / 2
              ? -tooltipWidth + apx(30)
              : tooltipWidth / 2 - apx(30)
          }
          y={10}
        >
          <SvgText
            x={apx(20)}
            fill={colors.text.alternative}
            opacity={0.65}
            fontSize={apx(24)}
            textAnchor={positionX > dateList.length / 2 ? 'start' : 'end'}
          >
            {new Date(date).toLocaleDateString()}{' '}
            {addCurrencySymbol(priceList[positionX], currentCurrency)}
          </SvgText>
        </G>
        <G>
          <SvgLine
            y1={ticks?.[0]}
            y2={ticks?.[Number(ticks.length)]}
            stroke={'#848C96'}
            strokeWidth={apx(1)}
          />

          <Circle
            cy={y?.(priceList[positionX])}
            r={apx(20 / 2)}
            stroke="#fff"
            strokeWidth={apx(2)}
            fill={chartColor}
          />
        </G>
      </G>
    );
  };

  // const Tooltip = ({ x, y, ticks }: Partial<TooltipProps>) => {
  //   if (positionX < 0) {
  //     return null;
  //   }

  //   return (
  //     <G x={x?.(positionX)} key="tooltip">
  //       <SvgLine
  //         y1={ticks?.[0]}
  //         y2={ticks?.[Number(ticks.length)]}
  //         stroke={'#848C96'}
  //         strokeWidth={apx(1)}
  //       />

  //       <Circle
  //         cy={y?.(priceList[positionX])}
  //         r={apx(20 / 2)}
  //         stroke="#fff"
  //         strokeWidth={apx(2)}
  //         fill={chartColor}
  //       />
  //     </G>
  //   );
  // };

  if (isLoading) {
    return (
      <View style={styles.chartLoading}>
        <SkeletonPlaceholder>
          <SkeletonPlaceholder.Item
            width={Dimensions.get('screen').width - 32}
            height={315}
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
          curve={curveMonotoneX}
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

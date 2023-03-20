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
  G,
  Path,
  Rect,
  Text as SvgText,
  Line as SvgLine,
  Circle,
} from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';

import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import { addCurrencySymbol } from '../../../../util/number';

const createStyles = () =>
  StyleSheet.create({
    chart: {
      paddingRight: 0,
      paddingLeft: 0,
      height: 305, // hack to remove internal padding that is not configurable
      paddingTop: 0,
      marginVertical: 10,
    },
    chartArea: {
      flex: 1,
    },
    chartLoading: {
      width: Dimensions.get('screen').width,
      paddingHorizontal: 16,
      paddingTop: 10,
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
    const { line } = props as LineProps;
    return (
      <Path
        key="line"
        d={line}
        stroke={chartColor}
        strokeWidth={apx(6)}
        fill="none"
      />
    );
  };

  const Tooltip = ({ x, y, ticks }: Partial<TooltipProps>) => {
    const tooltipWidth = apx(160);
    if (positionX < 0) {
      return null;
    }

    const date = dateList[positionX];

    return (
      <G x={x?.(positionX)} key="tooltip">
        <G
          x={positionX > dateList.length / 2 ? -tooltipWidth - 10 : apx(20)}
          y={y?.(priceList[positionX]) || 0 - apx(10)}
        >
          <Rect
            y={-apx(24 + 24 + 20) / 2}
            rx={apx(12)} // borderRadius
            ry={apx(12)} // borderRadius
            width={tooltipWidth}
            height={apx(96)}
            stroke={colors.text.alternative}
            fill="rgba(255, 255, 255, 0.8)"
          />

          <SvgText
            x={apx(20)}
            fill={colors.text.alternative}
            opacity={0.65}
            fontSize={apx(24)}
          >
            {new Date(date).toLocaleDateString()}
          </SvgText>
          <SvgText
            x={apx(20)}
            y={apx(24 + 20)}
            fontSize={apx(24)}
            fontWeight="bold"
            fill={chartColor}
          >
            {addCurrencySymbol(priceList[positionX], currentCurrency)}
          </SvgText>
        </G>

        <G>
          <SvgLine
            y1={ticks?.[0]}
            y2={ticks?.[Number(ticks.length)]}
            stroke={chartColor}
            strokeWidth={apx(4)}
            strokeDasharray={[6, 3]}
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
  return (
    <View style={styles.chart}>
      <View style={styles.chartArea} {...panResponder.current.panHandlers}>
        <AreaChart
          style={styles.chartArea}
          data={priceList}
          curve={curveMonotoneX}
          contentInset={{ top: apx(40), bottom: apx(40) }}
        >
          <Line />
          <Tooltip />
        </AreaChart>
      </View>
    </View>
  );
};

export default PriceChart;

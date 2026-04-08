import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { line, area, curveCatmullRom } from 'd3-shape';
import { useTheme } from '../../../../../../../util/theme';
import type { SparklineChartProps } from './SparklineChart.types';
import styles from './SparklineChart.styles';

export const PADDING = 2;
export const LINE_CURVE = curveCatmullRom.alpha(0.5);
export const DEFAULT_ANIMATION_DURATION = 800;

/**
 * Pure presentational sparkline chart using react-native-svg + d3-shape.
 * No interactivity, no axes — just a smooth line with optional gradient fill.
 * Uses a native-driver wipe-reveal animation: an opaque cover slides right
 * to progressively reveal the chart, giving a smooth "drawn" appearance.
 */
const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width,
  height,
  color,
  strokeWidth = 1.5,
  showGradient = true,
  gradientId = 'sparkline-gradient',
  animated = true,
  animationDuration = DEFAULT_ANIMATION_DURATION,
  revealColor,
  testID = 'sparkline-chart',
}) => {
  const { colors } = useTheme();
  const resolvedRevealColor = revealColor ?? colors.background.default;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated || data.length < 2) return;

    translateX.setValue(0);
    Animated.timing(translateX, {
      toValue: 1,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [data, animated, animationDuration, translateX]);

  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) {
      return { linePath: '', areaPath: '' };
    }

    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    const valueRange = maxVal - minVal || 1;

    const innerWidth = width - PADDING * 2;
    const innerHeight = height - PADDING * 2;

    const xScale = (index: number) =>
      PADDING + (index / (data.length - 1)) * innerWidth;

    const yScale = (value: number) =>
      PADDING + innerHeight - ((value - minVal) / valueRange) * innerHeight;

    const lineGenerator = line<number>()
      .x((_: number, i: number) => xScale(i))
      .y((d: number) => yScale(d))
      .curve(LINE_CURVE);

    const computedLinePath = lineGenerator(data) ?? '';

    let computedAreaPath = '';
    if (showGradient) {
      const areaGenerator = area<number>()
        .x((_: number, i: number) => xScale(i))
        .y0(() => height - PADDING)
        .y1((d: number) => yScale(d))
        .curve(LINE_CURVE);

      computedAreaPath = areaGenerator(data) ?? '';
    }

    return { linePath: computedLinePath, areaPath: computedAreaPath };
  }, [data, width, height, showGradient]);

  if (data.length < 2) return null;

  const coverTranslateX = animated
    ? translateX.interpolate({
        inputRange: [0, 1],
        outputRange: [0, width],
      })
    : width;

  return (
    <View style={[styles.container, { width, height }]} testID={testID}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {showGradient && areaPath && (
          <>
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <Stop offset="100%" stopColor={color} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={areaPath} fill={`url(#${gradientId})`} />
          </>
        )}
        {linePath && (
          <Path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </Svg>
      {animated && (
        <Animated.View
          style={[
            styles.cover,
            {
              backgroundColor: resolvedRevealColor,
              transform: [{ translateX: coverTranslateX }],
            },
          ]}
        />
      )}
    </View>
  );
};

export default React.memo(SparklineChart);

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { LineGraph, type GraphPoint } from 'react-native-graph';
import { colorWithOpacity } from '../../../../../../../util/colors/colorWithOpacity';
import { useTheme } from '../../../../../../../util/theme';
import type { SparklineChartProps } from './SparklineChart.types';
import styles from './SparklineChart.styles';

export const DEFAULT_ANIMATION_DURATION = 800;

/**
 * Pure presentational sparkline chart using react-native-graph.
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

  const graphPoints = useMemo<GraphPoint[]>(
    () =>
      data.map((value, index) => ({
        value,
        date: new Date(index * 1000),
      })),
    [data],
  );

  const gradientFillColors = useMemo(
    () =>
      showGradient
        ? [colorWithOpacity(color, 0.3), colorWithOpacity(color, 0)]
        : undefined,
    [color, showGradient],
  );

  if (data.length < 2) return null;

  const coverTranslateX = animated
    ? translateX.interpolate({
        inputRange: [0, 1],
        outputRange: [0, width],
      })
    : width;

  return (
    <View style={[styles.container, { width, height }]} testID={testID}>
      <LineGraph
        animated={false}
        style={styles.graph}
        points={graphPoints}
        color={color}
        lineThickness={strokeWidth}
        gradientFillColors={gradientFillColors}
        testID={`${testID}-line-graph`}
      />
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

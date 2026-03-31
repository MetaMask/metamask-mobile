/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo, useRef, useState } from 'react';
// d3-scale is required by react-native-svg-charts (Chart defaultProps.yScale)
// eslint-disable-next-line import-x/no-extraneous-dependencies -- transitive via react-native-svg-charts
import { scaleLinear, scaleLog } from 'd3-scale';
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
  Line as SvgLine,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { AreaChart } from 'react-native-svg-charts';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  CHART_HEIGHT,
  CHART_INSET_TOP,
  CHART_INSET_RIGHT,
  CHART_INSET_BOTTOM,
  CHART_INSET_LEFT,
  THRESHOLD_LABEL_NAME_OFFSET_ABOVE,
  THRESHOLD_LABEL_VALUE_OFFSET_ABOVE,
  GRADIENT_OPACITY_TOP,
  GRADIENT_OPACITY_BOTTOM,
  THRESHOLD_DASH_ARRAY,
  THRESHOLD_STROKE_WIDTH,
  THRESHOLD_STROKE_WIDTH_CURRENT,
  ZERO_BASELINE_STROKE_WIDTH,
  PLOT_LINE_STROKE_WIDTH,
  CURSOR_CIRCLE_RADIUS,
  BALANCE_HISTORY_CHART_TEST_IDS,
} from './BalanceHistoryChart.constants';
import { resolveCurrentTierCampaignIndex } from './BalanceHistoryChart.utils';

/** One campaign tier threshold; array order must match `campaign.details.tiers`. */
export interface ThresholdLine {
  label: string;
  value: number;
}

export interface BalanceHistoryChartProps {
  /** Chart series; the last point drives the active tier with `thresholdLines` (campaign tier order). */
  data: { date: string; value: number }[];
  /** Tier thresholds in campaign order (e.g. Bronze, Silver, Gold). */
  thresholdLines?: ThresholdLine[];
  formatValue?: (value: number) => string;
  isLoading?: boolean;
  /**
   * When true, the Y axis uses a logarithmic scale. Requires positive values;
   * zeros are nudged to sit just above the domain floor for drawing only.
   */
  useLogScale?: boolean;
}

interface PlotLineProps {
  line?: string;
}

interface ThresholdLinesDecoratorProps {
  y?: (value: number) => number;
}

interface CursorProps {
  x?: (index: number) => number;
  y?: (value: number) => number;
}

const BalanceHistoryChart: React.FC<BalanceHistoryChartProps> = ({
  data,
  thresholdLines = [],
  formatValue = (v: number) => `$${v.toFixed(2)}`,
  isLoading = false,
  useLogScale = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const chartWidth = Dimensions.get('window').width;
  const values = useMemo(() => data.map((d) => d.value), [data]);

  const lastBalance = values.length > 0 ? values[values.length - 1] : 0;

  const currentTierIndex = useMemo(
    () => resolveCurrentTierCampaignIndex(lastBalance, thresholdLines),
    [lastBalance, thresholdLines],
  );

  const tierAccentColors = useMemo(
    () => [
      colors.success.default,
      colors.warning.default,
      colors.error.default,
    ],
    [colors.success.default, colors.warning.default, colors.error.default],
  );

  const plotColor = useMemo(() => {
    if (currentTierIndex < 0 || thresholdLines.length === 0) {
      return colors.primary.default;
    }
    return tierAccentColors[currentTierIndex % tierAccentColors.length];
  }, [
    currentTierIndex,
    thresholdLines.length,
    tierAccentColors,
    colors.primary.default,
  ]);

  /** `-1` = show latest point in the header; `>= 0` = scrubbed index (cursor). */
  const displayIndex = useMemo(() => {
    if (data.length === 0) {
      return -1;
    }
    if (selectedIndex >= 0 && selectedIndex < data.length) {
      return selectedIndex;
    }
    return data.length - 1;
  }, [data, selectedIndex]);

  const chartDomain = useMemo(() => {
    const maxData = values.length > 0 ? Math.max(...values) : 0;
    const maxThreshold =
      thresholdLines.length > 0
        ? Math.max(...thresholdLines.map((t) => t.value))
        : 0;
    const ceiling = Math.max(maxData, maxThreshold);
    const yMaxLinear = ceiling > 0 ? ceiling * 1.15 : 100;

    if (!useLogScale) {
      return {
        chartValues: values,
        yMin: 0,
        yMax: yMaxLinear,
        yScale: scaleLinear,
        areaStart: 0,
      };
    }

    const combined = [...values, ...thresholdLines.map((t) => t.value)];
    const positive = combined.filter((v) => v > 0);
    if (positive.length === 0) {
      return {
        chartValues: values,
        yMin: 0,
        yMax: yMaxLinear,
        yScale: scaleLinear,
        areaStart: 0,
      };
    }

    const minP = Math.min(...positive);
    const maxP = Math.max(...positive);
    const yMinDomain = minP / 1.15;
    const yMaxDomain = maxP * 1.15;
    const chartValues = values.map((v) =>
      v <= 0 ? Math.max(yMinDomain * 1.0001, Number.MIN_VALUE) : v,
    );

    return {
      chartValues,
      yMin: yMinDomain,
      yMax: yMaxDomain,
      yScale: scaleLog,
      areaStart: yMinDomain,
    };
  }, [values, thresholdLines, useLogScale]);

  const updatePosition = (x: number) => {
    if (x === -1 || data.length === 0) {
      setSelectedIndex(-1);
      return;
    }
    const xDistance = chartWidth / data.length;
    const clampedX = Math.max(0, Math.min(x, chartWidth));
    let index = Math.round(clampedX / xDistance);
    if (index >= data.length) index = data.length - 1;
    setSelectedIndex(index);
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
        updatePosition(-1);
      },
    }),
  );

  const PlotLine = (props: PlotLineProps) => {
    const { line } = props;
    if (!line) return null;
    return (
      <Path
        key="plot-line"
        d={line}
        stroke={plotColor}
        strokeWidth={PLOT_LINE_STROKE_WIDTH}
        fill="none"
      />
    );
  };

  const DataGradient = () => (
    <Defs key="dataGradient">
      <LinearGradient
        id="balanceGradient"
        x1="0"
        y1="0%"
        x2="0%"
        y2={`${CHART_HEIGHT}px`}
      >
        <Stop
          offset="0%"
          stopColor={plotColor}
          stopOpacity={GRADIENT_OPACITY_TOP}
        />
        <Stop
          offset="100%"
          stopColor={plotColor}
          stopOpacity={GRADIENT_OPACITY_BOTTOM}
        />
      </LinearGradient>
    </Defs>
  );

  const ThresholdLinesDecorator = (props: ThresholdLinesDecoratorProps) => {
    const { y } = props;
    if (!y || thresholdLines.length === 0) return null;
    const alternative = colors.text.alternative;
    return (
      <G key="threshold-lines">
        {thresholdLines.map((threshold, idx) => {
          const yPos = y(threshold.value);
          if (isNaN(yPos)) return null;
          const isCurrent = idx === currentTierIndex;
          const tierColor = tierAccentColors[idx % tierAccentColors.length];
          const lineAndLabelColor = isCurrent ? tierColor : alternative;
          const valueText = formatValue(threshold.value);
          const labelNameY = yPos - THRESHOLD_LABEL_NAME_OFFSET_ABOVE;
          const labelValueY = yPos - THRESHOLD_LABEL_VALUE_OFFSET_ABOVE;
          return (
            <G key={`threshold-${threshold.label}-${threshold.value}`}>
              <SvgLine
                x1={0}
                x2={chartWidth}
                y1={yPos}
                y2={yPos}
                stroke={lineAndLabelColor}
                strokeWidth={
                  isCurrent
                    ? THRESHOLD_STROKE_WIDTH_CURRENT
                    : THRESHOLD_STROKE_WIDTH
                }
                strokeDasharray={THRESHOLD_DASH_ARRAY}
              />
              <SvgText
                x={CHART_INSET_LEFT + 4}
                y={labelNameY}
                fill={lineAndLabelColor}
                fontSize={12}
                fontWeight="500"
              >
                {threshold.label}
              </SvgText>
              <SvgText
                x={CHART_INSET_LEFT + 4}
                y={labelValueY}
                fill={lineAndLabelColor}
                fontSize={11}
                fontWeight="400"
              >
                {valueText}
              </SvgText>
            </G>
          );
        })}
      </G>
    );
  };

  const ZeroBaselineDecorator = (props: ThresholdLinesDecoratorProps) => {
    const { y } = props;
    if (!y || useLogScale) {
      return null;
    }
    const yPos = y(0);
    if (isNaN(yPos)) {
      return null;
    }
    return (
      <G key="zero-baseline">
        <SvgLine
          x1={0}
          x2={chartWidth}
          y1={yPos}
          y2={yPos}
          stroke={plotColor}
          strokeWidth={ZERO_BASELINE_STROKE_WIDTH}
          strokeLinecap="round"
        />
      </G>
    );
  };

  const Cursor = (props: CursorProps) => {
    const { x, y } = props;
    if (selectedIndex < 0 || !x || !y || selectedIndex >= data.length)
      return null;
    const xPos = x(selectedIndex);
    const yPos = y(chartDomain.chartValues[selectedIndex]);
    return (
      <G x={xPos} key="cursor">
        <SvgLine
          y1={CHART_INSET_TOP}
          y2={CHART_HEIGHT - CHART_INSET_BOTTOM}
          stroke={colors.icon.alternative}
          strokeWidth={1}
        />
        <Circle
          cy={yPos}
          r={CURSOR_CIRCLE_RADIUS}
          stroke={colors.icon.alternative}
          strokeWidth={1}
          fill={plotColor}
        />
      </G>
    );
  };

  if (isLoading) {
    return (
      <Box testID={BALANCE_HISTORY_CHART_TEST_IDS.LOADING}>
        <SkeletonPlaceholder
          backgroundColor={colors.background.alternative}
          highlightColor={colors.background.default}
        >
          <SkeletonPlaceholder.Item
            width={chartWidth - 32}
            height={CHART_HEIGHT}
            borderRadius={6}
          />
        </SkeletonPlaceholder>
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Box
        twClassName="items-center justify-center"
        style={{ height: CHART_HEIGHT }}
        testID={BALANCE_HISTORY_CHART_TEST_IDS.EMPTY}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          No balance history available
        </Text>
      </Box>
    );
  }

  return (
    <Box testID={BALANCE_HISTORY_CHART_TEST_IDS.CONTAINER}>
      <Box twClassName="px-4 pb-2">
        <Text variant={TextVariant.BodyLg}>
          {formatValue(data[displayIndex].value)}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {data[displayIndex].date}
        </Text>
      </Box>
      <Box
        twClassName="flex-1"
        testID={BALANCE_HISTORY_CHART_TEST_IDS.CHART_AREA}
      >
        <View style={tw.style('flex-1')} {...panResponder.current.panHandlers}>
          <AreaChart
            style={{ height: CHART_HEIGHT }}
            data={chartDomain.chartValues}
            contentInset={{
              top: CHART_INSET_TOP,
              right: CHART_INSET_RIGHT,
              bottom: CHART_INSET_BOTTOM,
              left: CHART_INSET_LEFT,
            }}
            svg={{ fill: 'url(#balanceGradient)' }}
            yMin={chartDomain.yMin}
            yMax={chartDomain.yMax}
            yScale={chartDomain.yScale}
            start={chartDomain.areaStart}
          >
            <PlotLine />
            <DataGradient />
            <ThresholdLinesDecorator />
            <ZeroBaselineDecorator />
            <Cursor />
          </AreaChart>
        </View>
      </Box>
    </Box>
  );
};

export default BalanceHistoryChart;

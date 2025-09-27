import React from 'react';
import { Pressable } from 'react-native';
import { LineChart } from 'react-native-svg-charts';
import { curveCatmullRom, area } from 'd3-shape';
import {
  Line,
  Text as SvgText,
  G,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';

export interface PredictDetailsChartPoint {
  time: string;
  value: number;
}

const formatTickValue = (value: number, range: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (range < 1) {
    return value.toFixed(2);
  }

  if (range < 10) {
    return value.toFixed(1);
  }

  return value.toFixed(0);
};

interface PredictDetailsChartProps {
  data: PredictDetailsChartPoint[];
  timeframes: string[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  isLoading?: boolean;
  emptyLabel?: string;
}

const DEFAULT_EMPTY_LABEL = '';
const LINE_CURVE = curveCatmullRom.alpha(0.3);
const CHART_HEIGHT = 192;

const PredictDetailsChart: React.FC<PredictDetailsChartProps> = ({
  data,
  timeframes,
  selectedTimeframe,
  onTimeframeChange,
  isLoading = false,
  emptyLabel = DEFAULT_EMPTY_LABEL,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  const hasData = data.length > 0;
  const chartValues = hasData ? data.map((point) => point.value) : [0];
  const minValue = Math.min(...chartValues);
  const maxValue = Math.max(...chartValues);
  const range = maxValue - minValue;
  const padding = range === 0 ? Math.max(maxValue * 0.1, 1) : range * 0.1;
  const chartMin = minValue - padding;
  const chartMax = maxValue + padding;

  const Gradient = () => (
    <Defs>
      <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop
          offset="0%"
          stopColor={colors.success.default}
          stopOpacity="0.3"
        />
        <Stop
          offset="100%"
          stopColor={colors.background.default}
          stopOpacity="0"
        />
      </LinearGradient>
    </Defs>
  );

  const CustomGrid = ({
    x,
    y,
    data: chartData,
    ticks,
  }: {
    x?: (value: number) => number;
    y?: (value: number) => number;
    data?: number[];
    ticks?: number[];
  }) => {
    if (!x || !y || !chartData || !ticks) return null;

    return (
      <G>
        {ticks.map((tick: number, index: number) => (
          <Line
            key={`grid-${tick}-${index}`}
            x1={0}
            x2={x(chartData.length - 1)}
            y1={y(tick)}
            y2={y(tick)}
            stroke={colors.border.muted}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        ))}
        {ticks.map((tick: number, index: number) => (
          <SvgText
            key={`label-${tick}-${index}`}
            x={x(chartData.length - 1) + 4}
            y={y(tick)}
            fontSize="12"
            fill={colors.text.default}
            textAnchor="start"
            alignmentBaseline="middle"
          >
            {formatTickValue(tick, range)}%
          </SvgText>
        ))}
      </G>
    );
  };

  const CustomArea = ({
    x,
    y,
    data: chartData,
  }: {
    x?: (value: number) => number;
    y?: (value: number) => number;
    data?: number[];
  }) => {
    if (!x || !y || !chartData) return null;
    const baseline = y(chartMin);
    const areaGenerator = area<number>()
      .x((_: number, index: number) => x(index))
      .y0(() => baseline)
      .y1((value: number) => y(value))
      .curve(LINE_CURVE);

    const areaPath = areaGenerator(chartData) ?? '';

    return (
      <G>
        <Gradient />
        <Path d={areaPath} fill="url(#gradient)" />
      </G>
    );
  };

  const renderTimeframeSelector = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        {timeframes.map((timeframe) => (
          <Pressable
            key={timeframe}
            onPress={() => onTimeframeChange(timeframe)}
            style={({ pressed }) =>
              tw.style(
                'flex-1 py-2 rounded-lg',
                selectedTimeframe === timeframe ? 'bg-muted' : 'bg-default',
                pressed && 'bg-pressed',
              )
            }
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                selectedTimeframe === timeframe
                  ? TextColor.Default
                  : TextColor.Alternative
              }
              style={tw.style('text-center')}
            >
              {timeframe.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );

  const renderGraph = () => {
    if (isLoading || !hasData) {
      const placeholderLabel = isLoading
        ? 'Loading price history...'
        : emptyLabel;
      const placeholderAxisLabel = isLoading ? 'Loading...' : '\u00A0';
      const placeholderLabels = Array.from(
        { length: 4 },
        () => placeholderAxisLabel,
      );

      return (
        <Box twClassName="mb-6">
          <Box twClassName="h-48 bg-default rounded-lg relative overflow-hidden">
            <LineChart
              style={tw.style('h-[192px] w-full')}
              data={[0, 0]}
              svg={{ stroke: colors.border.muted, strokeWidth: 1 }}
              contentInset={{ top: 20, bottom: 20, left: 20, right: 32 }}
              yMin={chartMin}
              yMax={chartMax}
              numberOfTicks={4}
              curve={LINE_CURVE}
            >
              <CustomGrid />
            </LineChart>
            <Box twClassName="absolute inset-0 items-center justify-center px-4">
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {placeholderLabel}
              </Text>
            </Box>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            twClassName="px-4 pt-4 pb-0"
          >
            {placeholderLabels.map((label, index) => (
              <Text
                key={`placeholder-${index}`}
                variant={TextVariant.BodyXS}
                color={TextColor.Alternative}
              >
                {label}
              </Text>
            ))}
          </Box>
        </Box>
      );
    }

    const chartData = data.map((point) => point.value);

    return (
      <Box twClassName="mb-6">
        <Box twClassName="h-48 bg-default rounded-lg mb-4 relative overflow-hidden">
          <LineChart
            style={tw.style(`h-[${CHART_HEIGHT}px] w-full`)}
            data={chartData}
            svg={{ stroke: colors.success.default, strokeWidth: 2 }}
            contentInset={{ top: 20, bottom: 20, left: 20, right: 32 }}
            yMin={chartMin}
            yMax={chartMax}
            numberOfTicks={4}
            curve={LINE_CURVE}
          >
            <CustomArea />
            <CustomGrid />
          </LineChart>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4"
        >
          {data
            .filter(
              (_, index) =>
                index % Math.max(1, Math.floor(data.length / 4)) === 0,
            )
            .map((point, index) => (
              <Text
                key={`${point.time}-${index}`}
                variant={TextVariant.BodyXS}
                color={TextColor.Alternative}
              >
                {point.time}
              </Text>
            ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {renderGraph()}
      {renderTimeframeSelector()}
    </Box>
  );
};

export default PredictDetailsChart;

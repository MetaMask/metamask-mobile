import React from 'react';
import { Circle, G, Line, Text as SvgText } from 'react-native-svg';
import dayjs from 'dayjs';
import { useTheme } from '../../../../../util/theme';
import { ChartTooltipProps } from './PredictGameChart.types';

const CHART_HEIGHT = 200;
const FONT_SIZE_LABEL = 12;
const FONT_SIZE_VALUE = 24;
const RIGHT_LABEL_OFFSET = 12;

const formatTimestamp = (timestamp: number): string =>
  dayjs(timestamp).format('MMM D [at] h:mm A');

const ChartTooltip: React.FC<ChartTooltipProps> = ({
  x,
  y,
  activeIndex,
  primaryData,
  nonEmptySeries,
  chartWidth,
  contentInset,
}) => {
  const { colors } = useTheme();

  if (!x || !y) return null;
  if (activeIndex < 0 || !primaryData[activeIndex]) return null;

  const xPos = x(activeIndex);
  const timestamp = primaryData[activeIndex].timestamp;
  const labelStartX = chartWidth - contentInset.right + RIGHT_LABEL_OFFSET;

  let currentLabelY = CHART_HEIGHT / 2 - 40;

  return (
    <G>
      <SvgText
        x={xPos}
        y={12}
        fill={colors.text.alternative}
        fontSize={FONT_SIZE_LABEL}
        fontWeight="400"
        textAnchor="middle"
      >
        {formatTimestamp(timestamp)}
      </SvgText>

      <Line
        x1={xPos}
        x2={xPos}
        y1={20}
        y2={CHART_HEIGHT - contentInset.bottom}
        stroke={colors.text.alternative}
        strokeWidth={1}
      />

      {nonEmptySeries.map((series, seriesIndex) => {
        const seriesData = series.data[activeIndex];
        if (!seriesData) return null;

        const lineYPos = y(seriesData.value);
        const labelY = currentLabelY;
        currentLabelY += 50;

        return (
          <G key={`series-${seriesIndex}`}>
            <Circle
              cx={xPos}
              cy={lineYPos}
              r={6}
              stroke={colors.background.default}
              strokeWidth={2}
              fill={series.color}
            />
            <SvgText
              x={labelStartX}
              y={labelY}
              fill={colors.text.alternative}
              fontSize={FONT_SIZE_LABEL}
              fontWeight="500"
            >
              {series.label}
            </SvgText>
            <SvgText
              x={labelStartX}
              y={labelY + 24}
              fill={colors.text.default}
              fontSize={FONT_SIZE_VALUE}
              fontWeight="700"
            >
              {`${seriesData.value.toFixed(0)}%`}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
};

export default ChartTooltip;

import React from 'react';
import { Circle, G, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../../../../util/theme';
import { EndpointDotsProps } from './PredictGameChart.types';

const LABEL_OFFSET_X = 12;
const FONT_SIZE_LABEL = 12;
const FONT_SIZE_VALUE = 24;

const EndpointDots: React.FC<EndpointDotsProps> = ({
  x,
  y,
  nonEmptySeries,
}) => {
  const { colors } = useTheme();

  if (!x || !y) return null;

  return (
    <G>
      {nonEmptySeries.map((series, seriesIndex) => {
        const lastIndex = series.data.length - 1;
        const lastPoint = series.data[lastIndex];
        if (!lastPoint) return null;

        const dotX = x(lastIndex);
        const dotY = y(lastPoint.value);
        const labelX = dotX + LABEL_OFFSET_X;

        return (
          <G key={`endpoint-${seriesIndex}`}>
            <Circle cx={dotX} cy={dotY} r={6} fill={series.color} />
            <SvgText
              x={labelX}
              y={dotY - 8}
              fill={colors.text.alternative}
              fontSize={FONT_SIZE_LABEL}
              fontWeight="500"
            >
              {series.label}
            </SvgText>
            <SvgText
              x={labelX}
              y={dotY + 16}
              fill={colors.text.default}
              fontSize={FONT_SIZE_VALUE}
              fontWeight="700"
            >
              {`${lastPoint.value.toFixed(0)}%`}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
};

export default EndpointDots;

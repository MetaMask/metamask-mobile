import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { formatTickValue } from '../utils';
import { ChartSeries } from '../PredictDetailsChart';

interface ChartLegendProps {
  series: ChartSeries[];
  range: number;
}

const ChartLegend: React.FC<ChartLegendProps> = ({ series, range }) => {
  if (!series.length) return null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 mb-3 flex-wrap"
    >
      {series.map((seriesItem, index) => {
        const lastPoint = seriesItem.data[seriesItem.data.length - 1];
        const valueLabel = lastPoint
          ? `${formatTickValue(lastPoint.value, range)}%`
          : '\u2014';

        return (
          <Box
            key={`${seriesItem.label}-${index}`}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mr-4 mb-2 gap-2"
          >
            <Box
              twClassName="rounded-full w-2 h-2"
              style={{
                backgroundColor: seriesItem.color,
              }}
            />
            <Text variant={TextVariant.BodySM} color={TextColor.Default}>
              {`${seriesItem.label} ${valueLabel}`}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default ChartLegend;

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
  activeIndex?: number; // Index of the active dragged position
}

const ChartLegend: React.FC<ChartLegendProps> = ({
  series,
  range,
  activeIndex,
}) => {
  if (!series.length) return null;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 mb-2 flex-wrap"
    >
      {series.map((seriesItem, index) => {
        // Show value at active index if dragging, otherwise show last value
        const dataPoint =
          activeIndex !== undefined && activeIndex >= 0
            ? seriesItem.data[activeIndex]
            : seriesItem.data[seriesItem.data.length - 1];

        const valueLabel = dataPoint
          ? `${formatTickValue(dataPoint.value, range)}%`
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

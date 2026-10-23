import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useTheme } from '../../../../util/theme';
import type { ChartCandleSkeletonProps } from './ChartCandleSkeleton.types';

/**
 * Candle-chart loading placeholder. Bar heights and offsets are fixed pixels
 * laid out with flex, so the skeleton fills the chart box without measuring it.
 */
const ChartCandleSkeleton = ({
  height = 350,
  testID = 'chart-candle-skeleton',
}: ChartCandleSkeletonProps) => {
  const { colors } = useTheme();
  const candles = [
    { height: 72, offset: 36 },
    { height: 104, offset: 28 },
    { height: 64, offset: 48 },
    { height: 128, offset: 20 },
    { height: 56, offset: 40 },
    { height: 96, offset: 32 },
    { height: 80, offset: 24 },
    { height: 48, offset: 52 },
    { height: 112, offset: 16 },
    { height: 88, offset: 44 },
    { height: 136, offset: 12 },
    { height: 76, offset: 36 },
  ];

  return (
    <Box
      testID={testID}
      twClassName="w-full flex-row items-end overflow-hidden"
      style={{
        height,
        backgroundColor: colors.background.default,
      }}
    >
      {candles.map((candle, index) => (
        <Box
          key={`${candle.height}-${candle.offset}-${index}`}
          twClassName="flex-1 items-center"
        >
          <Skeleton
            testID={`${testID}-candle-${index}`}
            width={8}
            height={candle.height}
            style={{ marginBottom: candle.offset }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ChartCandleSkeleton;

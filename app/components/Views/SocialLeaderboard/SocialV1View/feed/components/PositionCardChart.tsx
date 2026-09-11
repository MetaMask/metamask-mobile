import { Box } from '@metamask/design-system-react-native';
import React, { useCallback, useState } from 'react';
import { useTheme } from '../../../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TSA-1074: reuse the homepage sparkline primitive
import SparklineChart from '../../../../Homepage/Sections/Perpetuals/components/SparklineChart';

const CHART_HEIGHT = 64;
const CHART_STROKE_WIDTH = 2;

export interface PositionCardChartProps {
  showChart?: boolean;
  series?: number[];
  isPnlPositive: boolean;
  testID?: string;
}

const PositionCardChart: React.FC<PositionCardChartProps> = ({
  showChart,
  series,
  isPnlPositive,
  testID,
}) => {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      setWidth((current) => (current === nextWidth ? current : nextWidth));
    },
    [],
  );

  if (!showChart || !series || series.length < 2) {
    return null;
  }

  return (
    <Box testID={testID} onLayout={handleLayout} twClassName="w-full">
      {width > 0 ? (
        <SparklineChart
          data={series}
          width={width}
          height={CHART_HEIGHT}
          strokeWidth={CHART_STROKE_WIDTH}
          color={isPnlPositive ? colors.success.default : colors.error.default}
          gradientId={
            testID ? `sparkline-${testID}` : 'sparkline-position-card'
          }
          revealColor={colors.background.muted}
          showGradient={false}
          animated={false}
        />
      ) : null}
    </Box>
  );
};

export default PositionCardChart;

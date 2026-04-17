import React, { useRef, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { LivelineChart } from '../../../Charts/LivelineChart';
import type { LivelineChartRef } from '../../../Charts/LivelineChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import type { PredictCryptoUpDownChartProps } from './PredictCryptoUpDownChart.types';

const PredictCryptoUpDownChart: React.FC<PredictCryptoUpDownChartProps> = ({
  market,
  targetPrice,
  height: explicitHeight,
}) => {
  const chartRef = useRef<LivelineChartRef>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const { data, value, loading, window } = useCryptoUpDownChartData(
    market,
    chartRef,
  );

  const chartHeight = explicitHeight ?? measuredHeight;

  return (
    <Box
      twClassName={explicitHeight ? undefined : 'flex-1'}
      onLayout={
        explicitHeight
          ? undefined
          : (e) => setMeasuredHeight(e.nativeEvent.layout.height)
      }
      testID="predict-crypto-up-down-chart-container"
    >
      {chartHeight > 0 && (
        <LivelineChart
          ref={chartRef}
          data={data}
          value={value}
          loading={loading}
          window={window}
          height={chartHeight}
          color="rgb(245, 158, 11)"
          lineWidth={2}
          grid={true}
          badge={true}
          referenceLine={
            targetPrice ? { value: targetPrice, label: 'Target' } : undefined
          }
          formatValue="return '$' + v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})"
        />
      )}
    </Box>
  );
};

export default PredictCryptoUpDownChart;

import React, { useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { LivelineChart } from '../../../Charts/LivelineChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import type { PredictCryptoUpDownChartProps } from './PredictCryptoUpDownChart.types';

const PredictCryptoUpDownChart: React.FC<PredictCryptoUpDownChartProps> = ({
  market,
  targetPrice,
}) => {
  const tw = useTailwind();
  const [chartHeight, setChartHeight] = useState(0);
  const { data, value, loading, window } = useCryptoUpDownChartData(market);

  return (
    <Box
      twClassName="flex-1"
      onLayout={(e) => setChartHeight(e.nativeEvent.layout.height)}
      testID="predict-crypto-up-down-chart-container"
    >
      {chartHeight > 0 && (
        <LivelineChart
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

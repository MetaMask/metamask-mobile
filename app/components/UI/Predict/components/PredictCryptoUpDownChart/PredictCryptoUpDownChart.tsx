import React, { useEffect, useRef, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  LivelineChart,
  type LivelineChartRef,
} from '../../../Charts/LivelineChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import type { PredictCryptoUpDownChartProps } from './PredictCryptoUpDownChart.types';

const PredictCryptoUpDownChart: React.FC<PredictCryptoUpDownChartProps> = ({
  market,
  targetPrice,
  onCurrentPriceChange,
  height: explicitHeight,
}) => {
  const chartRef = useRef<LivelineChartRef>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const {
    data,
    value,
    loading,
    window: chartWindow,
  } = useCryptoUpDownChartData(market, chartRef, targetPrice);

  const chartHeight = explicitHeight ?? measuredHeight;

  useEffect(() => {
    if (Number.isFinite(value) && value > 0) {
      onCurrentPriceChange?.(value);
    }
  }, [onCurrentPriceChange, value]);

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
          window={chartWindow}
          height={chartHeight}
          color="rgb(245, 158, 11)"
          lineWidth={2}
          grid
          hideControls
          badge
          padding={{ top: 48, bottom: 48 }}
          referenceLine={
            targetPrice ? { value: targetPrice, label: 'Target' } : undefined
          }
          formatValue="const sign = v < 0 ? '-' : ''; const parts = Math.abs(v).toFixed(2).split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); return sign + '$' + parts.join('.')"
        />
      )}
    </Box>
  );
};

export default PredictCryptoUpDownChart;

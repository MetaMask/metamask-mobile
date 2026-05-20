import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import {
  LivelineChart,
  type LivelineChartRef,
} from '../../../Charts/LivelineChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import type { PredictCryptoUpDownChartProps } from './PredictCryptoUpDownChart.types';

/**
 * USD currency formatter body for `LivelineChart` axis/tooltip values, e.g.
 * `1234567.89` → `"$1,234,567.89"`. Serialised as a JS function body string
 * because functions cannot cross the RN ↔ WebView JSON bridge — the WebView
 * reconstructs it via `new Function('v', CRYPTO_UP_DOWN_FORMAT_VALUE)`.
 * Exact output is locked by a regression test in
 * `PredictCryptoUpDownChart.test.tsx` since drift only surfaces on device.
 */
export const CRYPTO_UP_DOWN_FORMAT_VALUE =
  "const sign = v < 0 ? '-' : ''; " +
  "const parts = Math.abs(v).toFixed(2).split('.'); " +
  "parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); " +
  "return sign + '$' + parts.join('.')";

const PredictCryptoUpDownChart: React.FC<PredictCryptoUpDownChartProps> = ({
  market,
  targetPrice,
  onCurrentPriceChange,
  color = 'rgb(245, 158, 11)',
  height: explicitHeight,
}) => {
  const chartRef = useRef<LivelineChartRef>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const {
    data,
    value,
    loading,
    window: chartWindow,
  } = useCryptoUpDownChartData(market, targetPrice);

  const chartHeight = explicitHeight ?? measuredHeight;

  // Override liveline's momentum so the price badge (and direction arrows) color
  // by target comparison instead of recent-tick momentum.
  const directionMomentum = useMemo<'up' | 'down' | undefined>(() => {
    if (
      loading ||
      typeof targetPrice !== 'number' ||
      typeof value !== 'number' ||
      value <= 0
    ) {
      return undefined;
    }
    return value >= targetPrice ? 'up' : 'down';
  }, [loading, targetPrice, value]);

  useEffect(() => {
    if (!loading && data.length > 0 && Number.isFinite(value)) {
      onCurrentPriceChange?.(value);
    }
  }, [data.length, loading, onCurrentPriceChange, value]);

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
          color={color}
          lineWidth={2}
          grid
          hideControls
          badge
          momentum={directionMomentum ?? true}
          padding={{ top: 48, bottom: 48 }}
          referenceLine={
            targetPrice ? { value: targetPrice, label: 'Target' } : undefined
          }
          formatValue={CRYPTO_UP_DOWN_FORMAT_VALUE}
        />
      )}
    </Box>
  );
};

export default PredictCryptoUpDownChart;

import React, { useEffect, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { LivelineChart } from '../../../Charts/LivelineChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import type { PredictCryptoUpDownChartProps } from './PredictCryptoUpDownChart.types';

/**
 * USD whole-dollar formatter body for `LivelineChart` axis/tooltip values,
 * e.g. `1234567.89` -> `"$1,234,568"`. Serialised as a JS function body
 * string because functions cannot cross the RN <-> WebView JSON bridge; the
 * WebView reconstructs it via
 * `new Function('v', CRYPTO_UP_DOWN_FORMAT_VALUE)`. Exact output is locked
 * by a regression test in `PredictCryptoUpDownChart.test.tsx` since drift
 * only surfaces on device.
 */
export const CRYPTO_UP_DOWN_FORMAT_VALUE =
  "const sign = v < 0 ? '-' : ''; " +
  'const whole = String(Math.round(Math.abs(v))); ' +
  "return sign + '$' + whole.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')";

/**
 * 12-hour `h:mm:ss` time formatter body for `LivelineChart` time-axis
 * labels (e.g. `8:48:30`). Compact enough to fit the live 30s window
 * without label overlap. Same bridge constraint as
 * `CRYPTO_UP_DOWN_FORMAT_VALUE`.
 */
export const CRYPTO_UP_DOWN_FORMAT_TIME =
  'const d = new Date(t * 1000); ' +
  'const h = d.getHours() % 12 || 12; ' +
  "const m = String(d.getMinutes()).padStart(2, '0'); " +
  "const s = String(d.getSeconds()).padStart(2, '0'); " +
  "return h + ':' + m + ':' + s";

const PredictCryptoUpDownChart: React.FC<PredictCryptoUpDownChartProps> = ({
  market,
  targetPrice,
  onCurrentPriceChange,
  color = 'rgb(245, 158, 11)',
  height: explicitHeight,
}) => {
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const {
    data,
    value,
    loading,
    window: chartWindow,
  } = useCryptoUpDownChartData(market, targetPrice);

  const chartHeight = explicitHeight ?? measuredHeight;

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
          data={data}
          value={value}
          loading={loading}
          window={chartWindow}
          height={chartHeight}
          color={color}
          lineWidth={2}
          grid
          hideControls
          badge={false}
          momentum={false}
          padding={{ top: 8, right: 64, bottom: 48 }}
          referenceLine={
            targetPrice ? { value: targetPrice, label: 'Target' } : undefined
          }
          /*
           * TODO: Re-enable orderbook once Liveline supports one-shot updates
           * instead of resampling a persistent book.
           * orderbook={orderbook ?? undefined}
           */
          formatValue={CRYPTO_UP_DOWN_FORMAT_VALUE}
          formatTime={CRYPTO_UP_DOWN_FORMAT_TIME}
        />
      )}
    </Box>
  );
};

export default PredictCryptoUpDownChart;

import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@metamask/design-system-react-native';
import { LivelineChart } from '../../../Charts/LivelineChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { usePredictOrderbook } from '../../hooks/usePredictOrderbook';
import type { PredictCryptoUpDownChartProps } from './PredictCryptoUpDownChart.types';

/**
 * USD currency formatter body for `LivelineChart` axis/tooltip values, e.g.
 * `1234567.89` → `"$1,234,567.89"`. Keeps two decimals to match the CTA
 * price display on the details and feed cards (see PR #30342). Serialised
 * as a JS function body string because functions cannot cross the RN ↔
 * WebView JSON bridge — the WebView reconstructs it via
 * `new Function('v', CRYPTO_UP_DOWN_FORMAT_VALUE)`. Exact output is locked
 * by a regression test in `PredictCryptoUpDownChart.test.tsx` since drift
 * only surfaces on device.
 */
export const CRYPTO_UP_DOWN_FORMAT_VALUE =
  "const sign = v < 0 ? '-' : ''; " +
  "const parts = Math.abs(v).toFixed(2).split('.'); " +
  "parts[0] = parts[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); " +
  "return sign + '$' + parts.join('.')";

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

  const outcomeTokenId = market.outcomes?.[0]?.tokens?.[0]?.id;
  const { orderbook } = usePredictOrderbook(outcomeTokenId);

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
          padding={{ top: 8, bottom: 48 }}
          referenceLine={
            targetPrice ? { value: targetPrice, label: 'Target' } : undefined
          }
          // Coalesce null → undefined so JSON.stringify in the WebView
          // bridge omits the key entirely when there is no book yet. null
          // would otherwise serialize and clobber any prior orderbook in
          // the WebView.
          orderbook={orderbook ?? undefined}
          formatValue={CRYPTO_UP_DOWN_FORMAT_VALUE}
          formatTime={CRYPTO_UP_DOWN_FORMAT_TIME}
        />
      )}
    </Box>
  );
};

export default PredictCryptoUpDownChart;

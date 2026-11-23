import React from 'react';
import {
  TimeDuration,
  type CandleData,
  type CandlePeriod,
} from '@metamask/perps-controller';
import ChartCandleSkeleton from '../../../Charts/ChartCandleSkeleton';
import PerpsAdvancedChart, {
  type PerpsAdvancedChartProps,
} from '../PerpsAdvancedChart/PerpsAdvancedChart';
import TradingViewChart, { type TPSLLines } from '../TradingViewChart';
import type { UsePerpsInlineChartResult } from '../../hooks/usePerpsInlineChart';

export interface PerpsInlineChartProps {
  chart: UsePerpsInlineChartResult;
  symbol: string | undefined;
  interval: CandlePeriod;
  marketContextKey: string;
  isMarketContextReady: boolean;
  isAdvancedChartEnabled: boolean;
  /** Bump to remount the Advanced chart, e.g. pull-to-refresh. */
  advancedChartResetKey?: number;
  height: number;
  skeletonTestID: string;
  lightweightTestID: string;
  candleData: CandleData | null;
  isCandleDataLoading: boolean;
  candleDeliveryRevision: number;
  fetchMoreHistory: () => void;
  tpslLines?: TPSLLines;
  positionSize?: string;
  szDecimals?: number | null;
  onLatestPriceChange?: PerpsAdvancedChartProps['onLatestPriceChange'];
  onResolved?: PerpsAdvancedChartProps['onResolved'];
  onFreshDelivery?: () => void;
  onError?: PerpsAdvancedChartProps['onError'];
}

/**
 * Inline market chart shared by the Lite and Pro market views. On fullscreen
 * close (`chart.inlineViewportRevision`) the Advanced chart re-frames in place,
 * since a WebView remount is a full cold start, while the Lightweight chart
 * remounts with the persisted count, since its library is inlined.
 */
const PerpsInlineChart = ({
  chart,
  symbol,
  interval,
  marketContextKey,
  isMarketContextReady,
  isAdvancedChartEnabled,
  advancedChartResetKey = 0,
  height,
  skeletonTestID,
  lightweightTestID,
  candleData,
  isCandleDataLoading,
  candleDeliveryRevision,
  fetchMoreHistory,
  tpslLines,
  positionSize,
  szDecimals,
  onLatestPriceChange,
  onResolved,
  onFreshDelivery,
  onError,
}: PerpsInlineChartProps) => {
  if (isMarketContextReady && symbol && isAdvancedChartEnabled) {
    return (
      <PerpsAdvancedChart
        key={`${symbol}|${marketContextKey}|${advancedChartResetKey}`}
        viewportRevision={chart.inlineViewportRevision}
        symbol={symbol}
        interval={interval}
        visibleCandleCount={chart.visibleCandleCount}
        height={height}
        tpslLines={tpslLines}
        positionSize={positionSize}
        szDecimals={szDecimals}
        onCrosshairDataChange={chart.setOhlcData}
        onLatestPriceChange={onLatestPriceChange}
        onResolved={onResolved}
        onFreshDelivery={onFreshDelivery}
        onError={onError}
        onVisibleCandleCountChange={chart.onVisibleCandleCountChange}
        fallbackCandleData={candleData}
        fallbackDeliveryRevision={candleDeliveryRevision}
        fallbackFetchMoreHistory={fetchMoreHistory}
        paginationDuration={TimeDuration.YearToDate}
      />
    );
  }

  if (
    isMarketContextReady &&
    symbol &&
    candleData?.symbol === symbol &&
    candleData.interval === interval &&
    !isCandleDataLoading
  ) {
    return (
      <TradingViewChart
        key={`${symbol}|${marketContextKey}|${chart.inlineViewportRevision}`}
        ref={chart.lightweightChartRef}
        candleData={candleData}
        height={height}
        visibleCandleCount={chart.visibleCandleCount}
        tpslLines={tpslLines}
        symbol={symbol}
        showOverlay={false}
        coloredVolume
        onOhlcDataChange={chart.setOhlcData}
        onNeedMoreHistory={fetchMoreHistory}
        onVisibleCandleCountChange={chart.onVisibleCandleCountChange}
        testID={lightweightTestID}
      />
    );
  }

  return <ChartCandleSkeleton height={height} testID={skeletonTestID} />;
};

export default PerpsInlineChart;

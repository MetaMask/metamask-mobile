import { useCallback, useEffect, useRef, useState } from 'react';
import type { CandleData, CandlePeriod } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import type {
  OhlcData,
  TradingViewChartRef,
} from '../components/TradingViewChart';
import type { PerpsChartAnalyticsProperties } from '../utils/chartAnalytics';
import { usePerpsEventTracking } from './usePerpsEventTracking';
import { usePerpsVisibleCandleCount } from './usePerpsVisibleCandleCount';

export interface UsePerpsInlineChartOptions {
  symbol: string | undefined;
  interval: CandlePeriod;
  /** Latest Lightweight delivery; used to zoom once the new interval lands. */
  candleData: CandleData | null;
  isMarketContextReady: boolean;
  marketContextKey: string;
  chartAnalyticsProperties: PerpsChartAnalyticsProperties;
}

export interface UsePerpsInlineChartResult {
  visibleCandleCount: number;
  onVisibleCandleCountChange: (count: number) => void;
  isFullscreenChartVisible: boolean;
  openFullscreenChart: () => void;
  closeFullscreenChart: () => void;
  /** Bumped on fullscreen close so the inline chart adopts the fullscreen zoom. */
  inlineViewportRevision: number;
  lightweightChartRef: React.RefObject<TradingViewChartRef | null>;
  ohlcData: OhlcData | null;
  setOhlcData: (data: OhlcData | null) => void;
}

/**
 * Inline chart state shared by the Lite and Pro market views: candle count,
 * fullscreen open/close handoff, crosshair data, and interval zoom.
 */
export function usePerpsInlineChart({
  symbol,
  interval,
  candleData,
  isMarketContextReady,
  marketContextKey,
  chartAnalyticsProperties,
}: UsePerpsInlineChartOptions): UsePerpsInlineChartResult {
  const { track } = usePerpsEventTracking();
  const { visibleCandleCount, onVisibleCandleCountChange } =
    usePerpsVisibleCandleCount(symbol);
  const [isFullscreenChartVisible, setIsFullscreenChartVisible] =
    useState(false);
  const [inlineViewportRevision, setInlineViewportRevision] = useState(0);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);
  const lightweightChartRef = useRef<TradingViewChartRef>(null);
  const previousIntervalRef = useRef<CandlePeriod | null>(null);

  useEffect(() => {
    if (!isMarketContextReady) {
      setOhlcData(null);
      setIsFullscreenChartVisible(false);
    }
  }, [isMarketContextReady, marketContextKey]);

  // Zoom the Lightweight chart once the newly selected interval's data lands.
  useEffect(() => {
    if (
      previousIntervalRef.current !== interval &&
      candleData?.interval === interval
    ) {
      lightweightChartRef.current?.zoomToLatestCandle(visibleCandleCount);
      previousIntervalRef.current = interval;
    }
  }, [candleData, interval, visibleCandleCount]);

  const openFullscreenChart = useCallback(() => {
    setIsFullscreenChartVisible(true);
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
        PERPS_EVENT_VALUE.INTERACTION_TYPE.FULL_SCREEN_CHART,
      [PERPS_EVENT_PROPERTY.ASSET]: symbol ?? '',
      ...chartAnalyticsProperties,
    });
  }, [chartAnalyticsProperties, symbol, track]);

  const closeFullscreenChart = useCallback(() => {
    setIsFullscreenChartVisible(false);
    setInlineViewportRevision((revision) => revision + 1);
  }, []);

  return {
    visibleCandleCount,
    onVisibleCandleCountChange,
    isFullscreenChartVisible,
    openFullscreenChart,
    closeFullscreenChart,
    inlineViewportRevision,
    lightweightChartRef,
    ohlcData,
    setOhlcData,
  };
}

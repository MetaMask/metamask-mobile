import { act, renderHook } from '@testing-library/react-hooks';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller/constants';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { getPerpsChartAnalyticsProperties } from '../utils/chartAnalytics';
import { usePerpsInlineChart } from './usePerpsInlineChart';

const mockTrack = jest.fn();
jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('./usePerpsVisibleCandleCount', () => ({
  usePerpsVisibleCandleCount: () => ({
    visibleCandleCount: 80,
    onVisibleCandleCountChange: jest.fn(),
  }),
}));

const ANALYTICS = getPerpsChartAnalyticsProperties(
  PERPS_EVENT_VALUE.CHART_LIBRARY.ADVANCED,
);

const candleDataFor = (interval: CandlePeriod): CandleData => ({
  symbol: 'BTC',
  interval,
  candles: [],
});

interface Props {
  interval: CandlePeriod;
  candleData: CandleData | null;
  isMarketContextReady: boolean;
}

const renderInlineChart = (initialProps: Props) =>
  renderHook(
    ({ interval, candleData, isMarketContextReady }: Props) =>
      usePerpsInlineChart({
        symbol: 'BTC',
        interval,
        candleData,
        isMarketContextReady,
        marketContextKey: 'ctx',
        chartAnalyticsProperties: ANALYTICS,
      }),
    { initialProps },
  );

describe('usePerpsInlineChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks the fullscreen open and bumps the inline viewport revision on close', () => {
    const { result } = renderInlineChart({
      interval: CandlePeriod.OneHour,
      candleData: null,
      isMarketContextReady: true,
    });

    act(() => result.current.openFullscreenChart());

    expect(result.current.isFullscreenChartVisible).toBe(true);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.FULL_SCREEN_CHART,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        ...ANALYTICS,
      },
    );
    expect(result.current.inlineViewportRevision).toBe(0);

    act(() => result.current.closeFullscreenChart());

    expect(result.current.isFullscreenChartVisible).toBe(false);
    expect(result.current.inlineViewportRevision).toBe(1);
  });

  it('closes fullscreen and clears crosshair data when the market context is no longer ready', () => {
    const { result, rerender } = renderInlineChart({
      interval: CandlePeriod.OneHour,
      candleData: null,
      isMarketContextReady: true,
    });
    act(() => {
      result.current.openFullscreenChart();
      result.current.setOhlcData({
        time: 1,
        open: '1',
        high: '2',
        low: '0.5',
        close: '1.5',
      });
    });

    rerender({
      interval: CandlePeriod.OneHour,
      candleData: null,
      isMarketContextReady: false,
    });

    expect(result.current.isFullscreenChartVisible).toBe(false);
    expect(result.current.ohlcData).toBeNull();
  });

  it('zooms the Lightweight chart once the newly selected interval data lands', () => {
    const zoomToLatestCandle = jest.fn();
    const { result, rerender } = renderInlineChart({
      interval: CandlePeriod.OneHour,
      candleData: null,
      isMarketContextReady: true,
    });
    Object.assign(result.current.lightweightChartRef, {
      current: { zoomToLatestCandle },
    });

    rerender({
      interval: CandlePeriod.OneHour,
      candleData: candleDataFor(CandlePeriod.OneHour),
      isMarketContextReady: true,
    });
    expect(zoomToLatestCandle).toHaveBeenCalledTimes(1);
    expect(zoomToLatestCandle).toHaveBeenLastCalledWith(80);

    rerender({
      interval: CandlePeriod.FourHours,
      candleData: candleDataFor(CandlePeriod.OneHour),
      isMarketContextReady: true,
    });
    expect(zoomToLatestCandle).toHaveBeenCalledTimes(1);

    rerender({
      interval: CandlePeriod.FourHours,
      candleData: candleDataFor(CandlePeriod.FourHours),
      isMarketContextReady: true,
    });
    expect(zoomToLatestCandle).toHaveBeenCalledTimes(2);
  });
});

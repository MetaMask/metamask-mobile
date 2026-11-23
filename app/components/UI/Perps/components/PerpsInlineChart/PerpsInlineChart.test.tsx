import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';
import type { TradingViewChartRef } from '../TradingViewChart';
import type { UsePerpsInlineChartResult } from '../../hooks/usePerpsInlineChart';
import PerpsInlineChart, {
  type PerpsInlineChartProps,
} from './PerpsInlineChart';

const mockAdvancedMount = jest.fn();
const mockAdvancedProps = jest.fn();
const mockLightweightMount = jest.fn();
const mockLightweightProps = jest.fn();

jest.mock('../PerpsAdvancedChart/PerpsAdvancedChart', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    __esModule: true,
    default: function MockPerpsAdvancedChart(props: unknown): null {
      useEffect(() => {
        mockAdvancedMount();
      }, []);
      mockAdvancedProps(props);
      return null;
    },
  };
});

jest.mock('../TradingViewChart', () => {
  const { forwardRef, useEffect } = jest.requireActual('react');
  return {
    __esModule: true,
    default: forwardRef((props: unknown): null => {
      useEffect(() => {
        mockLightweightMount();
      }, []);
      mockLightweightProps(props);
      return null;
    }),
  };
});

jest.mock('../../../Charts/ChartCandleSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID: string }) => <View testID={testID} />,
  };
});

const CANDLES = {
  symbol: 'BTC',
  interval: CandlePeriod.OneHour,
  candles: [],
} as unknown as CandleData;

const chartState = (
  overrides: Partial<UsePerpsInlineChartResult> = {},
): UsePerpsInlineChartResult => ({
  visibleCandleCount: 45,
  onVisibleCandleCountChange: jest.fn(),
  isFullscreenChartVisible: false,
  openFullscreenChart: jest.fn(),
  closeFullscreenChart: jest.fn(),
  inlineViewportRevision: 0,
  lightweightChartRef: createRef<TradingViewChartRef>(),
  ohlcData: null,
  setOhlcData: jest.fn(),
  ...overrides,
});

const baseProps = (
  overrides: Partial<PerpsInlineChartProps> = {},
): PerpsInlineChartProps => ({
  chart: chartState(),
  symbol: 'BTC',
  interval: CandlePeriod.OneHour,
  marketContextKey: 'ctx',
  isMarketContextReady: true,
  isAdvancedChartEnabled: true,
  height: 240,
  skeletonTestID: 'skeleton',
  lightweightTestID: 'lightweight',
  candleData: CANDLES,
  isCandleDataLoading: false,
  candleDeliveryRevision: 0,
  fetchMoreHistory: jest.fn(),
  ...overrides,
});

describe('PerpsInlineChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('re-frames the Advanced chart in place on a viewport revision bump', () => {
    const { rerender } = render(<PerpsInlineChart {...baseProps()} />);

    rerender(
      <PerpsInlineChart
        {...baseProps({
          chart: chartState({
            inlineViewportRevision: 1,
            visibleCandleCount: 80,
          }),
        })}
      />,
    );

    expect(mockAdvancedMount).toHaveBeenCalledTimes(1);
    expect(mockAdvancedProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ viewportRevision: 1, visibleCandleCount: 80 }),
    );
  });

  it('remounts the Advanced chart when the reset key changes', () => {
    const { rerender } = render(<PerpsInlineChart {...baseProps()} />);

    rerender(<PerpsInlineChart {...baseProps({ advancedChartResetKey: 1 })} />);

    expect(mockAdvancedMount).toHaveBeenCalledTimes(2);
  });

  it('remounts the Lightweight chart with the persisted count on a viewport revision bump', () => {
    const { rerender } = render(
      <PerpsInlineChart {...baseProps({ isAdvancedChartEnabled: false })} />,
    );

    rerender(
      <PerpsInlineChart
        {...baseProps({
          isAdvancedChartEnabled: false,
          chart: chartState({
            inlineViewportRevision: 1,
            visibleCandleCount: 80,
          }),
        })}
      />,
    );

    expect(mockLightweightMount).toHaveBeenCalledTimes(2);
    expect(mockLightweightProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ visibleCandleCount: 80 }),
    );
  });

  it.each([
    ['the market context is not ready', { isMarketContextReady: false }],
    ['there is no symbol', { symbol: undefined }],
  ])('renders the skeleton when %s', (_, overrides) => {
    const { getByTestId } = render(
      <PerpsInlineChart {...baseProps(overrides)} />,
    );

    expect(getByTestId('skeleton')).toBeOnTheScreen();
    expect(mockAdvancedMount).not.toHaveBeenCalled();
  });

  it.each([
    ['still loading', { isCandleDataLoading: true }],
    [
      'for another interval',
      { candleData: { ...CANDLES, interval: CandlePeriod.FourHours } },
    ],
  ])(
    'renders the skeleton instead of the Lightweight chart while candle data is %s',
    (_, overrides) => {
      const { getByTestId } = render(
        <PerpsInlineChart
          {...baseProps({ isAdvancedChartEnabled: false, ...overrides })}
        />,
      );

      expect(getByTestId('skeleton')).toBeOnTheScreen();
      expect(mockLightweightMount).not.toHaveBeenCalled();
    },
  );
});

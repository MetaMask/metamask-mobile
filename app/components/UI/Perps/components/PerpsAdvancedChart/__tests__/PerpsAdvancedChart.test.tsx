import React from 'react';
import { act, render } from '@testing-library/react-native';
import { CandlePeriod } from '@metamask/perps-controller';
import {
  default as PerpsAdvancedChart,
  mapTpslToPositionLines,
  getPerpsPositionLineColors,
} from '../PerpsAdvancedChart';
import type { AdvancedChartProps } from '../../../../Charts/AdvancedChart/AdvancedChart.types';
import { getPerpsVolumeColors, hexToRgba } from '../../../utils/chartColors';
import type { TPSLLines } from '../../TradingViewChart/TradingViewChart';
import type { Colors } from '../../../../../../util/theme/models';
import { mockTheme } from '../../../../../../util/theme';
import { endTrace, trace } from '../../../../../../util/trace';
import { playImpact } from '../../../../../../util/haptics';

const mockAdvancedChart = jest.fn<React.ReactNode, [unknown]>(() => null);
const mockUsePerpsAdvancedChartAdapter = jest.fn();
const mockTradingViewChart = jest.fn<React.ReactNode, [unknown]>(() => null);

jest.mock('../../../../Charts/AdvancedChart/AdvancedChart', () => ({
  __esModule: true,
  default: (props: unknown) => mockAdvancedChart(props),
}));

jest.mock('../../../hooks/usePerpsAdvancedChartAdapter', () => ({
  usePerpsAdvancedChartAdapter: (params: unknown) =>
    mockUsePerpsAdvancedChartAdapter(params),
}));

jest.mock('../../TradingViewChart/TradingViewChart', () => ({
  __esModule: true,
  default: (props: unknown) => mockTradingViewChart(props),
}));

jest.mock('../../../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

jest.mock('../../../../../../util/trace', () => ({
  endTrace: jest.fn(),
  trace: jest.fn(),
  TraceName: {
    PerpsAdvancedChartInitialVisible: 'Perps Advanced Chart Initial Visible',
    PerpsAdvancedChartIntervalVisible: 'Perps Advanced Chart Interval Visible',
  },
  TraceOperation: {
    PerpsAdvancedChart: 'perps.advanced_chart',
    PerpsAdvancedChartInterval: 'perps.advanced_chart_interval',
  },
}));

jest.mock('../../../../../../util/haptics', () => ({
  ImpactMoment: {
    ChartCrosshair: 'ChartCrosshair',
  },
  playImpact: jest.fn(),
}));

jest.mock('react-native-performance', () => ({
  now: jest.fn(() => 0),
}));

const mockAdapterResult = {
  ohlcvData: [],
  realtimeBar: undefined,
  ohlcvSeriesKey: 'BTC|1h',
  visibleFromMs: undefined,
  visibleToMs: undefined,
  isLoading: false,
  handleFetchOlderBarsRequest: jest.fn(),
};

describe('PerpsAdvancedChart', () => {
  const renderChart = (
    overrides: Partial<React.ComponentProps<typeof PerpsAdvancedChart>> = {},
  ) =>
    render(
      <PerpsAdvancedChart
        symbol="BTC"
        interval={CandlePeriod.OneHour}
        visibleCandleCount={100}
        height={240}
        fallbackCandleData={null}
        {...overrides}
      />,
    );

  const advancedChartProps = () =>
    mockAdvancedChart.mock.calls[0][0] as AdvancedChartProps;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsAdvancedChartAdapter.mockReturnValue(mockAdapterResult);
  });

  it('passes the visible current-price token to AdvancedChart', () => {
    const volumeColors = getPerpsVolumeColors(mockTheme.colors as Colors);

    renderChart();

    expect(mockAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPriceLineColorOverride: mockTheme.colors.text.default,
        volumeSuccessColorOverride: volumeColors.success,
        volumeErrorColorOverride: volumeColors.error,
      }),
    );
  });

  it('passes mapped position lines to AdvancedChart', () => {
    renderChart({
      tpslLines: {
        entryPrice: '42000',
        takeProfitPrice: '45000',
        stopLossPrice: '40000',
        liquidationPrice: '38000',
      },
      positionSize: '-0.5',
    });

    expect(mockAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({
        positionLines: {
          side: 'short',
          entryPrice: 42000,
          takeProfitPrice: 45000,
          stopLossPrice: 40000,
          liquidationPrice: 38000,
        },
      }),
    );
  });

  it('converts crosshair data to string OHLC values and emits haptics on OHLC changes', () => {
    const onCrosshairDataChange = jest.fn();
    renderChart({ onCrosshairDataChange });
    const props = advancedChartProps();

    act(() => {
      props.onCrosshairMove?.({
        time: 1000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      });
      props.onCrosshairMove?.({
        time: 1000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 100,
      });
      props.onCrosshairMove?.({
        time: 1000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.6,
        volume: 100,
      });
      props.onCrosshairMove?.({
        time: 1000,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.6,
        volume: 125,
      });
    });

    expect(onCrosshairDataChange).toHaveBeenLastCalledWith({
      time: 1000,
      open: '1',
      high: '2',
      low: '0.5',
      close: '1.6',
      volume: '125',
    });
    expect(playImpact).toHaveBeenCalledTimes(3);
  });

  it('passes null crosshair data through to the parent', () => {
    const onCrosshairDataChange = jest.fn();
    renderChart({ onCrosshairDataChange });

    act(() => {
      advancedChartProps().onCrosshairMove?.(null);
    });

    expect(onCrosshairDataChange).toHaveBeenCalledWith(null);
    expect(playImpact).not.toHaveBeenCalled();
  });

  it('ends the visibility trace when the skeleton hides', () => {
    const onSkeletonHidden = jest.fn();
    renderChart({ onSkeletonHidden });

    act(() => {
      advancedChartProps().onSkeletonHidden?.();
    });

    expect(trace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Perps Advanced Chart Initial Visible',
        op: 'perps.advanced_chart',
        id: 'BTC|1h',
      }),
    );
    expect(endTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Perps Advanced Chart Initial Visible',
        id: 'BTC|1h',
        data: expect.objectContaining({
          symbol: 'BTC',
          interval: CandlePeriod.OneHour,
          surface: 'market_detail',
          transition: 'initial_load',
        }),
      }),
    );
    expect(onSkeletonHidden).toHaveBeenCalledTimes(1);
  });

  it('renders Lightweight fallback after AdvancedChart reports an error', () => {
    const onError = jest.fn();
    const onCrosshairDataChange = jest.fn();
    renderChart({ fallbackCandleData: null, onError, onCrosshairDataChange });

    act(() => {
      advancedChartProps().onError?.('chart failed');
    });

    expect(onError).toHaveBeenCalledWith('chart failed');
    expect(mockTradingViewChart).toHaveBeenCalledWith(
      expect.objectContaining({
        candleData: null,
        height: 240,
        visibleCandleCount: 100,
        onOhlcDataChange: onCrosshairDataChange,
        showOverlay: false,
        coloredVolume: true,
      }),
    );
  });
});

describe('mapTpslToPositionLines', () => {
  it('returns undefined when tpslLines is undefined', () => {
    expect(mapTpslToPositionLines(undefined, undefined)).toBeUndefined();
  });

  it('returns undefined when entryPrice is absent', () => {
    const partial: TPSLLines = { takeProfitPrice: '45000' };
    expect(mapTpslToPositionLines(partial, '1.0')).toBeUndefined();
  });

  it('returns undefined when entryPrice is non-finite', () => {
    expect(
      mapTpslToPositionLines({ entryPrice: 'NaN' }, '1.0'),
    ).toBeUndefined();
  });

  it('maps string TPSL to numeric PositionLines with long side for positive size', () => {
    const result = mapTpslToPositionLines(
      {
        entryPrice: '42000',
        takeProfitPrice: '45000',
        stopLossPrice: '40000',
        liquidationPrice: '38000',
      },
      '0.5',
    );
    expect(result).toEqual({
      side: 'long',
      entryPrice: 42000,
      takeProfitPrice: 45000,
      stopLossPrice: 40000,
      liquidationPrice: 38000,
    });
  });

  it('maps short side for negative position size', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, '-0.5');
    expect(result?.side).toBe('short');
  });

  it('defaults to long when positionSize is undefined', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, undefined);
    expect(result?.side).toBe('long');
  });

  it('omits optional lines when they are absent', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, '1.0');
    expect(result).toEqual({ side: 'long', entryPrice: 42000 });
    expect(result?.takeProfitPrice).toBeUndefined();
    expect(result?.stopLossPrice).toBeUndefined();
    expect(result?.liquidationPrice).toBeUndefined();
  });

  it('omits optional lines when they are non-finite', () => {
    const result = mapTpslToPositionLines(
      { entryPrice: '42000', takeProfitPrice: 'invalid', stopLossPrice: '' },
      '1.0',
    );
    expect(result?.takeProfitPrice).toBeUndefined();
    expect(result?.stopLossPrice).toBeUndefined();
  });

  it('uses 0 size as long', () => {
    const result = mapTpslToPositionLines({ entryPrice: '42000' }, '0');
    expect(result?.side).toBe('long');
  });
});

describe('getPerpsPositionLineColors', () => {
  it('maps the four overlay lines to the matching theme tokens (parity with the Lightweight chart)', () => {
    const colors = {
      text: { alternative: 'token-text-alternative' },
      success: { default: 'token-success-default' },
      warning: { default: 'token-warning-default' },
      error: { default: 'token-error-default' },
    } as unknown as Colors;

    expect(getPerpsPositionLineColors(colors)).toEqual({
      entry: 'token-text-alternative',
      takeProfit: 'token-success-default',
      stopLoss: 'token-warning-default',
      liquidation: 'token-error-default',
    });
  });
});

describe('getPerpsVolumeColors', () => {
  it('matches the Lightweight chart 30% opacity volume colors', () => {
    const colors = mockTheme.colors as Colors;

    expect(getPerpsVolumeColors(colors)).toEqual({
      success: hexToRgba(colors.success.default, 0.3),
      error: hexToRgba(colors.error.default, 0.3),
    });
  });
});

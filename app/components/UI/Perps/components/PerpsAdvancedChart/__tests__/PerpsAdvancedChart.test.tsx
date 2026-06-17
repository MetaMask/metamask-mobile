import React from 'react';
import { render } from '@testing-library/react-native';
import { CandlePeriod } from '@metamask/perps-controller';
import {
  default as PerpsAdvancedChart,
  mapTpslToPositionLines,
  getPerpsPositionLineColors,
} from '../PerpsAdvancedChart';
import { getPerpsVolumeColors, hexToRgba } from '../../../utils/chartColors';
import type { TPSLLines } from '../../TradingViewChart/TradingViewChart';
import type { Colors } from '../../../../../../util/theme/models';
import { mockTheme } from '../../../../../../util/theme';

const mockAdvancedChart = jest.fn((_props: unknown) => null);
const mockUsePerpsAdvancedChartAdapter = jest.fn();

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
  default: () => null,
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsAdvancedChartAdapter.mockReturnValue(mockAdapterResult);
  });

  it('passes the visible current-price token to AdvancedChart', () => {
    const volumeColors = getPerpsVolumeColors(mockTheme.colors as Colors);

    render(
      <PerpsAdvancedChart
        symbol="BTC"
        interval={CandlePeriod.OneHour}
        visibleCandleCount={100}
        height={240}
        fallbackCandleData={null}
      />,
    );

    expect(mockAdvancedChart).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPriceLineColorOverride: mockTheme.colors.text.default,
        volumeSuccessColorOverride: volumeColors.success,
        volumeErrorColorOverride: volumeColors.error,
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

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictCryptoUpDownChart from './PredictCryptoUpDownChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { Recurrence } from '../../types';
import type { PredictMarket, PredictSeries } from '../../types';

jest.mock('../../hooks/useCryptoUpDownChartData', () => ({
  useCryptoUpDownChartData: jest.fn(),
}));

jest.mock('../../../Charts/LivelineChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    LivelineChart: jest.fn((props) => (
      <View testID="mock-liveline-chart" {...props} />
    )),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

const createMockMarket = (): PredictMarket & { series: PredictSeries } =>
  ({
    id: 'market-1',
    providerId: 'polymarket',
    slug: 'btc-up-or-down-5m',
    title: 'BTC Up or Down - 5 Minutes',
    description: 'Will BTC go up or down?',
    image: 'https://example.com/btc.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    category: 'crypto',
    tags: ['crypto', 'up-or-down'],
    outcomes: [],
    liquidity: 100,
    volume: 200,
    endDate: '2026-04-09T19:45:00Z',
    series: {
      id: 's1',
      slug: 'btc-up-or-down-5m',
      title: 'BTC Up or Down - 5 Minutes',
      recurrence: '5m',
    },
  }) as PredictMarket & { series: PredictSeries };

describe('PredictCryptoUpDownChart', () => {
  const mockUseCryptoUpDownChartData = useCryptoUpDownChartData as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [{ time: 1, value: 100 }],
      value: 100,
      loading: false,
      isLive: true,
      window: 300,
    });
  });

  it('does not render LivelineChart when height is 0', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} />);

    expect(screen.queryByTestId('mock-liveline-chart')).not.toBeOnTheScreen();
  });

  it('renders LivelineChart with correct props when data is available and height is greater than 0', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} />);

    const container = screen.getByTestId(
      'predict-crypto-up-down-chart-container',
    );
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });

    const chart = screen.getByTestId('mock-liveline-chart');
    expect(chart).toBeOnTheScreen();
    expect(chart.props.data).toEqual([{ time: 1, value: 100 }]);
    expect(chart.props.value).toBe(100);
    expect(chart.props.loading).toBe(false);
    expect(chart.props.window).toBe(300);
    expect(chart.props.height).toBe(300);
    expect(chart.props.color).toBe('rgb(245, 158, 11)');
    expect(chart.props.lineWidth).toBe(2);
    expect(chart.props.grid).toBe(true);
    expect(chart.props.badge).toBe(true);
    expect(chart.props.formatValue).toBe(
      "return '$' + v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})",
    );
  });

  it('passes loading true when hook returns loading', () => {
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [],
      value: undefined,
      loading: true,
      isLive: false,
      window: 300,
    });
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} />);

    const container = screen.getByTestId(
      'predict-crypto-up-down-chart-container',
    );
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });

    const chart = screen.getByTestId('mock-liveline-chart');
    expect(chart.props.loading).toBe(true);
  });

  it('shows reference line when targetPrice is provided', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} targetPrice={50000} />);

    const container = screen.getByTestId(
      'predict-crypto-up-down-chart-container',
    );
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });

    const chart = screen.getByTestId('mock-liveline-chart');
    expect(chart.props.referenceLine).toEqual({
      value: 50000,
      label: 'Target',
    });
  });

  it('does not show reference line when targetPrice is undefined', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} />);

    const container = screen.getByTestId(
      'predict-crypto-up-down-chart-container',
    );
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });

    const chart = screen.getByTestId('mock-liveline-chart');
    expect(chart.props.referenceLine).toBeUndefined();
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictCryptoUpDownChart, {
  CRYPTO_UP_DOWN_FORMAT_TIME,
  CRYPTO_UP_DOWN_FORMAT_VALUE,
} from './PredictCryptoUpDownChart';
import { useCryptoUpDownChartData } from '../../hooks/useCryptoUpDownChartData';
import { usePredictOrderbook } from '../../hooks/usePredictOrderbook';
import {
  Recurrence,
  type PredictMarket,
  type PredictSeries,
} from '../../types';

jest.mock('../../hooks/useCryptoUpDownChartData', () => ({
  useCryptoUpDownChartData: jest.fn(),
}));

jest.mock('../../hooks/usePredictOrderbook', () => ({
  usePredictOrderbook: jest.fn(),
}));

jest.mock('../../../Charts/LivelineChart', () => {
  const { View } = jest.requireActual('react-native');
  const { forwardRef } = jest.requireActual('react');
  const MockChart = forwardRef(
    (props: Record<string, unknown>, _ref: unknown) => (
      <View testID="mock-liveline-chart" {...props} />
    ),
  );
  MockChart.displayName = 'MockLivelineChart';
  return {
    __esModule: true,
    LivelineChart: MockChart,
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
  const mockUsePredictOrderbook = usePredictOrderbook as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [{ time: 1, value: 100 }],
      value: 100,
      loading: false,
      isLive: true,
      window: 300,
    });
    mockUsePredictOrderbook.mockReturnValue({
      orderbook: null,
      loading: false,
      isConnected: false,
    });
  });

  it('does not render LivelineChart when height is 0', () => {
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} />);

    expect(screen.queryByTestId('mock-liveline-chart')).not.toBeOnTheScreen();
  });

  it('forwards chart configuration props to LivelineChart when chart data is available', () => {
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
    expect(chart.props.hideControls).toBe(true);
    expect(chart.props.badge).toBe(false);
    expect(chart.props.momentum).toBe(false);
    expect(chart.props.padding).toEqual({ top: 8, right: 64, bottom: 48 });
    expect(chart.props.formatValue).toBe(CRYPTO_UP_DOWN_FORMAT_VALUE);
    expect(chart.props.formatTime).toBe(CRYPTO_UP_DOWN_FORMAT_TIME);
  });

  it('passes a custom chart color to LivelineChart', () => {
    const market = createMockMarket();

    render(
      <PredictCryptoUpDownChart market={market} color="rgb(247, 147, 26)" />,
    );

    const container = screen.getByTestId(
      'predict-crypto-up-down-chart-container',
    );
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });

    expect(screen.getByTestId('mock-liveline-chart').props.color).toBe(
      'rgb(247, 147, 26)',
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

  it('keeps momentum disabled when value is above target', () => {
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [{ time: 1, value: 51000 }],
      value: 51000,
      loading: false,
      isLive: true,
      window: 300,
    });
    const market = createMockMarket();

    render(<PredictCryptoUpDownChart market={market} targetPrice={50000} />);

    const container = screen.getByTestId(
      'predict-crypto-up-down-chart-container',
    );
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { height: 300 } },
    });

    expect(screen.getByTestId('mock-liveline-chart').props.momentum).toBe(
      false,
    );
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

  it('reports zero and negative current prices after loading completes', () => {
    const market = createMockMarket();
    const onCurrentPriceChange = jest.fn();

    mockUseCryptoUpDownChartData.mockReturnValueOnce({
      data: [{ time: 1, value: 0 }],
      value: 0,
      loading: false,
      isLive: true,
      window: 300,
    });

    const { rerender } = render(
      <PredictCryptoUpDownChart
        market={market}
        onCurrentPriceChange={onCurrentPriceChange}
      />,
    );

    expect(onCurrentPriceChange).toHaveBeenCalledWith(0);

    mockUseCryptoUpDownChartData.mockReturnValueOnce({
      data: [{ time: 2, value: -1 }],
      value: -1,
      loading: false,
      isLive: true,
      window: 300,
    });

    rerender(
      <PredictCryptoUpDownChart
        market={market}
        onCurrentPriceChange={onCurrentPriceChange}
      />,
    );

    expect(onCurrentPriceChange).toHaveBeenCalledWith(-1);
  });

  it('does not report placeholder current price while loading', () => {
    const market = createMockMarket();
    const onCurrentPriceChange = jest.fn();

    mockUseCryptoUpDownChartData.mockReturnValueOnce({
      data: [],
      value: 0,
      loading: true,
      isLive: true,
      window: 300,
    });

    render(
      <PredictCryptoUpDownChart
        market={market}
        onCurrentPriceChange={onCurrentPriceChange}
      />,
    );

    expect(onCurrentPriceChange).not.toHaveBeenCalled();
  });

  it('does not report placeholder current price without chart data', () => {
    const market = createMockMarket();
    const onCurrentPriceChange = jest.fn();

    mockUseCryptoUpDownChartData.mockReturnValueOnce({
      data: [],
      value: 0,
      loading: false,
      isLive: false,
      window: 300,
    });

    render(
      <PredictCryptoUpDownChart
        market={market}
        onCurrentPriceChange={onCurrentPriceChange}
      />,
    );

    expect(onCurrentPriceChange).not.toHaveBeenCalled();
  });

  describe('orderbook wiring', () => {
    const marketWithYesToken = (): PredictMarket & { series: PredictSeries } =>
      ({
        ...createMockMarket(),
        outcomes: [
          {
            id: 'outcome-1',
            providerId: 'polymarket',
            marketId: 'market-1',
            title: 'Up',
            description: '',
            image: '',
            status: 'open',
            tokens: [
              { id: 'yes-token-id', title: 'Up', price: 0.5, status: 'open' },
              { id: 'no-token-id', title: 'Down', price: 0.5, status: 'open' },
            ],
            volume: 0,
            groupItemTitle: '',
          },
        ],
      }) as unknown as PredictMarket & { series: PredictSeries };

    it("invokes usePredictOrderbook with the YES outcome token's id", () => {
      const market = marketWithYesToken();

      render(<PredictCryptoUpDownChart market={market} />);

      expect(mockUsePredictOrderbook).toHaveBeenCalledWith('yes-token-id');
    });

    it('invokes usePredictOrderbook with undefined when the market has no outcomes', () => {
      const market = createMockMarket();

      render(<PredictCryptoUpDownChart market={market} />);

      expect(mockUsePredictOrderbook).toHaveBeenCalledWith(undefined);
    });

    it('forwards the orderbook prop to LivelineChart when the hook returns data', () => {
      const market = marketWithYesToken();
      const orderbook = {
        bids: [[0.45, 100] as [number, number]],
        asks: [[0.55, 100] as [number, number]],
      };
      mockUsePredictOrderbook.mockReturnValue({
        orderbook,
        loading: false,
        isConnected: true,
      });

      render(<PredictCryptoUpDownChart market={market} />);

      const container = screen.getByTestId(
        'predict-crypto-up-down-chart-container',
      );
      fireEvent(container, 'layout', {
        nativeEvent: { layout: { height: 300 } },
      });

      const chart = screen.getByTestId('mock-liveline-chart');
      expect(chart.props.orderbook).toBe(orderbook);
    });

    it('passes orderbook=undefined to LivelineChart when the hook returns null', () => {
      const market = marketWithYesToken();
      mockUsePredictOrderbook.mockReturnValue({
        orderbook: null,
        loading: true,
        isConnected: false,
      });

      render(<PredictCryptoUpDownChart market={market} />);

      const container = screen.getByTestId(
        'predict-crypto-up-down-chart-container',
      );
      fireEvent(container, 'layout', {
        nativeEvent: { layout: { height: 300 } },
      });

      const chart = screen.getByTestId('mock-liveline-chart');
      expect(chart.props.orderbook).toBeUndefined();
    });
  });

  describe('CRYPTO_UP_DOWN_FORMAT_VALUE', () => {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const formatValue = new Function('v', CRYPTO_UP_DOWN_FORMAT_VALUE) as (
      v: number,
    ) => string;

    it.each([
      [0, '$0'],
      [0.05, '$0'],
      [0.5, '$1'],
      [1, '$1'],
      [999.5, '$1,000'],
      [1000, '$1,000'],
      [12345.6, '$12,346'],
      [1234567.89, '$1,234,568'],
      [1000000, '$1,000,000'],
      [-0.5, '-$1'],
      [-1234567.89, '-$1,234,568'],
    ])('formats %p as %p', (input, expected) => {
      expect(formatValue(input)).toBe(expected);
    });
  });

  describe('CRYPTO_UP_DOWN_FORMAT_TIME', () => {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const formatTime = new Function('t', CRYPTO_UP_DOWN_FORMAT_TIME) as (
      t: number,
    ) => string;

    // Tests are TZ-agnostic: inputs are constructed from local-time Date
    // objects so the formatter's `getHours()` (local time) round-trips to
    // the expected 12-hour `h:mm:ss` output regardless of the test
    // machine's timezone.
    const toUnixSeconds = (
      year: number,
      month: number,
      day: number,
      hours: number,
      minutes: number,
      seconds: number,
    ) => new Date(year, month, day, hours, minutes, seconds).getTime() / 1000;

    it.each([
      ['midnight local', toUnixSeconds(2024, 0, 1, 0, 0, 0), '12:00:00'],
      ['noon local', toUnixSeconds(2024, 0, 1, 12, 0, 0), '12:00:00'],
      ['1:30:45 PM local', toUnixSeconds(2024, 0, 1, 13, 30, 45), '1:30:45'],
      ['9:05:07 AM local', toUnixSeconds(2024, 0, 1, 9, 5, 7), '9:05:07'],
      ['11:59:59 PM local', toUnixSeconds(2024, 0, 1, 23, 59, 59), '11:59:59'],
    ])('formats %s as %p', (_label, input, expected) => {
      expect(formatTime(input)).toBe(expected);
    });
  });
});

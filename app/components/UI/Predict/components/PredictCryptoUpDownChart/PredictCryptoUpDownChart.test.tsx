import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PredictCryptoUpDownChart from './PredictCryptoUpDownChart';
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
      error: null,
      isConnected: false,
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
    expect(chart.props.hideControls).toBe(true);
    expect(chart.props.badge).toBe(false);
    expect(chart.props.padding).toEqual({ top: 12, right: 64, bottom: 48 });
    expect(chart.props.formatValue).toBe(
      "const sign = v < 0 ? '-' : ''; const intStr = Math.round(Math.abs(v)).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ','); return sign + '$' + intStr",
    );
    expect(chart.props.formatTime).toBe(
      "const d=new Date(t*1000);const h=d.getHours()%12||12;const m=String(d.getMinutes()).padStart(2,'0');const s=String(d.getSeconds()).padStart(2,'0');return h+':'+m+':'+s",
    );
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
        error: null,
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
        error: null,
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
});

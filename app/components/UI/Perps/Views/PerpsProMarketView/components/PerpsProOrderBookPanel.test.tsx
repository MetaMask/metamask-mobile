import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import PerpsProOrderBookPanel from './PerpsProOrderBookPanel';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import type { OrderBookData } from '../../../hooks/stream/usePerpsLiveOrderBook';
import {
  ImpactMoment,
  playImpact,
  playSelection,
} from '../../../../../../util/haptics';

const mockUsePerpsLiveOrderBook = jest.fn();
const mockReconnect = jest.fn();
const mockSaveGrouping = jest.fn();
const mockSavedGroupingBySymbol: Record<string, number | undefined> = {};

jest.mock('../../../../../../util/haptics');

jest.mock('../../../hooks/stream/usePerpsLiveOrderBook', () => ({
  usePerpsLiveOrderBook: (params: unknown) => mockUsePerpsLiveOrderBook(params),
}));

jest.mock('../../../hooks/usePerpsOrderBookGrouping', () => ({
  usePerpsOrderBookGrouping: (symbol: string) => ({
    savedGrouping: mockSavedGroupingBySymbol[symbol],
    saveGrouping: mockSaveGrouping,
  }),
}));

const mockOrderBook: OrderBookData = {
  bids: [
    {
      price: '50000',
      size: '1.5',
      total: '1.5',
      notional: '75000',
      totalNotional: '75000',
    },
    {
      price: '49900',
      size: '2.0',
      total: '3.5',
      notional: '99800',
      totalNotional: '174800',
    },
  ],
  asks: [
    {
      price: '50100',
      size: '1.2',
      total: '1.2',
      notional: '60120',
      totalNotional: '60120',
    },
    {
      price: '50200',
      size: '1.8',
      total: '3.0',
      notional: '90360',
      totalNotional: '150480',
    },
  ],
  spread: '100',
  spreadPercentage: '0.2',
  midPrice: '50050',
  // Fixed epoch (2023-11-14T22:13:20.000Z) — no test asserts on this value,
  // but a pinned constant keeps the fixture deterministic across runs.
  lastUpdated: 1700000000000,
  maxTotal: '3.5',
};

describe('PerpsProOrderBookPanel', () => {
  const testID = PerpsProMarketViewSelectorsIDs.ORDER_BOOK_PANEL;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockSavedGroupingBySymbol).forEach((key) => {
      delete mockSavedGroupingBySymbol[key];
    });
    mockUsePerpsLiveOrderBook.mockImplementation(
      (params: { channel?: string }) => {
        if (params.channel === 'orderBookAggregated') {
          return {
            orderBook: mockOrderBook,
            isLoading: false,
            error: null,
            connectionStatus: 'connected',
            reconnect: mockReconnect,
          };
        }
        return {
          orderBook: mockOrderBook,
          isLoading: false,
          error: null,
          connectionStatus: 'connected',
          reconnect: mockReconnect,
        };
      },
    );
  });

  it('subscribes to both raw and aggregated order-book channels', () => {
    renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    const channels = mockUsePerpsLiveOrderBook.mock.calls.map(
      (call) => call[0].channel ?? 'orderBook',
    );
    expect(channels).toContain('orderBook');
    expect(channels).toContain('orderBookAggregated');
  });

  it('renders ask and bid ladder rows with a spread', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(testID)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-ask-row-0`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-bid-row-0`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-spread`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-ratio`)).toBeOnTheScreen();
  });

  it('shows a reconnect affordance when the aggregated stream errors', () => {
    mockUsePerpsLiveOrderBook.mockImplementation(
      (params: { channel?: string }) => {
        if (params.channel === 'orderBookAggregated') {
          return {
            orderBook: null,
            isLoading: false,
            error: null,
            connectionStatus: 'error',
            reconnect: mockReconnect,
          };
        }
        return {
          orderBook: mockOrderBook,
          isLoading: false,
          error: null,
          connectionStatus: 'connected',
          reconnect: mockReconnect,
        };
      },
    );

    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(`${testID}-connection-error`)).toBeOnTheScreen();
    fireEvent.press(getByTestId(`${testID}-reconnect`));
    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });

  it('hides the buy/sell view-toggle button (ladder only shows ~5 rows/side today)', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    expect(queryByTestId(`${testID}-view-toggle`)).not.toBeOnTheScreen();
    // Both sides still render by default with the toggle hidden.
    expect(getByTestId(`${testID}-ask-row-0`)).toBeOnTheScreen();
    expect(getByTestId(`${testID}-bid-row-0`)).toBeOnTheScreen();
  });

  it('shows a ladder skeleton while the aggregated book is loading', () => {
    mockUsePerpsLiveOrderBook.mockImplementation(
      (params: { channel?: string }) => {
        if (params.channel === 'orderBookAggregated') {
          return {
            orderBook: null,
            isLoading: true,
            error: null,
            connectionStatus: 'connecting',
            reconnect: mockReconnect,
          };
        }
        return {
          orderBook: null,
          isLoading: true,
          error: null,
          connectionStatus: 'connected',
          reconnect: mockReconnect,
        };
      },
    );

    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(`${testID}-skeleton`)).toBeOnTheScreen();
    expect(queryByTestId(`${testID}-ask-row-0`)).not.toBeOnTheScreen();
    expect(queryByTestId(`${testID}-reconnect`)).not.toBeOnTheScreen();
  });

  it('makes ladder rows interactive and reports the tapped price via onSelectPrice', () => {
    const onSelectPrice = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel
        symbol="BTC"
        marketPrice={50000}
        onSelectPrice={onSelectPrice}
      />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(getByTestId(`${testID}-bid-row-0`));
    expect(onSelectPrice).toHaveBeenCalledWith('50000');
    expect(playSelection).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId(`${testID}-ask-row-0`));
    // Asks render farthest-to-closest, so ask-row-0 is the deepest ask (50200).
    expect(onSelectPrice).toHaveBeenLastCalledWith('50200');
    expect(playSelection).toHaveBeenCalledTimes(2);
  });

  it('renders static, non-interactive rows when onSelectPrice is omitted', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(`${testID}-bid-row-0`)).not.toHaveProp(
      'accessibilityRole',
      'button',
    );
  });

  it('invokes onCollapse when the collapse button is pressed', () => {
    const onCollapse = jest.fn();
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel
        symbol="BTC"
        marketPrice={50000}
        onCollapse={onCollapse}
      />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(
      getByTestId(PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLLAPSE_BUTTON),
    );
    expect(onCollapse).toHaveBeenCalledTimes(1);
    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.PageNavigation);
  });

  it('plays selection when the settings icon opens the config sheet', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(getByTestId(`${testID}-grouping-trigger`));

    expect(playSelection).toHaveBeenCalledTimes(1);
  });

  it('positions collapse at the leading edge and settings at the trailing edge', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel
        symbol="BTC"
        marketPrice={50000}
        onCollapse={jest.fn()}
      />,
      { state: { engine: { backgroundState } } },
    );

    const header = getByTestId(`${testID}-header`);
    const leading = getByTestId(`${testID}-header-leading`);
    const trailing = getByTestId(`${testID}-header-trailing`);

    expect(header).toHaveStyle({
      flexDirection: 'row',
      justifyContent: 'space-between',
    });
    expect(
      within(leading).getByTestId(
        PerpsProMarketViewSelectorsIDs.ORDER_BOOK_COLLAPSE_BUTTON,
      ),
    ).toBeOnTheScreen();
    expect(
      within(trailing).getByTestId(`${testID}-grouping-trigger`),
    ).toBeOnTheScreen();
  });

  it('opens settings and saves currency, metric, and grouping', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(getByTestId(`${testID}-grouping-trigger`));
    fireEvent.press(getByTestId(`${testID}-config-sheet-currency-base`));
    fireEvent.press(getByTestId(`${testID}-config-sheet-metric-size`));
    fireEvent.press(getByTestId(`${testID}-config-sheet-grouping-100`));
    fireEvent.press(getByTestId(`${testID}-config-sheet-apply`));

    expect(mockSaveGrouping).toHaveBeenCalledWith(100);
  });

  it('shows the spread value alone, keeping the label for screen readers', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    const spreadRow = getByTestId(`${testID}-spread`);

    expect(spreadRow).toHaveTextContent('$100 (0.2%)');
    expect(queryByText('Spread')).not.toBeOnTheScreen();
    expect(
      within(spreadRow).getByLabelText('Spread $100 (0.2%)'),
    ).toBeOnTheScreen();
  });

  it('shows the depth ratio as +/- percentages, keeping buy/sell for screen readers', () => {
    const { getByTestId, queryByText } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    const buySide = getByTestId(`${testID}-buy-percent`);
    const sellSide = getByTestId(`${testID}-sell-percent`);

    expect(buySide).toHaveTextContent('54%');
    expect(sellSide).toHaveTextContent('46%');
    expect(queryByText(/Buy: /u)).not.toBeOnTheScreen();
    expect(queryByText(/Sell: /u)).not.toBeOnTheScreen();
    expect(buySide).toHaveProp('accessibilityLabel', 'Buy: 54%');
    expect(sellSide).toHaveProp('accessibilityLabel', 'Sell: 46%');
  });

  it('abbreviates large size values instead of printing every digit', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    // totalNotional 174800 for the deepest bid.
    expect(getByTestId(`${testID}-bid-row-1-value`)).toHaveTextContent(
      '$174.8K',
    );
  });

  it('abbreviates ladder prices to the scale the grouping makes redundant', () => {
    // Grouping by 1,000 fixes the last three digits, so "$69,000" spent three
    // characters per row on padding that never changes.
    mockSavedGroupingBySymbol.BTC = 1000;

    const btcOrderBook: OrderBookData = {
      ...mockOrderBook,
      midPrice: '64500',
      bids: [
        { ...mockOrderBook.bids[0], price: '64000' },
        { ...mockOrderBook.bids[1], price: '63000' },
      ],
      asks: [
        { ...mockOrderBook.asks[0], price: '65000' },
        { ...mockOrderBook.asks[1], price: '66000' },
      ],
    };
    mockUsePerpsLiveOrderBook.mockImplementation(() => ({
      orderBook: btcOrderBook,
      isLoading: false,
      error: null,
      connectionStatus: 'connected',
      reconnect: mockReconnect,
    }));

    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel
        symbol="BTC"
        marketPrice={64500}
        szDecimals={5}
      />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(`${testID}-bid-row-0-price`)).toHaveTextContent('$64K');
    expect(getByTestId(`${testID}-bid-row-1-price`)).toHaveTextContent('$63K');
    expect(getByTestId(`${testID}-ask-row-0-price`)).toHaveTextContent('$66K');
  });

  it('keeps the grouping step visible when it needs decimals to survive', () => {
    // BTC's default grouping of 10 is the Figma reference ladder: "$61.47K".
    const btcOrderBook: OrderBookData = {
      ...mockOrderBook,
      midPrice: '61470',
      bids: [
        { ...mockOrderBook.bids[0], price: '61470' },
        { ...mockOrderBook.bids[1], price: '61460' },
      ],
      asks: [
        { ...mockOrderBook.asks[0], price: '61480' },
        { ...mockOrderBook.asks[1], price: '61490' },
      ],
    };
    mockUsePerpsLiveOrderBook.mockImplementation(() => ({
      orderBook: btcOrderBook,
      isLoading: false,
      error: null,
      connectionStatus: 'connected',
      reconnect: mockReconnect,
    }));

    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel
        symbol="BTC"
        marketPrice={61470}
        szDecimals={5}
      />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(`${testID}-bid-row-0-price`)).toHaveTextContent(
      '$61.47K',
    );
    expect(getByTestId(`${testID}-bid-row-1-price`)).toHaveTextContent(
      '$61.46K',
    );
  });

  it('renders every low-priced level at one precision so none collapse', () => {
    // PUMP-style ladder: magnitude formatting stripped trailing zeros, so
    // "0.0021" rendered two digits shorter than its neighbours.
    const pumpOrderBook: OrderBookData = {
      ...mockOrderBook,
      midPrice: '0.0021',
      bids: [
        { ...mockOrderBook.bids[0], price: '0.002099' },
        { ...mockOrderBook.bids[1], price: '0.0021' },
      ],
      asks: [
        { ...mockOrderBook.asks[0], price: '0.002101' },
        { ...mockOrderBook.asks[1], price: '0.002102' },
      ],
    };
    mockUsePerpsLiveOrderBook.mockImplementation(() => ({
      orderBook: pumpOrderBook,
      isLoading: false,
      error: null,
      connectionStatus: 'connected',
      reconnect: mockReconnect,
    }));

    const { getByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel
        symbol="PUMP"
        marketPrice={0.0021}
        szDecimals={0}
      />,
      { state: { engine: { backgroundState } } },
    );

    expect(getByTestId(`${testID}-bid-row-0-price`)).toHaveTextContent(
      '$0.002099',
    );
    expect(getByTestId(`${testID}-bid-row-1-price`)).toHaveTextContent(
      '$0.002100',
    );
  });

  it('resets grouping to the new market preference when symbol changes', () => {
    mockSavedGroupingBySymbol.ETH = 1;

    const ethOrderBook: OrderBookData = {
      ...mockOrderBook,
      midPrice: '3000',
      bids: [{ ...mockOrderBook.bids[0], price: '2990' }],
      asks: [{ ...mockOrderBook.asks[0], price: '3010' }],
      spread: '20',
      spreadPercentage: '0.67',
    };

    const { getByTestId, rerender } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    fireEvent.press(getByTestId(`${testID}-grouping-trigger`));
    fireEvent.press(getByTestId(`${testID}-config-sheet-grouping-100`));
    fireEvent.press(getByTestId(`${testID}-config-sheet-apply`));

    mockUsePerpsLiveOrderBook.mockImplementation(
      (params: { channel?: string }) => {
        if (params.channel === 'orderBookAggregated') {
          return {
            orderBook: ethOrderBook,
            isLoading: false,
            error: null,
            connectionStatus: 'connected',
            reconnect: mockReconnect,
          };
        }
        return {
          orderBook: ethOrderBook,
          isLoading: false,
          error: null,
          connectionStatus: 'connected',
          reconnect: mockReconnect,
        };
      },
    );

    rerender(<PerpsProOrderBookPanel symbol="ETH" marketPrice={3000} />);

    const aggregatedCalls = mockUsePerpsLiveOrderBook.mock.calls.filter(
      (call) => call[0].channel === 'orderBookAggregated',
    );
    const lastAggregatedCall = aggregatedCalls[aggregatedCalls.length - 1][0];

    // ETH @ $3k with saved grouping 1 → nSigFigs 4. Stale BTC 100 would be 2.
    expect(lastAggregatedCall).toMatchObject({
      symbol: 'ETH',
      nSigFigs: 4,
    });
  });
});

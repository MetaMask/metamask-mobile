import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsProOrderBookPanel from './PerpsProOrderBookPanel';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import type { OrderBookData } from '../../../hooks/stream/usePerpsLiveOrderBook';

const mockUsePerpsLiveOrderBook = jest.fn();
const mockReconnect = jest.fn();
const mockSaveGrouping = jest.fn();
const mockSavedGroupingBySymbol: Record<string, number | undefined> = {};

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
  lastUpdated: Date.now(),
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

  it('cycles the view mode when the toggle is pressed', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <PerpsProOrderBookPanel symbol="BTC" marketPrice={50000} />,
      { state: { engine: { backgroundState } } },
    );

    const toggle = getByTestId(`${testID}-view-toggle`);

    // default → buy (asks hidden)
    fireEvent.press(toggle);
    expect(queryByTestId(`${testID}-ask-row-0`)).not.toBeOnTheScreen();
    expect(getByTestId(`${testID}-bid-row-0`)).toBeOnTheScreen();

    // buy → sell (bids hidden)
    fireEvent.press(toggle);
    expect(getByTestId(`${testID}-ask-row-0`)).toBeOnTheScreen();
    expect(queryByTestId(`${testID}-bid-row-0`)).not.toBeOnTheScreen();
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

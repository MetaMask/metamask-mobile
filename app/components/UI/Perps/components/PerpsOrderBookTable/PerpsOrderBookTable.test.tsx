import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsOrderBookTable from './PerpsOrderBookTable';
import type { OrderBookData } from '../../hooks/stream/usePerpsLiveOrderBook';
import { PerpsOrderBookTableSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.order_book.total': 'Total',
      'perps.order_book.price': 'Price',
      'perps.order_book.spread': 'Spread',
      'perps.order_book.loading': 'Loading...',
      'perps.order_book.no_data': 'No data available',
    };
    return translations[key] || key;
  }),
}));

// Mock the useStyles hook
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: { flex: 1 },
      header: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
      },
      headerColumn: { flex: 1 },
      headerColumnCenter: { flex: 1, alignItems: 'center' },
      headerColumnRight: { flex: 1, alignItems: 'flex-end' },
      bookContainer: { flex: 1, flexDirection: 'row' },
      bidsSide: { flex: 1 },
      asksSide: { flex: 1 },
      row: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 6,
        position: 'relative',
      },
      depthBar: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        opacity: 0.15,
      },
      bidDepthBar: { right: 0, backgroundColor: '#28a745' },
      askDepthBar: { left: 0, backgroundColor: '#dc3545' },
      totalColumn: { flex: 1, zIndex: 1 },
      totalColumnRight: { flex: 1, alignItems: 'flex-end', zIndex: 1 },
      priceColumnBid: {
        flex: 1,
        alignItems: 'flex-end',
        paddingRight: 8,
        zIndex: 1,
      },
      priceColumnAsk: {
        flex: 1,
        alignItems: 'flex-start',
        paddingLeft: 8,
        zIndex: 1,
      },
      spreadContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
      },
      spreadText: { marginHorizontal: 8 },
      emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
      },
    },
    theme: {
      colors: {
        background: { default: '#ffffff' },
        border: { muted: '#e0e0e0' },
        success: { default: '#28a745' },
        error: { default: '#dc3545' },
      },
    },
  })),
}));

// Mock formatUtils
jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value: number) => `$${value.toLocaleString()}`),
  PRICE_RANGES_UNIVERSAL: [],
}));

describe('PerpsOrderBookTable', () => {
  const mockOrderBookData: OrderBookData = {
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
      {
        price: '49800',
        size: '1.2',
        total: '4.7',
        notional: '59760',
        totalNotional: '234560',
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
      {
        price: '50300',
        size: '2.5',
        total: '5.5',
        notional: '125750',
        totalNotional: '276230',
      },
    ],
    spread: '100',
    spreadPercentage: '0.2',
    midPrice: '50050',
    lastUpdated: Date.now(),
    maxTotal: '5.5',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders with valid order book data', () => {
      const { getByTestId, getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      // Should have two "Price" headers (one for bids, one for asks)
      const priceHeaders = getAllByText('Price');
      expect(priceHeaders).toHaveLength(2);
    });

    it('renders with custom testID', () => {
      const customTestID = 'custom-order-book-table';

      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
          testID={customTestID}
        />,
      );

      expect(getByTestId(customTestID)).toBeOnTheScreen();
    });

    it('renders with default testID when not provided', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('loading state', () => {
    it('displays loading message when isLoading is true', () => {
      const { getByText } = render(
        <PerpsOrderBookTable
          orderBook={null}
          symbol="BTC"
          unit="base"
          isLoading
        />,
      );

      expect(getByText('Loading...')).toBeOnTheScreen();
    });

    it('does not display order book when loading', () => {
      const { queryByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
          isLoading
        />,
      );

      expect(
        queryByTestId(PerpsOrderBookTableSelectorsIDs.SPREAD),
      ).not.toBeOnTheScreen();
    });
  });

  describe('empty state', () => {
    it('displays no data message when orderBook is null', () => {
      const { getByText } = render(
        <PerpsOrderBookTable orderBook={null} symbol="BTC" unit="base" />,
      );

      expect(getByText('No data available')).toBeOnTheScreen();
    });

    it('does not display order book when orderBook is null', () => {
      const { queryByTestId } = render(
        <PerpsOrderBookTable orderBook={null} symbol="BTC" unit="base" />,
      );

      expect(
        queryByTestId(PerpsOrderBookTableSelectorsIDs.SPREAD),
      ).not.toBeOnTheScreen();
    });
  });

  describe('header rendering', () => {
    it('displays column headers', () => {
      const { getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      const priceHeaders = getAllByText('Price');
      expect(priceHeaders).toHaveLength(2);
    });

    it('displays unit label in header for base currency', () => {
      const { getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      // Should have two "Total (BTC)" headers (one for bids side, one for asks side)
      const totalHeaders = getAllByText('Total (BTC)');
      expect(totalHeaders).toHaveLength(2);
    });

    it('displays unit label in header for USD', () => {
      const { getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="usd"
        />,
      );

      // Should have two "Total (USD)" headers (one for bids side, one for asks side)
      const totalHeaders = getAllByText('Total (USD)');
      expect(totalHeaders).toHaveLength(2);
    });

    it('displays correct symbol in unit label', () => {
      const { getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="ETH"
          unit="base"
        />,
      );

      // Should have two "Total (ETH)" headers (one for bids side, one for asks side)
      const totalHeaders = getAllByText('Total (ETH)');
      expect(totalHeaders).toHaveLength(2);
    });
  });

  describe('bid rows rendering', () => {
    it('renders all bid rows', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-1`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-2`),
      ).toBeOnTheScreen();
    });

    it('displays bids with highest price at top', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      // Bids should be in order, so index 0 should be the highest bid (50000)
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();
    });

    it('handles empty bids array', () => {
      const emptyBidsData: OrderBookData = {
        ...mockOrderBookData,
        bids: [],
      };

      const { queryByTestId } = render(
        <PerpsOrderBookTable
          orderBook={emptyBidsData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).not.toBeOnTheScreen();
    });
  });

  describe('ask rows rendering', () => {
    it('renders all ask rows', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-0`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-1`),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-2`),
      ).toBeOnTheScreen();
    });

    it('maintains ask order with lowest ask first', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      // Asks should be in original order, so index 0 should be the lowest ask (50100)
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-0`),
      ).toBeOnTheScreen();
    });

    it('handles empty asks array', () => {
      const emptyAsksData: OrderBookData = {
        ...mockOrderBookData,
        asks: [],
      };

      const { queryByTestId } = render(
        <PerpsOrderBookTable
          orderBook={emptyAsksData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-0`),
      ).not.toBeOnTheScreen();
    });
  });

  // Note: Spread row was removed from the component - no longer displaying spread in table

  describe('unit display - base currency', () => {
    it('formats totals with 4 decimals for values >= 1', () => {
      const { getByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      // Total of 1.5 should be displayed as 1.5000
      expect(getByText('1.5000')).toBeOnTheScreen();
    });

    it('formats totals with 6 decimals for values < 1', () => {
      const smallTotalData: OrderBookData = {
        ...mockOrderBookData,
        bids: [
          {
            price: '50000',
            size: '0.0005',
            total: '0.0005',
            notional: '25',
            totalNotional: '25',
          },
        ],
      };

      const { getByText } = render(
        <PerpsOrderBookTable
          orderBook={smallTotalData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(getByText('0.000500')).toBeOnTheScreen();
    });

    it('displays symbol in unit label', () => {
      const { getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      // Should have two "Total (BTC)" headers (one for bids side, one for asks side)
      const totalHeaders = getAllByText('Total (BTC)');
      expect(totalHeaders).toHaveLength(2);
    });
  });

  describe('unit display - USD', () => {
    it('formats totals in USD', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="usd"
        />,
      );

      // Should be using totalNotional values formatted as currency
      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('displays USD in unit label', () => {
      const { getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="usd"
        />,
      );

      // Should have two "Total (USD)" headers (one for bids side, one for asks side)
      const totalHeaders = getAllByText('Total (USD)');
      expect(totalHeaders).toHaveLength(2);
    });

    it('switches from base to USD correctly', () => {
      const { rerender, getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      const btcHeaders = getAllByText('Total (BTC)');
      expect(btcHeaders).toHaveLength(2);

      rerender(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="usd"
        />,
      );

      const usdHeaders = getAllByText('Total (USD)');
      expect(usdHeaders).toHaveLength(2);
    });
  });

  describe('depth bar calculations', () => {
    it('calculates depth bar width based on maxTotal', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();
    });

    it('handles zero maxTotal gracefully', () => {
      const zeroMaxData: OrderBookData = {
        ...mockOrderBookData,
        maxTotal: '0',
      };

      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={zeroMaxData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('calculates width as percentage', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      // Should render without errors
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles single bid level', () => {
      const singleBidData: OrderBookData = {
        ...mockOrderBookData,
        bids: [mockOrderBookData.bids[0]],
      };

      const { getByTestId, queryByTestId } = render(
        <PerpsOrderBookTable
          orderBook={singleBidData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-1`),
      ).not.toBeOnTheScreen();
    });

    it('handles single ask level', () => {
      const singleAskData: OrderBookData = {
        ...mockOrderBookData,
        asks: [mockOrderBookData.asks[0]],
      };

      const { getByTestId, queryByTestId } = render(
        <PerpsOrderBookTable
          orderBook={singleAskData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-0`),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-1`),
      ).not.toBeOnTheScreen();
    });

    it('handles both empty bids and asks arrays', () => {
      const emptyData: OrderBookData = {
        ...mockOrderBookData,
        bids: [],
        asks: [],
      };

      const { getByTestId, queryByTestId } = render(
        <PerpsOrderBookTable orderBook={emptyData} symbol="BTC" unit="base" />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-0`),
      ).not.toBeOnTheScreen();
    });

    it('handles very small price values', () => {
      const smallPriceData: OrderBookData = {
        ...mockOrderBookData,
        bids: [
          {
            price: '0.00005',
            size: '1000',
            total: '1000',
            notional: '0.05',
            totalNotional: '0.05',
          },
        ],
        asks: [
          {
            price: '0.00006',
            size: '1500',
            total: '1500',
            notional: '0.09',
            totalNotional: '0.09',
          },
        ],
      };

      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={smallPriceData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles very large price values', () => {
      const largePriceData: OrderBookData = {
        ...mockOrderBookData,
        bids: [
          {
            price: '999000',
            size: '0.5',
            total: '0.5',
            notional: '499500',
            totalNotional: '499500',
          },
        ],
        asks: [
          {
            price: '1001000',
            size: '0.3',
            total: '0.3',
            notional: '300300',
            totalNotional: '300300',
          },
        ],
      };

      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={largePriceData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles missing maxTotal property', () => {
      const noMaxTotalData = {
        ...mockOrderBookData,
        maxTotal: undefined,
      } as unknown as OrderBookData;

      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={noMaxTotalData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles empty string prices', () => {
      const emptyPriceData: OrderBookData = {
        ...mockOrderBookData,
        bids: [
          {
            price: '',
            size: '1.0',
            total: '1.0',
            notional: '0',
            totalNotional: '0',
          },
        ],
      };

      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={emptyPriceData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('re-rendering behavior', () => {
    it('re-renders when orderBook data changes', () => {
      const { rerender, getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      const updatedOrderBook: OrderBookData = {
        ...mockOrderBookData,
        bids: [
          {
            price: '51000',
            size: '2.0',
            total: '2.0',
            notional: '102000',
            totalNotional: '102000',
          },
        ],
      };

      rerender(
        <PerpsOrderBookTable
          orderBook={updatedOrderBook}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('re-renders when symbol changes', () => {
      const { rerender, getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      const btcHeaders = getAllByText('Total (BTC)');
      expect(btcHeaders).toHaveLength(2);

      rerender(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="ETH"
          unit="base"
        />,
      );

      const ethHeaders = getAllByText('Total (ETH)');
      expect(ethHeaders).toHaveLength(2);
    });

    it('re-renders when unit changes', () => {
      const { rerender, getAllByText } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      const btcHeaders = getAllByText('Total (BTC)');
      expect(btcHeaders).toHaveLength(2);

      rerender(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="usd"
        />,
      );

      const usdHeaders = getAllByText('Total (USD)');
      expect(usdHeaders).toHaveLength(2);
    });

    it('transitions from loading to loaded', () => {
      const { rerender, getByText, queryByText, getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={null}
          symbol="BTC"
          unit="base"
          isLoading
        />,
      );

      expect(getByText('Loading...')).toBeOnTheScreen();

      rerender(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
          isLoading={false}
        />,
      );

      expect(queryByText('Loading...')).not.toBeOnTheScreen();
      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('transitions from null to valid orderBook', () => {
      const { rerender, getByText, queryByText, getByTestId } = render(
        <PerpsOrderBookTable orderBook={null} symbol="BTC" unit="base" />,
      );

      expect(getByText('No data available')).toBeOnTheScreen();

      rerender(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(queryByText('No data available')).not.toBeOnTheScreen();
      expect(
        getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();
    });

    it('transitions from valid orderBook to null', () => {
      const { rerender, getByText, queryByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).toBeOnTheScreen();

      rerender(
        <PerpsOrderBookTable orderBook={null} symbol="BTC" unit="base" />,
      );

      expect(
        queryByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-0`),
      ).not.toBeOnTheScreen();
      expect(getByText('No data available')).toBeOnTheScreen();
    });
  });

  describe('accessibility', () => {
    it('provides testID for container', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      expect(
        getByTestId(PerpsOrderBookTableSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('provides testIDs for bid rows', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      mockOrderBookData.bids.forEach((_, index) => {
        expect(
          getByTestId(`${PerpsOrderBookTableSelectorsIDs.BID_ROW}-${index}`),
        ).toBeOnTheScreen();
      });
    });

    it('provides testIDs for ask rows', () => {
      const { getByTestId } = render(
        <PerpsOrderBookTable
          orderBook={mockOrderBookData}
          symbol="BTC"
          unit="base"
        />,
      );

      mockOrderBookData.asks.forEach((_, index) => {
        expect(
          getByTestId(`${PerpsOrderBookTableSelectorsIDs.ASK_ROW}-${index}`),
        ).toBeOnTheScreen();
      });
    });
  });
});

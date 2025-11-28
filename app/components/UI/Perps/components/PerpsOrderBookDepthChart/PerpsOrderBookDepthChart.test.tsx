import React from 'react';
import { render } from '@testing-library/react-native';
import PerpsOrderBookDepthChart from './PerpsOrderBookDepthChart';
import type { OrderBookData } from '../../hooks/stream/usePerpsLiveOrderBook';
import { PerpsOrderBookDepthChartSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock the strings function
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'perps.order_book.bids': 'Bids',
      'perps.order_book.asks': 'Asks',
    };
    return translations[key] || key;
  }),
}));

// Mock the useStyles hook
jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 8,
        overflow: 'hidden',
      },
      chartContainer: {
        position: 'relative',
      },
      labelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
      },
      midPriceContainer: {
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor: '#e0e0e0',
      },
      legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 8,
      },
      legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      },
      legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
      },
      bidDot: {
        backgroundColor: '#28a745',
      },
      askDot: {
        backgroundColor: '#dc3545',
      },
    },
    theme: {
      colors: {
        background: {
          default: '#ffffff',
        },
        border: {
          default: '#e0e0e0',
        },
        success: {
          default: '#28a745',
        },
        error: {
          default: '#dc3545',
        },
      },
    },
  })),
}));

// Mock formatUtils
jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value: number) => `$${value.toLocaleString()}`),
  PRICE_RANGES_UNIVERSAL: [],
}));

describe('PerpsOrderBookDepthChart', () => {
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
      const { getByTestId, getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByText('Bids')).toBeOnTheScreen();
      expect(getByText('Asks')).toBeOnTheScreen();
    });

    it('returns null when orderBook is null', () => {
      const { queryByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={null} />,
      );

      expect(
        queryByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeNull();
    });

    it('renders with custom testID', () => {
      const customTestID = 'custom-depth-chart';

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart
          orderBook={mockOrderBookData}
          testID={customTestID}
        />,
      );

      expect(getByTestId(customTestID)).toBeOnTheScreen();
    });

    it('renders with default testID when not provided', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders with custom height', () => {
      const customHeight = 200;

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart
          orderBook={mockOrderBookData}
          height={customHeight}
        />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders with default height when not provided', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('legend rendering', () => {
    it('displays bids legend label', () => {
      const { getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(getByText('Bids')).toBeOnTheScreen();
    });

    it('displays asks legend label', () => {
      const { getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(getByText('Asks')).toBeOnTheScreen();
    });
  });

  describe('price labels', () => {
    it('displays min price label', () => {
      const { getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      // Min price is from lowest bid
      expect(getByText('$49,800')).toBeOnTheScreen();
    });

    it('displays mid price label', () => {
      const { getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(getByText('$50,050')).toBeOnTheScreen();
    });

    it('displays max price label', () => {
      const { getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      // Max price is from highest ask
      expect(getByText('$50,300')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('handles empty bids array', () => {
      const emptyBidsData: OrderBookData = {
        ...mockOrderBookData,
        bids: [],
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={emptyBidsData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles empty asks array', () => {
      const emptyAsksData: OrderBookData = {
        ...mockOrderBookData,
        asks: [],
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={emptyAsksData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles both empty bids and asks arrays', () => {
      const emptyData: OrderBookData = {
        ...mockOrderBookData,
        bids: [],
        asks: [],
      };

      const { getByTestId, getByText } = render(
        <PerpsOrderBookDepthChart orderBook={emptyData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      // Mid price should still be displayed
      expect(getByText('$50,050')).toBeOnTheScreen();
    });

    it('handles single bid level', () => {
      const singleBidData: OrderBookData = {
        ...mockOrderBookData,
        bids: [mockOrderBookData.bids[0]],
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={singleBidData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles single ask level', () => {
      const singleAskData: OrderBookData = {
        ...mockOrderBookData,
        asks: [mockOrderBookData.asks[0]],
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={singleAskData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles very small price values', () => {
      const smallPriceData: OrderBookData = {
        bids: [
          {
            price: '0.00005',
            size: '1000',
            total: '1000',
            notional: '0.05',
            totalNotional: '0.05',
          },
          {
            price: '0.00004',
            size: '2000',
            total: '3000',
            notional: '0.08',
            totalNotional: '0.13',
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
          {
            price: '0.00007',
            size: '1200',
            total: '2700',
            notional: '0.084',
            totalNotional: '0.174',
          },
        ],
        spread: '0.00001',
        spreadPercentage: '16.67',
        midPrice: '0.000055',
        lastUpdated: Date.now(),
        maxTotal: '3000',
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={smallPriceData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles very large price values', () => {
      const largePriceData: OrderBookData = {
        bids: [
          {
            price: '999000',
            size: '0.5',
            total: '0.5',
            notional: '499500',
            totalNotional: '499500',
          },
          {
            price: '998000',
            size: '1.0',
            total: '1.5',
            notional: '998000',
            totalNotional: '1497500',
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
          {
            price: '1002000',
            size: '0.8',
            total: '1.1',
            notional: '801600',
            totalNotional: '1101900',
          },
        ],
        spread: '2000',
        spreadPercentage: '0.2',
        midPrice: '1000000',
        lastUpdated: Date.now(),
        maxTotal: '1.5',
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={largePriceData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles zero total values', () => {
      const zeroTotalData: OrderBookData = {
        bids: [
          {
            price: '50000',
            size: '0',
            total: '0',
            notional: '0',
            totalNotional: '0',
          },
        ],
        asks: [
          {
            price: '50100',
            size: '0',
            total: '0',
            notional: '0',
            totalNotional: '0',
          },
        ],
        spread: '100',
        spreadPercentage: '0.2',
        midPrice: '50050',
        lastUpdated: Date.now(),
        maxTotal: '0',
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={zeroTotalData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles equal bid and ask volumes', () => {
      const equalVolumeData: OrderBookData = {
        bids: [
          {
            price: '50000',
            size: '2.0',
            total: '2.0',
            notional: '100000',
            totalNotional: '100000',
          },
        ],
        asks: [
          {
            price: '50100',
            size: '2.0',
            total: '2.0',
            notional: '100200',
            totalNotional: '100200',
          },
        ],
        spread: '100',
        spreadPercentage: '0.2',
        midPrice: '50050',
        lastUpdated: Date.now(),
        maxTotal: '2.0',
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={equalVolumeData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('chart data generation', () => {
    it('generates chart data when bids and asks exist', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles missing price values gracefully', () => {
      const missingPriceData: OrderBookData = {
        bids: [
          {
            price: '',
            size: '1.0',
            total: '1.0',
            notional: '0',
            totalNotional: '0',
          },
        ],
        asks: [
          {
            price: '50100',
            size: '1.0',
            total: '1.0',
            notional: '50100',
            totalNotional: '50100',
          },
        ],
        spread: '0',
        spreadPercentage: '0',
        midPrice: '50050',
        lastUpdated: Date.now(),
        maxTotal: '1.0',
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={missingPriceData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('generates paths for multiple bid levels', () => {
      const multipleBidsData: OrderBookData = {
        ...mockOrderBookData,
        bids: [
          {
            price: '50000',
            size: '1.0',
            total: '1.0',
            notional: '50000',
            totalNotional: '50000',
          },
          {
            price: '49900',
            size: '2.0',
            total: '3.0',
            notional: '99800',
            totalNotional: '149800',
          },
          {
            price: '49800',
            size: '1.5',
            total: '4.5',
            notional: '74700',
            totalNotional: '224500',
          },
          {
            price: '49700',
            size: '3.0',
            total: '7.5',
            notional: '149100',
            totalNotional: '373600',
          },
        ],
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={multipleBidsData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('generates paths for multiple ask levels', () => {
      const multipleAsksData: OrderBookData = {
        ...mockOrderBookData,
        asks: [
          {
            price: '50100',
            size: '1.0',
            total: '1.0',
            notional: '50100',
            totalNotional: '50100',
          },
          {
            price: '50200',
            size: '2.0',
            total: '3.0',
            notional: '100400',
            totalNotional: '150500',
          },
          {
            price: '50300',
            size: '1.5',
            total: '4.5',
            notional: '75450',
            totalNotional: '225950',
          },
          {
            price: '50400',
            size: '3.0',
            total: '7.5',
            notional: '151200',
            totalNotional: '377150',
          },
        ],
      };

      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={multipleAsksData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('dimension calculations', () => {
    it('uses default height value', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('respects custom height value', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} height={250} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles very small height values', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} height={50} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles very large height values', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} height={500} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('re-rendering behavior', () => {
    it('re-renders when orderBook data changes', () => {
      const { rerender, getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(getByText('$50,050')).toBeOnTheScreen();

      const updatedOrderBook: OrderBookData = {
        ...mockOrderBookData,
        midPrice: '51000',
      };

      rerender(<PerpsOrderBookDepthChart orderBook={updatedOrderBook} />);

      expect(getByText('$51,000')).toBeOnTheScreen();
    });

    it('re-renders when height changes', () => {
      const { rerender, getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} height={150} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      rerender(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} height={200} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('transitions from null to valid orderBook', () => {
      const { rerender, queryByTestId, getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={null} />,
      );

      expect(
        queryByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeNull();

      rerender(<PerpsOrderBookDepthChart orderBook={mockOrderBookData} />);

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('transitions from valid orderBook to null', () => {
      const { rerender, getByTestId, queryByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();

      rerender(<PerpsOrderBookDepthChart orderBook={null} />);

      expect(
        queryByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('provides testID for E2E testing', () => {
      const { getByTestId } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      expect(
        getByTestId(PerpsOrderBookDepthChartSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders text elements with proper hierarchy', () => {
      const { getByText } = render(
        <PerpsOrderBookDepthChart orderBook={mockOrderBookData} />,
      );

      // Legend labels
      expect(getByText('Bids')).toBeOnTheScreen();
      expect(getByText('Asks')).toBeOnTheScreen();

      // Price labels
      expect(getByText('$49,800')).toBeOnTheScreen();
      expect(getByText('$50,050')).toBeOnTheScreen();
      expect(getByText('$50,300')).toBeOnTheScreen();
    });
  });
});

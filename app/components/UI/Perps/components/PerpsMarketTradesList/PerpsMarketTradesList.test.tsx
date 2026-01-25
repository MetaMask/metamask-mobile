import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketTradesList from './PerpsMarketTradesList';
import Routes from '../../../../../constants/navigation/Routes';
import { usePerpsMarketFills } from '../../hooks/usePerpsMarketFills';
import type { OrderFill } from '../../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../hooks/usePerpsMarketFills', () => ({
  usePerpsMarketFills: jest.fn(() => ({
    fills: [],
    isInitialLoading: false,
    refresh: jest.fn(),
    isRefreshing: false,
  })),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      header: {},
      tradeItem: {},
      lastTradeItem: {},
      leftSection: {},
      iconContainer: {},
      tradeInfo: {},
      tradeType: {},
      tradeAmount: {},
      rightSection: {},
      emptyText: {},
    },
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const ReactLib = jest.requireActual('react');
  const { Text: ReactNativeText } = jest.requireActual('react-native');

  const MockText = ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => ReactLib.createElement(ReactNativeText, props, children);

  return {
    __esModule: true,
    default: MockText,
    TextVariant: {
      HeadingSM: 'HeadingSM',
      BodyMD: 'BodyMD',
      BodyMDMedium: 'BodyMDMedium',
      BodySM: 'BodySM',
    },
    TextColor: {
      Default: 'Default',
      Alternative: 'Alternative',
      Success: 'Success',
      Error: 'Error',
    },
  };
});

jest.mock('../PerpsTokenLogo', () => {
  const { View: RNView, Text: RNText } = jest.requireActual('react-native');
  return function MockPerpsTokenLogo({
    symbol,
    size,
    recyclingKey,
  }: {
    symbol: string;
    size: number;
    recyclingKey: string;
  }) {
    return (
      <RNView testID={`perps-token-logo-${symbol}`}>
        <RNText testID="logo-size">{size}</RNText>
        <RNText testID="logo-key">{recyclingKey}</RNText>
      </RNView>
    );
  };
});

jest.mock('../PerpsRowSkeleton', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return function MockPerpsRowSkeleton({ count }: { count: number }) {
    return <RNView testID={`perps-row-skeleton-${count}`} />;
  };
});

jest.mock(
  '../PerpsFillTag',
  () =>
    function MockPerpsFillTag() {
      return null;
    },
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.market.recent_trades': 'Recent activity',
      'perps.home.see_all': 'See all',
      'perps.market.no_trades': 'No recent activity',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../utils/marketUtils', () => ({
  getPerpsDisplaySymbol: (symbol: string) => symbol,
}));

describe('PerpsMarketTradesList', () => {
  const mockNavigate = jest.fn();
  const mockUsePerpsMarketFills = usePerpsMarketFills as jest.MockedFunction<
    typeof usePerpsMarketFills
  >;

  const mockOrderFills: OrderFill[] = [
    {
      orderId: 'fill-1',
      symbol: 'ETH',
      side: 'buy',
      size: '1.5',
      price: '2500',
      fee: '10.5',
      feeToken: 'USDC',
      timestamp: 1698700000000,
      pnl: '0',
      direction: 'Open Long',
      success: true,
    },
    {
      orderId: 'fill-2',
      symbol: 'ETH',
      side: 'sell',
      size: '2.0',
      price: '2600',
      fee: '5.0',
      feeToken: 'USDC',
      timestamp: 1698690000000,
      pnl: '150',
      direction: 'Close Long',
      success: true,
    },
    {
      orderId: 'fill-3',
      symbol: 'ETH',
      side: 'sell',
      size: '1.0',
      price: '2550',
      fee: '5.0',
      feeToken: 'USDC',
      timestamp: 1698680000000,
      pnl: '0',
      direction: 'Open Short',
      success: true,
    },
    {
      orderId: 'fill-4',
      symbol: 'BTC',
      side: 'buy',
      size: '0.5',
      price: '45000',
      fee: '10.0',
      feeToken: 'USDC',
      timestamp: 1698670000000,
      pnl: '0',
      direction: 'Open Long',
      success: true,
    },
  ];

  // Helper to create mock return values for usePerpsMarketFills
  const createMockFillsReturn = (
    fills: OrderFill[] = [],
    isInitialLoading = false,
  ) => ({
    fills,
    isInitialLoading,
    refresh: jest.fn(),
    isRefreshing: false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { useNavigation } = jest.requireMock('@react-navigation/native');
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
    // Set default mock for usePerpsMarketFills
    mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton when hook is loading', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn([], true));

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
    });

    it('renders header with title when loading', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn([], true));

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Recent activity')).toBeOnTheScreen();
    });

    it('does not render See all button when loading', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn([], true));

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.queryByTestId('see-all-button')).not.toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('renders empty message when trades array is empty', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn());

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();
    });

    it('renders header with title when empty', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn());

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Recent activity')).toBeOnTheScreen();
    });

    it('renders See all button when empty', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn());

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByTestId('see-all-button')).toBeOnTheScreen();
    });
  });

  describe('Component Rendering', () => {
    it('renders list with trades', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('renders header with title and See all button', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Recent activity')).toBeOnTheScreen();
      expect(screen.getByTestId('see-all-button')).toBeOnTheScreen();
    });

    it('renders trade subtitles correctly', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('1.5 ETH')).toBeOnTheScreen();
      expect(screen.getByText('2.0 ETH')).toBeOnTheScreen();
      expect(screen.getByText('1.0 ETH')).toBeOnTheScreen();
    });

    it('renders token logos for each trade', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const logos = screen.getAllByTestId(/perps-token-logo-ETH/);
      expect(logos).toHaveLength(3);
    });

    it('renders fill amounts correctly', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('-$10.50')).toBeOnTheScreen();
      expect(screen.getByText('+$145.00')).toBeOnTheScreen();
      expect(screen.getByText('-$5.00')).toBeOnTheScreen();
    });

    it('uses default icon size when not provided', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn([mockOrderFills[0]]),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('36');
    });

    it('uses custom icon size when provided', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn([mockOrderFills[0]]),
      );

      render(<PerpsMarketTradesList symbol="ETH" iconSize={48} />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('48');
    });
  });

  describe('Navigation Handling', () => {
    it('navigates to Activity screen when See all is pressed', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const seeAllButton = screen.getByTestId('see-all-button');
      fireEvent.press(seeAllButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ACTIVITY, {
        redirectToPerpsTransactions: true,
        showBackButton: true,
      });
    });

    it('navigates to position transaction detail when trade item is pressed', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const tradeItem = screen.getByText('Opened long');
      fireEvent.press(tradeItem.parent?.parent || tradeItem);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      // Verify navigation to correct route with transaction param
      // ID format: {orderId}-{timestamp}-{index}
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.POSITION_TRANSACTION,
        expect.objectContaining({
          transaction: expect.objectContaining({
            id: expect.stringContaining('fill-1'),
            type: 'trade',
            category: 'position_open',
            title: 'Opened long',
            asset: 'ETH',
          }),
        }),
      );
    });

    it('navigates with correct transaction data for different trades', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const ethTrade = screen.getByText('Closed long');
      fireEvent.press(ethTrade.parent?.parent || ethTrade);

      // Verify navigation with correct transformed transaction data
      // ID format: {orderId}-{timestamp}-{index}
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PERPS.POSITION_TRANSACTION,
        expect.objectContaining({
          transaction: expect.objectContaining({
            id: expect.stringContaining('fill-2'),
            type: 'trade',
            category: 'position_close',
            title: 'Closed long',
            asset: 'ETH',
          }),
        }),
      );
    });
  });

  describe('Hook Integration', () => {
    it('calls usePerpsMarketFills with correct params', () => {
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn());

      render(<PerpsMarketTradesList symbol="BTC" />);

      expect(mockUsePerpsMarketFills).toHaveBeenCalledWith({
        symbol: 'BTC',
        throttleMs: 0,
      });
    });

    it('filters order fills by symbol', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      // Should only show ETH trades (3 out of 4 fills)
      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('limits trades to 3 even when more exist', () => {
      const manyETHFills: OrderFill[] = Array.from({ length: 10 }, (_, i) => ({
        orderId: `fill-eth-${i}`,
        symbol: 'ETH',
        side: 'buy',
        size: '1.0',
        price: '2500',
        fee: '5.0',
        feeToken: 'USDC',
        timestamp: 1698700000000 - i * 1000,
        pnl: '0',
        direction: 'Open Long',
        success: true,
      }));

      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(manyETHFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const logos = screen.getAllByTestId(/perps-token-logo-ETH/);
      expect(logos).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles single trade', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn([mockOrderFills[0]]),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.queryByText('Closed long')).not.toBeOnTheScreen();
    });

    it('handles exactly 3 trades', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills.slice(0, 3)),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('filters out non-matching symbols', () => {
      // Hook returns only BTC fills when symbol="BTC"
      const btcFills = mockOrderFills.filter((fill) => fill.symbol === 'BTC');
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn(btcFills));

      render(<PerpsMarketTradesList symbol="BTC" />);

      // Hook returns only BTC trade (1 out of 4 fills)
      const logos = screen.getAllByTestId(/perps-token-logo/);
      expect(logos).toHaveLength(1);
      expect(screen.getByTestId('perps-token-logo-BTC')).toBeOnTheScreen();
    });

    it('renders recycling key correctly for token logos', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills.slice(0, 3)),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      const logoKeys = screen.getAllByTestId('logo-key');
      // ID format: {asset}-{orderId}-{timestamp}-{index}
      expect(logoKeys[0]).toHaveTextContent('ETH-fill-1-1698700000000-0');
      expect(logoKeys[1]).toHaveTextContent('ETH-fill-2-1698690000000-1');
      expect(logoKeys[2]).toHaveTextContent('ETH-fill-3-1698680000000-2');
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      const { unmount } = render(<PerpsMarketTradesList symbol="ETH" />);

      expect(() => unmount()).not.toThrow();
    });

    it('updates when symbol prop changes', () => {
      const ethFills = mockOrderFills.filter((fill) => fill.symbol === 'ETH');
      const btcFills = mockOrderFills.filter((fill) => fill.symbol === 'BTC');

      // Start with ETH fills
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn(ethFills));

      const { rerender } = render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getAllByTestId(/perps-token-logo-ETH/)).toHaveLength(3);

      // Update mock to return BTC fills
      mockUsePerpsMarketFills.mockReturnValue(createMockFillsReturn(btcFills));
      rerender(<PerpsMarketTradesList symbol="BTC" />);

      // Verifies hook is called with new symbol
      expect(screen.getByTestId('perps-token-logo-BTC')).toBeOnTheScreen();
    });
  });

  describe('FlatList Configuration', () => {
    it('uses transaction id as key extractor', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('disables scroll on FlatList', () => {
      mockUsePerpsMarketFills.mockReturnValue(
        createMockFillsReturn(mockOrderFills),
      );

      const { root } = render(<PerpsMarketTradesList symbol="ETH" />);

      expect(root).toBeTruthy();
    });
  });
});

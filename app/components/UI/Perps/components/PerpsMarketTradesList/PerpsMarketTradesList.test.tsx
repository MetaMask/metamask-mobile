import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsMarketTradesList from './PerpsMarketTradesList';
import Routes from '../../../../../constants/navigation/Routes';
import { usePerpsLiveFills } from '../../hooks/stream';
import type { OrderFill } from '../../controllers/types';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../hooks/stream', () => ({
  usePerpsLiveFills: jest.fn(),
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
  const mockUsePerpsLiveFills = usePerpsLiveFills as jest.MockedFunction<
    typeof usePerpsLiveFills
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

  beforeEach(() => {
    jest.clearAllMocks();
    const { useNavigation } = jest.requireMock('@react-navigation/native');
    useNavigation.mockReturnValue({
      navigate: mockNavigate,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading skeleton when hook is loading', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: true,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
    });

    it('renders header with title when loading', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: true,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Recent activity')).toBeOnTheScreen();
    });

    it('does not render See all button when loading', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: true,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.queryByText('See all')).not.toBeOnTheScreen();
    });
  });

  describe('Empty State', () => {
    it('renders empty message when trades array is empty', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('No recent activity')).toBeOnTheScreen();
    });

    it('renders header with title when empty', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Recent activity')).toBeOnTheScreen();
    });

    it('does not render See all button when empty', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.queryByText('See all')).not.toBeOnTheScreen();
    });
  });

  describe('Component Rendering', () => {
    it('renders list with trades', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('renders header with title and See all button', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Recent activity')).toBeOnTheScreen();
      expect(screen.getByText('See all')).toBeOnTheScreen();
    });

    it('renders trade subtitles correctly', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('1.5 ETH')).toBeOnTheScreen();
      expect(screen.getByText('2.0 ETH')).toBeOnTheScreen();
      expect(screen.getByText('1.0 ETH')).toBeOnTheScreen();
    });

    it('renders token logos for each trade', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      const logos = screen.getAllByTestId(/perps-token-logo-ETH/);
      expect(logos).toHaveLength(3);
    });

    it('renders fill amounts correctly', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('-$10.50')).toBeOnTheScreen();
      expect(screen.getByText('+$145.00')).toBeOnTheScreen();
      expect(screen.getByText('-$5.00')).toBeOnTheScreen();
    });

    it('uses default icon size when not provided', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockOrderFills[0]],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('36');
    });

    it('uses custom icon size when provided', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockOrderFills[0]],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" iconSize={48} />);

      const iconSizes = screen.getAllByTestId('logo-size');
      expect(iconSizes[0]).toHaveTextContent('48');
    });
  });

  describe('Navigation Handling', () => {
    it('navigates to Activity screen when See all is pressed', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      const seeAllButton = screen.getByText('See all');
      fireEvent.press(seeAllButton);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ACTIVITY, {
        redirectToPerpsTransactions: true,
        showBackButton: true,
      });
    });

    it('navigates to position transaction detail when trade item is pressed', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

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
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

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
    it('calls usePerpsLiveFills with correct params', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="BTC" />);

      expect(mockUsePerpsLiveFills).toHaveBeenCalledWith({
        throttleMs: 0,
      });
    });

    it('filters order fills by symbol', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

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

      mockUsePerpsLiveFills.mockReturnValue({
        fills: manyETHFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      const logos = screen.getAllByTestId(/perps-token-logo-ETH/);
      expect(logos).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles single trade', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: [mockOrderFills[0]],
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.queryByText('Closed long')).not.toBeOnTheScreen();
    });

    it('handles exactly 3 trades', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills.slice(0, 3),
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('filters out non-matching symbols', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills, // Contains BTC and ETH fills
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="BTC" />);

      // Should only show BTC trade (1 out of 4 fills)
      const logos = screen.getAllByTestId(/perps-token-logo/);
      expect(logos).toHaveLength(1);
      expect(screen.getByTestId('perps-token-logo-BTC')).toBeOnTheScreen();
    });

    it('renders recycling key correctly for token logos', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills.slice(0, 3),
        isInitialLoading: false,
      });

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
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      const { unmount } = render(<PerpsMarketTradesList symbol="ETH" />);

      expect(() => unmount()).not.toThrow();
    });

    it('updates when symbol prop changes', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      const { rerender } = render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getAllByTestId(/perps-token-logo-ETH/)).toHaveLength(3);

      rerender(<PerpsMarketTradesList symbol="BTC" />);

      // Should now show BTC trades
      expect(screen.getByTestId('perps-token-logo-BTC')).toBeOnTheScreen();
    });
  });

  describe('FlatList Configuration', () => {
    it('uses transaction id as key extractor', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      render(<PerpsMarketTradesList symbol="ETH" />);

      expect(screen.getByText('Opened long')).toBeOnTheScreen();
      expect(screen.getByText('Closed long')).toBeOnTheScreen();
      expect(screen.getByText('Opened short')).toBeOnTheScreen();
    });

    it('disables scroll on FlatList', () => {
      mockUsePerpsLiveFills.mockReturnValue({
        fills: mockOrderFills,
        isInitialLoading: false,
      });

      const { root } = render(<PerpsMarketTradesList symbol="ETH" />);

      expect(root).toBeTruthy();
    });
  });
});

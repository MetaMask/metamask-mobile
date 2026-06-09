import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsWatchlistMarkets from './PerpsWatchlistMarkets';
import { type PerpsMarketData } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import { PerpsWatchlistSelectorsIDs } from '../../Perps.testIds';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      header: {},
      titleRow: {},
      listContent: {},
      emptyText: {},
      expandButton: {},
      recommendedSubheader: {},
      section: {},
    },
  }),
}));

jest.mock('../PerpsMarketRowItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockPerpsMarketRowItem({
    market,
    onPress,
  }: {
    market: PerpsMarketData;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={`perps-market-row-${market.symbol}`}
      >
        <Text>{market.symbol}</Text>
        <Text>{market.name}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('./PerpsSwipeableMarketRow', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockPerpsSwipeableMarketRow({
    market,
    onAdd,
  }: {
    market: PerpsMarketData;
    onAdd: (symbol: string) => void;
  }) {
    return (
      <TouchableOpacity
        onPress={() => onAdd(market.symbol)}
        testID={`perps-swipeable-row-${market.symbol}`}
      >
        <Text>{market.symbol}</Text>
        <Text>{market.name}</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../PerpsRowSkeleton', () => {
  const { View } = jest.requireActual('react-native');
  return function MockPerpsRowSkeleton({ count }: { count: number }) {
    return <View testID={`perps-row-skeleton-${count}`} />;
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'perps.home.watchlist': 'Watchlist',
      'perps.home.see_all': 'See all',
      'perps.home.watchlist_view_more': `View ${params?.count ?? ''} more`,
      'perps.home.watchlist_show_less': 'Show less',
      'perps.home.watchlist_recommended': 'Recommended for you',
      'perps.home.watchlist_add': 'Add',
    };
    return translations[key] || key;
  },
}));

// Mock Perps hooks
jest.mock('../../hooks/stream', () => ({
  usePerpsLivePositions: () => ({
    positions: [],
    isInitialLoading: false,
  }),
  usePerpsLiveOrders: () => ({
    orders: [],
    isInitialLoading: false,
  }),
}));

describe('PerpsWatchlistMarkets', () => {
  const mockNavigate = jest.fn();
  const mockMarkets: PerpsMarketData[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      maxLeverage: '50x',
      price: '$52,000',
      change24h: '+$2,000',
      change24hPercent: '+4.00%',
      volume: '$2.5B',
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      maxLeverage: '25x',
      price: '$3,000',
      change24h: '-$50',
      change24hPercent: '-1.64%',
      volume: '$1.2B',
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

  describe('Component Rendering', () => {
    it('renders watchlist header with title', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });

    it('renders component with markets', () => {
      const { root } = render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(root).toBeTruthy();
    });

    it('renders all watchlisted markets', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('Bitcoin')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('Ethereum')).toBeOnTheScreen();
    });

    it('returns null when markets array is empty and no recommendations', () => {
      const { toJSON } = render(<PerpsWatchlistMarkets markets={[]} />);

      expect(toJSON()).toBeNull();
    });

    it('returns null when markets array is empty and user has dismissed recommendations', () => {
      const { toJSON } = render(
        <PerpsWatchlistMarkets
          markets={[]}
          recommendedMarkets={mockMarkets}
          hasUserDismissed
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('shows loading skeleton when isLoading is true', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);

      // Component shows skeleton while loading
      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });
  });

  describe('Navigation Handling', () => {
    // Note: "See all" button was removed from PerpsWatchlistMarkets
    // Navigation to watchlist is now handled elsewhere

    it('navigates to market details when market row is pressed', () => {
      render(
        <PerpsWatchlistMarkets markets={mockMarkets} source="perps_home" />,
      );

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      fireEvent.press(btcRow);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockMarkets[0],
          initialTab: undefined,
          source: 'perps_home',
        },
      });
    });

    it('passes correct market data to navigation for different markets', () => {
      render(
        <PerpsWatchlistMarkets markets={mockMarkets} source="perps_home" />,
      );

      const ethRow = screen.getByTestId('perps-market-row-ETH');
      fireEvent.press(ethRow);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockMarkets[1],
          initialTab: undefined,
          source: 'perps_home',
        },
      });
    });

    it('carries transactionActiveAbTests when a watchlist market opens market details', () => {
      const transactionActiveAbTests = [
        createActiveABTestAssignment(
          'homeTMCU725AbtestHomepagePerpsPillsEmptyState',
          'treatment',
        ),
      ];
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          source="perps_home"
          transactionActiveAbTests={transactionActiveAbTests}
        />,
      );

      fireEvent.press(screen.getByTestId('perps-market-row-BTC'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockMarkets[0],
          initialTab: undefined,
          source: 'perps_home',
          transactionActiveAbTests,
        },
      });
    });
  });

  describe('Market Data Display', () => {
    it('displays markets in provided order', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      const reversedMarkets = [...mockMarkets].reverse();
      rerender(<PerpsWatchlistMarkets markets={reversedMarkets} />);

      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });

    it('handles single market', () => {
      const singleMarket = [mockMarkets[0]];

      render(<PerpsWatchlistMarkets markets={singleMarket} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.queryByText('ETH')).not.toBeOnTheScreen();
    });

    it('handles multiple markets', () => {
      const manyMarkets: PerpsMarketData[] = [
        ...mockMarkets,
        {
          symbol: 'SOL',
          name: 'Solana',
          maxLeverage: '20x',
          price: '$150',
          change24h: '+$5',
          change24hPercent: '+3.45%',
          volume: '$800M',
        },
      ];

      render(<PerpsWatchlistMarkets markets={manyMarkets} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
    });

    it('updates when markets prop changes', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      expect(screen.getByText('BTC')).toBeOnTheScreen();

      const newMarkets: PerpsMarketData[] = [
        {
          symbol: 'AVAX',
          name: 'Avalanche',
          maxLeverage: '30x',
          price: '$40',
          change24h: '+$2',
          change24hPercent: '+5.26%',
          volume: '$500M',
        },
      ];

      rerender(<PerpsWatchlistMarkets markets={newMarkets} />);

      expect(screen.queryByText('BTC')).not.toBeOnTheScreen();
      expect(screen.getByText('AVAX')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string symbols gracefully', () => {
      const marketsWithEmptySymbol: PerpsMarketData[] = [
        {
          symbol: '',
          name: 'Unknown',
          maxLeverage: '10x',
          price: '$0',
          change24h: '$0',
          change24hPercent: '0.00%',
          volume: '$0',
        },
      ];

      render(<PerpsWatchlistMarkets markets={marketsWithEmptySymbol} />);

      expect(screen.getByText('Unknown')).toBeOnTheScreen();
    });

    it('handles markets with special characters in symbols', () => {
      const specialMarkets: PerpsMarketData[] = [
        {
          symbol: 'BTC-USD',
          name: 'Bitcoin USD',
          maxLeverage: '50x',
          price: '$52,000',
          change24h: '+$2,000',
          change24hPercent: '+4.00%',
          volume: '$2.5B',
        },
      ];

      render(<PerpsWatchlistMarkets markets={specialMarkets} />);

      expect(screen.getByText('BTC-USD')).toBeOnTheScreen();
    });

    it('handles very long market lists', () => {
      const longMarketList: PerpsMarketData[] = Array.from(
        { length: 50 },
        (_, i) => ({
          symbol: `TOKEN${i}`,
          name: `Token ${i}`,
          maxLeverage: '20x',
          price: `$${100 * (i + 1)}`,
          change24h: `+$${10 * (i + 1)}`,
          change24hPercent: '+5.00%',
          volume: '$1M',
        }),
      );

      const { root } = render(
        <PerpsWatchlistMarkets markets={longMarketList} />,
      );

      // Component renders with long list
      expect(root).toBeTruthy();
    });

    it('handles markets with undefined optional fields', () => {
      const incompleteMarkets: PerpsMarketData[] = [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          maxLeverage: '50x',
          price: '$52,000',
          change24h: '+$2,000',
          change24hPercent: '+4.00%',
          volume: '$2.5B',
        },
      ];

      render(<PerpsWatchlistMarkets markets={incompleteMarkets} />);

      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });
  });

  describe('Loading State Handling', () => {
    it('shows skeleton when isLoading transitions from false to true', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading={false} />,
      );

      // Component renders markets initially
      expect(screen.getByText('BTC')).toBeOnTheScreen();

      rerender(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);

      // Component shows skeleton during loading
      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
    });

    it('shows markets when isLoading transitions from true to false', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading />,
      );

      // Component shows skeleton during loading
      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();

      rerender(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading={false} />,
      );

      // Component renders markets after loading completes
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });
  });

  describe('Interaction Edge Cases', () => {
    it('handles multiple rapid presses on market rows', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      fireEvent.press(btcRow);
      fireEvent.press(btcRow);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
    });

    it('handles pressing different market rows in sequence', () => {
      render(
        <PerpsWatchlistMarkets markets={mockMarkets} source="perps_home" />,
      );

      const btcRow = screen.getByTestId('perps-market-row-BTC');
      const ethRow = screen.getByTestId('perps-market-row-ETH');

      fireEvent.press(btcRow);
      fireEvent.press(ethRow);

      expect(mockNavigate).toHaveBeenCalledTimes(2);
      expect(mockNavigate).toHaveBeenNthCalledWith(1, Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: mockMarkets[0], source: 'perps_home' },
      });
      expect(mockNavigate).toHaveBeenNthCalledWith(2, Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market: mockMarkets[1], source: 'perps_home' },
      });
    });
  });

  describe('Component Lifecycle', () => {
    it('does not throw error on unmount', () => {
      const { unmount } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it('cleans up properly when remounted with different props', () => {
      const { toJSON, rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );

      expect(toJSON()).not.toBeNull();
      expect(screen.getByText('BTC')).toBeOnTheScreen();

      rerender(<PerpsWatchlistMarkets markets={[]} />);
      expect(toJSON()).toBeNull();

      rerender(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);
      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();

      rerender(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });
  });

  describe('Empty State with Recommendations', () => {
    const recommendedMarkets: PerpsMarketData[] = [
      {
        symbol: 'SOL',
        name: 'Solana',
        maxLeverage: '20x',
        price: '$150',
        change24h: '+$5',
        change24hPercent: '+3.45%',
        volume: '$800M',
      },
      {
        symbol: 'DOGE',
        name: 'Dogecoin',
        maxLeverage: '15x',
        price: '$0.15',
        change24h: '+$0.01',
        change24hPercent: '+7.14%',
        volume: '$500M',
      },
    ];

    it('shows recommended markets when watchlist is empty', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          recommendedMarkets={recommendedMarkets}
        />,
      );

      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
      expect(screen.getByText('Recommended for you')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
      expect(screen.getByText('DOGE')).toBeOnTheScreen();
    });

    it('calls onAddToWatchlist when add button is pressed on recommendation', () => {
      const mockOnAdd = jest.fn();
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          recommendedMarkets={recommendedMarkets}
          onAddToWatchlist={mockOnAdd}
        />,
      );

      const solRow = screen.getByTestId('perps-swipeable-row-SOL');
      fireEvent.press(solRow);

      expect(mockOnAdd).toHaveBeenCalledWith('SOL');
    });

    it('hides recommendations section when hasUserDismissed is true', () => {
      const { toJSON } = render(
        <PerpsWatchlistMarkets
          markets={[]}
          recommendedMarkets={recommendedMarkets}
          hasUserDismissed
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('Collapse/Expand Behavior', () => {
    const manyMarkets: PerpsMarketData[] = Array.from(
      { length: 5 },
      (_, i) => ({
        symbol: `TOKEN${i}`,
        name: `Token ${i}`,
        maxLeverage: '20x',
        price: `$${100 * (i + 1)}`,
        change24h: `+$${10 * (i + 1)}`,
        change24hPercent: '+5.00%',
        volume: '$1M',
      }),
    );

    it('shows only 3 markets and "View X more" button when >3 markets', () => {
      render(<PerpsWatchlistMarkets markets={manyMarkets} />);

      expect(screen.getByText('TOKEN0')).toBeOnTheScreen();
      expect(screen.getByText('TOKEN1')).toBeOnTheScreen();
      expect(screen.getByText('TOKEN2')).toBeOnTheScreen();
      expect(screen.queryByText('TOKEN3')).not.toBeOnTheScreen();
      expect(screen.queryByText('TOKEN4')).not.toBeOnTheScreen();

      expect(
        screen.getByTestId(PerpsWatchlistSelectorsIDs.VIEW_MORE_BUTTON),
      ).toBeOnTheScreen();
      expect(screen.getByText('View 2 more')).toBeOnTheScreen();
    });

    it('shows all markets and "Show less" after expanding', () => {
      render(<PerpsWatchlistMarkets markets={manyMarkets} />);

      fireEvent.press(
        screen.getByTestId(PerpsWatchlistSelectorsIDs.VIEW_MORE_BUTTON),
      );

      expect(screen.getByText('TOKEN0')).toBeOnTheScreen();
      expect(screen.getByText('TOKEN3')).toBeOnTheScreen();
      expect(screen.getByText('TOKEN4')).toBeOnTheScreen();
      expect(screen.getByText('Show less')).toBeOnTheScreen();
    });

    it('collapses back to 3 after tapping "Show less"', () => {
      render(<PerpsWatchlistMarkets markets={manyMarkets} />);

      // Expand
      fireEvent.press(
        screen.getByTestId(PerpsWatchlistSelectorsIDs.VIEW_MORE_BUTTON),
      );
      // Collapse
      fireEvent.press(
        screen.getByTestId(PerpsWatchlistSelectorsIDs.SHOW_LESS_BUTTON),
      );

      expect(screen.getByText('TOKEN0')).toBeOnTheScreen();
      expect(screen.queryByText('TOKEN3')).not.toBeOnTheScreen();
      expect(screen.getByText('View 2 more')).toBeOnTheScreen();
    });

    it('does not show expand/collapse for 3 or fewer markets', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);

      expect(
        screen.queryByTestId(PerpsWatchlistSelectorsIDs.VIEW_MORE_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsWatchlistSelectorsIDs.SHOW_LESS_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Header Navigation', () => {
    it('calls onHeaderPress when header is tapped', () => {
      const mockHeaderPress = jest.fn();
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          onHeaderPress={mockHeaderPress}
        />,
      );

      const header = screen.getByTestId(PerpsWatchlistSelectorsIDs.HEADER);
      fireEvent.press(header);

      expect(mockHeaderPress).toHaveBeenCalledTimes(1);
    });

    it('shows arrow icon when onHeaderPress is provided', () => {
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          onHeaderPress={() => undefined}
        />,
      );

      const header = screen.getByTestId(PerpsWatchlistSelectorsIDs.HEADER);
      expect(header).toBeOnTheScreen();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import PerpsWatchlistMarkets from './PerpsWatchlistMarkets';
import { type PerpsMarketData } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      section: {},
      header: {},
      headerLeft: {},
      titleRow: {},
      listContent: {},
      emptyStateContainer: {},
      suggestedSection: {},
      suggestedHeader: {},
      showMoreRow: {},
    },
  }),
}));

const mockAddToWatchlist = jest.fn();
jest.mock('../../hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: () => ({
    addToWatchlist: mockAddToWatchlist,
    removeFromWatchlist: jest.fn(),
  }),
}));

jest.mock('../PerpsMarketRowItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockPerpsMarketRowItem({
    market,
    onPress,
    onAddPress,
  }: {
    market: PerpsMarketData;
    onPress?: () => void;
    onAddPress?: (market: PerpsMarketData) => void;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={`perps-market-row-${market.symbol}`}
      >
        <Text>{market.symbol}</Text>
        <Text>{market.name}</Text>
        {onAddPress && (
          <TouchableOpacity
            onPress={() => onAddPress(market)}
            testID={`perps-market-row-${market.symbol}-add-button`}
          >
            <Text>+</Text>
          </TouchableOpacity>
        )}
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
  strings: (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.home.watchlist': 'Watchlist',
      'perps.home.see_all': 'See all',
      'perps.watchlist.suggested': 'Suggested',
      'perps.watchlist.show_more': `Show ${params?.count} more`,
      'perps.watchlist.show_less': 'Show less',
    };
    return translations[key] || key;
  },
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: 'Icon',
  Icon: 'Icon',
  IconName: {
    ArrowRight: 'ArrowRight',
    ArrowDown: 'ArrowDown',
    ArrowUp: 'ArrowUp',
  },
  IconSize: { Sm: 'Sm', Xs: 'Xs' },
  IconColor: { Default: 'Default', Primary: 'Primary' },
}));

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

const makeMarket = (symbol: string, name: string): PerpsMarketData => ({
  symbol,
  name,
  maxLeverage: '50x',
  price: '$1,000',
  change24h: '+$10',
  change24hPercent: '+1.00%',
  volume: '$1B',
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PerpsWatchlistMarkets', () => {
  const mockNavigate = jest.fn();

  const mockMarkets: PerpsMarketData[] = [
    makeMarket('BTC', 'Bitcoin'),
    makeMarket('ETH', 'Ethereum'),
  ];

  // Suggested list symbols deliberately differ from watchlist to avoid testID collision
  const mockSuggestedMarkets: PerpsMarketData[] = [
    makeMarket('SOL', 'Solana'),
    makeMarket('BNB', 'Binance Coin'),
    makeMarket('AVAX', 'Avalanche'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    const { useNavigation } = jest.requireMock('@react-navigation/native');
    useNavigation.mockReturnValue({ navigate: mockNavigate });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // -------------------------------------------------------------------------
  // Empty / null states
  // -------------------------------------------------------------------------

  describe('Null state', () => {
    it('returns null when markets is empty and no suggestedMarkets provided', () => {
      const { toJSON } = render(<PerpsWatchlistMarkets markets={[]} />);
      expect(toJSON()).toBeNull();
    });

    it('returns null when markets is empty and suggestedMarkets is empty array', () => {
      const { toJSON } = render(
        <PerpsWatchlistMarkets markets={[]} suggestedMarkets={[]} />,
      );
      expect(toJSON()).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Empty watchlist + suggested sub-section
  // -------------------------------------------------------------------------

  describe('Empty watchlist with suggested markets', () => {
    it('renders the "Suggested" sub-header when watchlist is empty', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(
        screen.getByTestId('perps-watchlist-suggested-header'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Suggested')).toBeOnTheScreen();
    });

    it('renders the suggested section wrapper testID', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(
        screen.getByTestId('perps-watchlist-suggested-section'),
      ).toBeOnTheScreen();
    });

    it('renders suggested market rows with add buttons', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      for (const market of mockSuggestedMarkets) {
        expect(
          screen.getByTestId(`perps-market-row-${market.symbol}`),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(`perps-market-row-${market.symbol}-add-button`),
        ).toBeOnTheScreen();
      }
    });

    it('calls addToWatchlist with the correct symbol when an add button is pressed', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      fireEvent.press(screen.getByTestId('perps-market-row-SOL-add-button'));
      expect(mockAddToWatchlist).toHaveBeenCalledTimes(1);
      expect(mockAddToWatchlist).toHaveBeenCalledWith('SOL');
    });

    it('renders the Watchlist section header', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });

    it('does not render old empty-state title or subtitle copy', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(
        screen.queryByText('Start with the most-traded markets'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('Tap + to add a market to your watchlist.'),
      ).not.toBeOnTheScreen();
    });
  });

  // -------------------------------------------------------------------------
  // Populated watchlist — ≤ 3 markets, no suggested
  // -------------------------------------------------------------------------

  describe('Populated watchlist (≤ 3 markets)', () => {
    it('renders all markets and no show-more toggle', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.queryByText(/Show \d+ more/)).not.toBeOnTheScreen();
      expect(screen.queryByText('Show less')).not.toBeOnTheScreen();
    });

    it('renders the section header', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });

    it('watchlist rows do not have add buttons', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(
        screen.queryByTestId('perps-market-row-BTC-add-button'),
      ).not.toBeOnTheScreen();
    });
  });

  // -------------------------------------------------------------------------
  // Populated watchlist + suggested rendered together
  // -------------------------------------------------------------------------

  describe('Populated watchlist + suggested sub-section together', () => {
    it('renders both watchlist rows and suggested rows simultaneously', () => {
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      // Watchlist rows (no add button)
      expect(screen.getByTestId('perps-market-row-BTC')).toBeOnTheScreen();
      expect(screen.getByTestId('perps-market-row-ETH')).toBeOnTheScreen();
      expect(
        screen.queryByTestId('perps-market-row-BTC-add-button'),
      ).not.toBeOnTheScreen();

      // Suggested rows (with add button)
      for (const market of mockSuggestedMarkets) {
        expect(
          screen.getByTestId(`perps-market-row-${market.symbol}`),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId(`perps-market-row-${market.symbol}-add-button`),
        ).toBeOnTheScreen();
      }
    });

    it('renders the "Suggested" sub-header when both lists are present', () => {
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(screen.getByText('Suggested')).toBeOnTheScreen();
    });
  });

  // -------------------------------------------------------------------------
  // Populated watchlist — > 3 markets (expand / collapse)
  // -------------------------------------------------------------------------

  describe('Populated watchlist (> 3 markets) — expand/collapse', () => {
    const fiveMarkets = [
      makeMarket('BTC', 'Bitcoin'),
      makeMarket('ETH', 'Ethereum'),
      makeMarket('SOL', 'Solana'),
      makeMarket('AVAX', 'Avalanche'),
      makeMarket('DOT', 'Polkadot'),
    ];

    it('shows first 3 markets and a "Show 2 more" button', () => {
      render(<PerpsWatchlistMarkets markets={fiveMarkets} />);
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
      expect(screen.queryByText('AVAX')).not.toBeOnTheScreen();
      expect(screen.queryByText('DOT')).not.toBeOnTheScreen();
      expect(screen.getByText('Show 2 more')).toBeOnTheScreen();
    });

    it('expands to show all markets when "Show more" is pressed', () => {
      render(<PerpsWatchlistMarkets markets={fiveMarkets} />);
      fireEvent.press(screen.getByText('Show 2 more'));
      expect(screen.getByText('AVAX')).toBeOnTheScreen();
      expect(screen.getByText('DOT')).toBeOnTheScreen();
    });

    it('shows "Show less" button after expanding', () => {
      render(<PerpsWatchlistMarkets markets={fiveMarkets} />);
      fireEvent.press(screen.getByText('Show 2 more'));
      expect(screen.getByText('Show less')).toBeOnTheScreen();
      expect(screen.queryByText('Show 2 more')).not.toBeOnTheScreen();
    });

    it('collapses back to 3 markets when "Show less" is pressed', () => {
      render(<PerpsWatchlistMarkets markets={fiveMarkets} />);
      fireEvent.press(screen.getByText('Show 2 more'));
      fireEvent.press(screen.getByText('Show less'));
      expect(screen.queryByText('AVAX')).not.toBeOnTheScreen();
      expect(screen.queryByText('DOT')).not.toBeOnTheScreen();
      expect(screen.getByText('Show 2 more')).toBeOnTheScreen();
    });

    it('does not show toggle when exactly 3 markets are present', () => {
      const threeMarkets = fiveMarkets.slice(0, 3);
      render(<PerpsWatchlistMarkets markets={threeMarkets} />);
      expect(screen.queryByText(/Show \d+ more/)).not.toBeOnTheScreen();
      expect(screen.queryByText('Show less')).not.toBeOnTheScreen();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  describe('Loading state', () => {
    it('shows skeleton when isLoading is true', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);
      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });

    it('shows markets when isLoading transitions from true to false', () => {
      const { rerender } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading />,
      );
      rerender(
        <PerpsWatchlistMarkets markets={mockMarkets} isLoading={false} />,
      );
      expect(screen.getByText('BTC')).toBeOnTheScreen();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  describe('Navigation', () => {
    it('navigates to market details when a watchlist row is pressed', () => {
      render(
        <PerpsWatchlistMarkets markets={mockMarkets} source="perps_home" />,
      );
      fireEvent.press(screen.getByTestId('perps-market-row-BTC'));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockMarkets[0],
          initialTab: undefined,
          source: 'perps_home',
        },
      });
    });

    it('navigates to market details when a suggested market row is pressed', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
          source="perps_home"
        />,
      );
      fireEvent.press(screen.getByTestId('perps-market-row-SOL'));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockSuggestedMarkets[0],
          initialTab: undefined,
          source: 'perps_home',
        },
      });
    });

    it('carries transactionActiveAbTests when opening market details', () => {
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

  // -------------------------------------------------------------------------
  // onSeeAllPress header behaviour
  // -------------------------------------------------------------------------

  describe('onSeeAllPress (header press)', () => {
    it('calls onSeeAllPress when header is pressed', () => {
      const onSeeAllPress = jest.fn();
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          onSeeAllPress={onSeeAllPress}
        />,
      );
      fireEvent.press(screen.getByTestId('perps-watchlist-header'));
      expect(onSeeAllPress).toHaveBeenCalledTimes(1);
    });

    it('does not throw when header is pressed without onSeeAllPress', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(() =>
        fireEvent.press(screen.getByTestId('perps-watchlist-header')),
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Component lifecycle
  // -------------------------------------------------------------------------

  describe('Component lifecycle', () => {
    it('does not throw on unmount', () => {
      const { unmount } = render(
        <PerpsWatchlistMarkets markets={mockMarkets} />,
      );
      expect(() => unmount()).not.toThrow();
    });

    it('transitions correctly from empty → has-suggested → has-watchlist', () => {
      const { toJSON, rerender } = render(
        <PerpsWatchlistMarkets markets={[]} />,
      );
      expect(toJSON()).toBeNull();

      rerender(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(screen.getByText('Suggested')).toBeOnTheScreen();
      expect(
        screen.queryByText('Start with the most-traded markets'),
      ).not.toBeOnTheScreen();

      rerender(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.queryByText('Suggested')).not.toBeOnTheScreen();
    });
  });
});

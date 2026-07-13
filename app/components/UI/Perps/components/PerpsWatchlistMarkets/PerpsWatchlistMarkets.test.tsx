import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import PerpsWatchlistMarkets from './PerpsWatchlistMarkets';
import { type PerpsMarketData } from '@metamask/perps-controller';
import Routes from '../../../../../constants/navigation/Routes';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import { selectPerpsWatchlistEnabledFlag } from '../../selectors/featureFlags';
import { selectPerpsWatchlistMarkets } from '../../selectors/perpsController';

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

const mockTrack = jest.fn();
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
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
      'perps.watchlist.empty_subtitle':
        'Tap + to add a market to your watchlist.',
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

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPerpsWatchlistEnabledFlag: jest.fn(),
}));

jest.mock('../../selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
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
    // Default: flag enabled, empty watchlist symbols
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectPerpsWatchlistEnabledFlag) return true;
      if (selector === selectPerpsWatchlistMarkets) return [];
      return [];
    });
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
    it('renders the placeholder text when watchlist is empty', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(
        screen.getByText('Tap + to add a market to your watchlist.'),
      ).toBeOnTheScreen();
      expect(screen.queryByText('Suggested')).not.toBeOnTheScreen();
    });

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
      expect(
        screen.getByText('Tap + to add a market to your watchlist.'),
      ).toBeOnTheScreen();
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

    it('does not render old empty-state title copy', () => {
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(
        screen.queryByText('Start with the most-traded markets'),
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

    it('renders the "Suggested" sub-header (not placeholder) when both lists are present', () => {
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(screen.getByText('Suggested')).toBeOnTheScreen();
      expect(
        screen.queryByText('Tap + to add a market to your watchlist.'),
      ).not.toBeOnTheScreen();
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
  // onMarketPress override
  // -------------------------------------------------------------------------

  describe('onMarketPress prop (navigation override)', () => {
    it('calls onMarketPress instead of navigation.navigate when a watchlist row is pressed', () => {
      const onMarketPress = jest.fn();
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          onMarketPress={onMarketPress}
        />,
      );
      fireEvent.press(screen.getByTestId('perps-market-row-BTC'));
      expect(onMarketPress).toHaveBeenCalledTimes(1);
      expect(onMarketPress).toHaveBeenCalledWith(mockMarkets[0]);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('calls onMarketPress instead of navigation.navigate when a suggested row is pressed', () => {
      const onMarketPress = jest.fn();
      render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
          onMarketPress={onMarketPress}
        />,
      );
      fireEvent.press(screen.getByTestId('perps-market-row-SOL'));
      expect(onMarketPress).toHaveBeenCalledTimes(1);
      expect(onMarketPress).toHaveBeenCalledWith(mockSuggestedMarkets[0]);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('falls back to navigation.navigate when onMarketPress is not provided', () => {
      render(
        <PerpsWatchlistMarkets markets={mockMarkets} source="perps_home" />,
      );
      fireEvent.press(screen.getByTestId('perps-market-row-BTC'));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
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

    it('fires PERPS_UI_INTERACTION with button_clicked=watchlist when header is pressed', () => {
      const { PERPS_EVENT_VALUE: PEV, PERPS_EVENT_PROPERTY: PEP } =
        jest.requireActual('@metamask/perps-controller');

      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          onSeeAllPress={jest.fn()}
        />,
      );
      fireEvent.press(screen.getByTestId('perps-watchlist-header'));

      expect(mockTrack).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          [PEP.INTERACTION_TYPE]: PEV.INTERACTION_TYPE.BUTTON_CLICKED,
          [PEP.BUTTON_CLICKED]: PEV.BUTTON_CLICKED.WATCHLIST,
          [PEP.BUTTON_LOCATION]: PEV.BUTTON_LOCATION.PERPS_HOME,
        }),
      );
    });

    it('does not throw when header is pressed without onSeeAllPress', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(() =>
        fireEvent.press(screen.getByTestId('perps-watchlist-header')),
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Flag disabled — legacy (pre-redesign) path
  // -------------------------------------------------------------------------

  describe('when perps-watchlist-v2-enabled flag is OFF (legacy path)', () => {
    beforeEach(() => {
      (useSelector as jest.Mock).mockImplementation((selector) => {
        if (selector === selectPerpsWatchlistEnabledFlag) return false;
        if (selector === selectPerpsWatchlistMarkets) return [];
        return [];
      });
    });

    it('returns null when markets is empty', () => {
      const { toJSON } = render(<PerpsWatchlistMarkets markets={[]} />);
      expect(toJSON()).toBeNull();
    });

    it('returns null even when suggestedMarkets are provided', () => {
      const { toJSON } = render(
        <PerpsWatchlistMarkets
          markets={[]}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(toJSON()).toBeNull();
    });

    it('renders market rows when markets are present', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
    });

    it('renders the Watchlist section header', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('Watchlist')).toBeOnTheScreen();
    });

    it('renders the section testID', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByTestId('perps-watchlist-section')).toBeOnTheScreen();
    });

    it('does not render suggested markets', () => {
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      for (const market of mockSuggestedMarkets) {
        expect(
          screen.queryByTestId(`perps-market-row-${market.symbol}`),
        ).not.toBeOnTheScreen();
      }
    });

    it('does not render show-more button regardless of market count', () => {
      const manyMarkets = [
        makeMarket('BTC', 'Bitcoin'),
        makeMarket('ETH', 'Ethereum'),
        makeMarket('SOL', 'Solana'),
        makeMarket('AVAX', 'Avalanche'),
        makeMarket('DOT', 'Polkadot'),
      ];
      render(<PerpsWatchlistMarkets markets={manyMarkets} />);
      expect(screen.queryByText(/Show \d+ more/)).not.toBeOnTheScreen();
      expect(screen.queryByText('Show less')).not.toBeOnTheScreen();
      // All markets rendered (no pagination)
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('DOT')).toBeOnTheScreen();
    });

    it('does not render the suggested section or empty-state subtitle', () => {
      render(
        <PerpsWatchlistMarkets
          markets={mockMarkets}
          suggestedMarkets={mockSuggestedMarkets}
        />,
      );
      expect(
        screen.queryByTestId('perps-watchlist-suggested-section'),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByText('Tap + to add a market to your watchlist.'),
      ).not.toBeOnTheScreen();
    });

    it('shows skeleton during loading', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} isLoading />);
      expect(screen.getByTestId('perps-row-skeleton-3')).toBeOnTheScreen();
    });

    it('navigates to market details on row press', () => {
      render(<PerpsWatchlistMarkets markets={mockMarkets} />);
      fireEvent.press(screen.getByTestId('perps-market-row-BTC'));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: mockMarkets[0],
          initialTab: undefined,
          source: undefined,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // enableShowMore prop
  // -------------------------------------------------------------------------

  describe('enableShowMore prop', () => {
    const fiveMarkets = [
      makeMarket('BTC', 'Bitcoin'),
      makeMarket('ETH', 'Ethereum'),
      makeMarket('SOL', 'Solana'),
      makeMarket('AVAX', 'Avalanche'),
      makeMarket('DOT', 'Polkadot'),
    ];

    it('shows all markets without a "Show more" button when enableShowMore is false', () => {
      render(
        <PerpsWatchlistMarkets markets={fiveMarkets} enableShowMore={false} />,
      );
      // All five markets visible
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(screen.getByText('ETH')).toBeOnTheScreen();
      expect(screen.getByText('SOL')).toBeOnTheScreen();
      expect(screen.getByText('AVAX')).toBeOnTheScreen();
      expect(screen.getByText('DOT')).toBeOnTheScreen();
      // No show-more toggle
      expect(screen.queryByText(/Show \d+ more/)).not.toBeOnTheScreen();
      expect(screen.queryByText('Show less')).not.toBeOnTheScreen();
    });

    it('still renders suggestions below watchlist rows when enableShowMore is false', () => {
      render(
        <PerpsWatchlistMarkets
          markets={fiveMarkets}
          suggestedMarkets={mockSuggestedMarkets}
          enableShowMore={false}
        />,
      );
      // All watchlist rows visible (incl. markets beyond INITIAL_DISPLAY_COUNT)
      expect(screen.getByText('DOT')).toBeOnTheScreen();
      // Suggested rows present with add buttons — BNB only exists in suggestions
      expect(
        screen.getByTestId('perps-market-row-BNB-add-button'),
      ).toBeOnTheScreen();
      // No toggle
      expect(screen.queryByText(/Show \d+ more/)).not.toBeOnTheScreen();
    });

    it('defaults to showing show-more toggle when enableShowMore is not specified', () => {
      render(<PerpsWatchlistMarkets markets={fiveMarkets} />);
      expect(screen.getByText('Show 2 more')).toBeOnTheScreen();
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
      expect(
        screen.getByText('Tap + to add a market to your watchlist.'),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText('Start with the most-traded markets'),
      ).not.toBeOnTheScreen();

      rerender(<PerpsWatchlistMarkets markets={mockMarkets} />);
      expect(screen.getByText('BTC')).toBeOnTheScreen();
      expect(
        screen.queryByText('Tap + to add a market to your watchlist.'),
      ).not.toBeOnTheScreen();
    });
  });
});

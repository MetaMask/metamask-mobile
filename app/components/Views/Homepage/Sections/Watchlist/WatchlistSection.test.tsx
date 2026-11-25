import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import WatchlistSection, {
  getSuggestedWatchlistTokens,
} from './WatchlistSection';
import Routes from '../../../../../constants/navigation/Routes';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import type { WatchlistTokenWithBalance } from '../../../../UI/Assets/watchlist/utils/addBalanceToTokens';
import { WatchlistErrorRowTestIds } from '../../../../UI/Watchlist/WatchlistErrorRow.testIds';
import {
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';

let mockIsWatchlistEnabled = true;
let mockIsUnifiedWatchlistEnabled = false;
let mockIsPerpsEnabled = false;
const mockNavigate = jest.fn();
const mockNavigateToMarketDetails = jest.fn();
const mockUseUnifiedWatchlist = jest.fn();
const mockUsePerpsWatchlistActions = jest.fn();
const mockAddToPerpsWatchlist = jest.fn();
const mockRemoveFromPerpsWatchlist = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => {
    const {
      selectIsUnifiedWatchlistActive,
      selectTokenWatchlistEnabled,
      selectUnifiedWatchlistEnabled,
    } = jest.requireMock('../../../../UI/Assets/selectors/featureFlags');
    const { selectPerpsEnabledFlag } = jest.requireMock(
      '../../../../UI/Perps/selectors/featureFlags',
    );
    if (selector === selectIsUnifiedWatchlistActive) {
      return (
        mockIsWatchlistEnabled &&
        mockIsUnifiedWatchlistEnabled &&
        mockIsPerpsEnabled
      );
    }
    if (selector === selectTokenWatchlistEnabled) return mockIsWatchlistEnabled;
    if (selector === selectUnifiedWatchlistEnabled)
      return mockIsUnifiedWatchlistEnabled;
    if (selector === selectPerpsEnabledFlag) return mockIsPerpsEnabled;
    return undefined;
  },
}));

jest.mock('../../../../UI/Assets/selectors/featureFlags', () => ({
  selectIsUnifiedWatchlistActive: jest.fn(),
  selectTokenWatchlistEnabled: jest.fn(),
  selectUnifiedWatchlistEnabled: jest.fn(),
}));

jest.mock('../../../../UI/Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../../../UI/Watchlist/hooks/useUnifiedWatchlist', () => ({
  useUnifiedWatchlist: () => mockUseUnifiedWatchlist(),
}));

jest.mock('../../../../UI/Perps/hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketDetails: mockNavigateToMarketDetails,
  }),
}));

jest.mock('../../../../UI/Perps/hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: (...args: unknown[]) => {
    mockUsePerpsWatchlistActions(...args);
    return {
      addToWatchlist: mockAddToPerpsWatchlist,
      removeFromWatchlist: mockRemoveFromPerpsWatchlist,
    };
  },
}));

jest.mock(
  '../../../../UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem',
  () => {
    const { Pressable, Text } = jest.requireActual('react-native');

    return ({
      market,
      onPress,
    }: {
      market: PerpsMarketData;
      onPress?: (market: PerpsMarketData) => void;
    }) => (
      <Pressable
        testID={`perps-home-row-${market.symbol}`}
        onPress={() => onPress?.(market)}
      >
        <Text>{market.symbol}</Text>
      </Pressable>
    );
  },
);

const mockToast = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  return {
    ...actualDesignSystem,
    toast: Object.assign((...args: unknown[]) => mockToast(...args), {
      dismiss: jest.fn(),
    }),
  };
});

const mockUseTokenWatchlistQuery = jest.fn();
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery',
  () => ({
    useTokenWatchlistQuery: () => mockUseTokenWatchlistQuery(),
  }),
);

const mockUseSuggestedWatchlistItemsQuery = jest.fn();
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useSuggestedWatchlistItemsQuery',
  () => ({
    useSuggestedWatchlistItemsQuery: () =>
      mockUseSuggestedWatchlistItemsQuery(),
  }),
);

let mockWatchlistAssetIds: string[] = [];
jest.mock('../../../../UI/Assets/watchlist/hooks/useTokenWatchlist', () => ({
  useTokenWatchlistAssetIds: () => mockWatchlistAssetIds,
}));

const mockMutate = jest.fn();
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistMutations',
  () => ({
    useTokenWatchlistAddItemMutation: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
  }),
);

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'mock' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    WATCHLIST: 'watchlist',
  },
}));

jest.mock('../../hooks/useSectionPerformance', () => ({
  useSectionPerformance: jest.fn(),
}));

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => {
    const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({
      token,
      endAction,
    }: {
      token: { name: string };
      endAction?: { type: string; onPress: () => void };
    }) =>
      ReactActual.createElement(
        View,
        { testID: `row-${token.name}` },
        ReactActual.createElement(Text, null, token.name),
        endAction?.type === 'watchlist'
          ? ReactActual.createElement(TouchableOpacity, {
              testID: `row-add-${token.name}`,
              onPress: () => endAction.onPress(),
            })
          : null,
      );
    Mock.displayName = 'TrendingTokenRowItem';
    return {
      __esModule: true,
      default: ReactActual.memo(Mock),
    };
  },
);

jest.mock(
  '../../../../UI/Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = () =>
      ReactActual.createElement(View, { testID: 'trending-skeleton' });
    Mock.displayName = 'TrendingTokensSkeleton';
    return {
      __esModule: true,
      default: ReactActual.memo(Mock),
    };
  },
);

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingTokenPress/useTrendingTokenPress',
  () => ({
    useTrendingTokenPress: () => ({ onPress: jest.fn() }),
  }),
);

jest.mock(
  '../../../../../images/watchlist-empty-dark.svg',
  () => 'WatchlistEmptyDark',
);
jest.mock(
  '../../../../../images/watchlist-empty-light.svg',
  () => 'WatchlistEmptyLight',
);

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  ...jest.requireActual('@metamask/design-system-twrnc-preset'),
  Theme: { Dark: 'dark', Light: 'light' },
  useTheme: () => 'light',
}));

jest.mock('../../../Wallet/WalletView.testIds', () => ({
  WalletViewSelectorsIDs: {
    HOMEPAGE_SECTION_TITLE: (name: string) => `homepage-section-title-${name}`,
    HOMEPAGE_CONTAINER: 'homepage-container',
  },
}));

const makeToken = (name: string, isInWallet: boolean) => ({
  assetId: `eip155:1/erc20:0x${name}`,
  symbol: name.toUpperCase(),
  name,
  decimals: 18,
  balance: isInWallet ? '100' : '0',
  isInWallet,
  marketData: {
    price: 100,
    pricePercentChange24h: 1.5,
    marketCap: 1_000_000,
    totalVolume: 500_000,
  },
});
const makeWatchlistToken = (name: string) => makeToken(name, true);
const makeSuggestedToken = (name: string) => makeToken(name, false);
const makeSuggestedPool = (...names: string[]) =>
  names.map((name) => makeToken(name, false));

describe('WatchlistSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWatchlistEnabled = true;
    mockIsUnifiedWatchlistEnabled = false;
    mockIsPerpsEnabled = false;
    mockWatchlistAssetIds = [];
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  const renderSection = () =>
    render(<WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />);

  it('passes explicit TTC demand and cache metadata', () => {
    render(<WatchlistSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(jest.mocked(useSectionPerformance)).toHaveBeenCalledWith({
      sectionId: 'watchlist',
      contentReady: true,
      isEmpty: true,
      demandStarted: true,
      cacheState: 'warm',
      isLoading: false,
      enabled: true,
    });
  });

  it('returns null when feature flag is off', () => {
    mockIsWatchlistEnabled = false;

    const { toJSON } = renderSection();
    expect(toJSON()).toBeNull();
  });

  it('shows skeletons while loading', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    });

    const { getAllByTestId } = renderSection();
    expect(getAllByTestId('trending-skeleton')).toHaveLength(5);
  });

  it('renders up to 5 suggested tokens with add buttons when the watchlist is empty', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: makeSuggestedPool(
        'bitcoin',
        'ethereum',
        'solana',
        'bnb',
        'pepe',
        'doge',
      ),
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = renderSection();

    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(queryByTestId('watchlist-suggested-header')).not.toBeOnTheScreen();
    expect(getByTestId('row-bitcoin')).toBeOnTheScreen();
    expect(getByTestId('row-ethereum')).toBeOnTheScreen();
    expect(getByTestId('row-solana')).toBeOnTheScreen();
    expect(getByTestId('row-bnb')).toBeOnTheScreen();
    expect(getByTestId('row-pepe')).toBeOnTheScreen();
    expect(queryByTestId('row-doge')).not.toBeOnTheScreen();
    expect(getByTestId('row-add-bitcoin')).toBeOnTheScreen();
    expect(getByTestId('row-add-pepe')).toBeOnTheScreen();
  });

  it('renders the Suggested sub-header and 5-2=3 suggestions when the watchlist has 2 items', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth'), makeWatchlistToken('btc')],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockWatchlistAssetIds = ['eip155:1/erc20:0xeth', 'eip155:1/erc20:0xbtc'];
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      // Watched tokens can appear in the pool and must be filtered out.
      data: makeSuggestedPool(
        'eth',
        'btc',
        'bitcoin',
        'ethereum',
        'solana',
        'bnb',
      ),
      isLoading: false,
    });

    const { getByTestId, getByText, queryByTestId } = renderSection();

    expect(getByTestId('row-btc')).toBeOnTheScreen();
    expect(getByTestId('row-eth')).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-header')).toBeOnTheScreen();
    expect(getByText('Suggested')).toBeOnTheScreen();
    expect(getByTestId('row-bitcoin')).toBeOnTheScreen();
    expect(getByTestId('row-ethereum')).toBeOnTheScreen();
    expect(getByTestId('row-solana')).toBeOnTheScreen();
    expect(queryByTestId('row-bnb')).not.toBeOnTheScreen();
    expect(queryByTestId('row-add-btc')).not.toBeOnTheScreen();
    expect(queryByTestId('row-add-eth')).not.toBeOnTheScreen();
    expect(getByTestId('row-add-bitcoin')).toBeOnTheScreen();
    expect(getByTestId('row-add-solana')).toBeOnTheScreen();
  });

  it('adds a suggested token to the watchlist when its add button is pressed', () => {
    const suggested = makeSuggestedToken('bitcoin');
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [suggested],
      isLoading: false,
    });

    const { getByTestId } = renderSection();

    fireEvent.press(getByTestId('row-add-bitcoin'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(
      suggested,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('does not toast on a successful homepage add — the optimistic move is the feedback', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeSuggestedToken('bitcoin')],
      isLoading: false,
    });

    const { getByTestId } = renderSection();

    fireEvent.press(getByTestId('row-add-bitcoin'));

    const { onSuccess } = mockMutate.mock.calls[0][1] as {
      onSuccess: () => void;
    };
    act(() => {
      onSuccess();
    });

    expect(mockToast).not.toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock' });
  });

  it('shows suggested-token skeletons while suggestions are loading', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getAllByTestId, getByTestId } = renderSection();

    expect(getByTestId('watchlist-suggested-skeleton')).toBeOnTheScreen();
    expect(getAllByTestId('trending-skeleton')).toHaveLength(5);
  });

  it('renders the static fallback below the header when no suggested tokens are available', () => {
    const { getByTestId, getByText, queryByTestId } = renderSection();

    expect(getByTestId('watchlist-empty-fallback')).toBeOnTheScreen();
    expect(getByTestId('watchlist-empty-icon')).toBeOnTheScreen();
    expect(getByText('You have no watchlist items yet')).toBeOnTheScreen();
    expect(queryByTestId('watchlist-suggested-section')).not.toBeOnTheScreen();
    expect(queryByTestId('row-add-bitcoin')).not.toBeOnTheScreen();
  });

  it('renders up to 5 tokens when watchlist has items (newest first)', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
        makeWatchlistToken('doge'),
        makeWatchlistToken('ada'),
        makeWatchlistToken('link'),
      ],
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderSection();

    // Storage appends newest last; section reverses so newest appears first.
    expect(getByTestId('row-link')).toBeDefined();
    expect(getByTestId('row-ada')).toBeDefined();
    expect(getByTestId('row-doge')).toBeDefined();
    expect(getByTestId('row-sol')).toBeDefined();
    expect(getByTestId('row-btc')).toBeDefined();
    expect(queryByTestId('row-eth')).toBeNull();
  });

  it('hides the suggested section once the watchlist holds 5 tokens', () => {
    const names = ['eth', 'btc', 'sol', 'doge', 'ada'];
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: names.map(makeWatchlistToken),
      isLoading: false,
      refetch: jest.fn(),
    });
    mockWatchlistAssetIds = names.map((name) => `eip155:1/erc20:0x${name}`);
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: makeSuggestedPool('bitcoin', 'ethereum', 'solana'),
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = renderSection();

    expect(getByTestId('row-eth')).toBeOnTheScreen();
    expect(getByTestId('row-ada')).toBeOnTheScreen();
    expect(queryByTestId('watchlist-suggested-section')).not.toBeOnTheScreen();
    expect(queryByTestId('watchlist-suggested-header')).not.toBeOnTheScreen();
    expect(queryByTestId('row-add-bitcoin')).not.toBeOnTheScreen();
  });

  it('renders section header with watchlist testID', () => {
    const { getByTestId } = renderSection();
    expect(getByTestId('homepage-section-title-watchlist')).toBeDefined();
  });

  it('navigates to the watchlist full view when the section header is pressed', () => {
    const { getByTestId } = renderSection();

    fireEvent.press(getByTestId('homepage-section-title-watchlist'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.WALLET.WATCHLIST_FULL_VIEW,
    );
  });

  it('uses wallet home attribution for Perps rows', () => {
    const market = {
      symbol: 'BTC',
      name: 'Bitcoin Perpetual',
    } as PerpsMarketData;
    mockIsUnifiedWatchlistEnabled = true;
    mockIsPerpsEnabled = true;
    mockUseUnifiedWatchlist.mockReturnValue({
      items: [
        {
          kind: 'perp',
          key: 'perp:btc',
          symbol: 'BTC',
          status: 'resolved',
          market,
        },
      ],
      tokens: { items: [], error: null },
      perps: { items: [], error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canUseMotion: false,
      canRefresh: false,
      canFetchSuggestions: false,
      tokenMembershipAssetIds: [],
      perpsMembershipSymbols: ['BTC'],
      tokenCount: 0,
      perpsCount: 1,
      isInitialLoading: false,
      isOrderReady: false,
      orderError: null,
      persistOrder: jest.fn(),
      appendOrderKey: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = renderSection();

    expect(mockUsePerpsWatchlistActions).toHaveBeenCalledWith(
      PERPS_EVENT_VALUE.SOURCE.WALLET_HOME,
      { showToasts: false },
    );

    fireEvent.press(getByTestId('perps-home-row-BTC'));

    expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
      market,
      PERPS_EVENT_VALUE.SOURCE.WALLET_HOME,
    );
  });

  it('surfaces order load errors with a retry action in unified mode', () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    mockIsUnifiedWatchlistEnabled = true;
    mockIsPerpsEnabled = true;
    mockUseUnifiedWatchlist.mockReturnValue({
      items: [],
      tokens: { items: [], error: null },
      perps: { items: [], error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canUseMotion: false,
      canRefresh: true,
      canFetchSuggestions: false,
      tokenMembershipAssetIds: [],
      perpsMembershipSymbols: [],
      tokenCount: 0,
      perpsCount: 0,
      isInitialLoading: false,
      isOrderReady: false,
      orderError: 'Failed to read watchlist order',
      persistOrder: jest.fn(),
      appendOrderKey: jest.fn(),
      refresh: mockRefresh,
    });

    const { getByTestId, getByText } = renderSection();

    expect(getByTestId(WatchlistErrorRowTestIds.ROW)).toBeTruthy();
    fireEvent.press(getByText('Try again'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});

describe('getSuggestedWatchlistTokens', () => {
  const makeSuggested = (symbol: string): WatchlistTokenWithBalance =>
    ({
      assetId: `eip155:1/erc20:0x${symbol}`,
      symbol,
      name: symbol,
      decimals: 18,
      balance: '0',
      isInWallet: false,
    }) as unknown as WatchlistTokenWithBalance;

  const buildPool = (symbols: string[]): WatchlistTokenWithBalance[] =>
    symbols.map(makeSuggested);

  const buildWatchedIds = (
    pool: WatchlistTokenWithBalance[],
    watchedSymbols: string[],
  ): string[] =>
    pool
      .filter((token) => watchedSymbols.includes(String(token.symbol)))
      .map((token) => String(token.assetId));

  const defaultPoolSymbols = ['a', 'b', 'c', 'd', 'e', 'f'];

  interface SuggestedTokensTestCase {
    description: string;
    poolSymbols: string[];
    watchedSymbols: string[];
    expectedSymbols: string[];
    limit?: number;
    uppercaseWatchedIds?: boolean;
  }

  const testCases: SuggestedTokensTestCase[] = [
    {
      description:
        'shows the full limit of suggestions when the watchlist is empty',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: [],
      expectedSymbols: ['a', 'b', 'c', 'd', 'e'],
    },
    {
      description:
        'shows limit minus watchlist count suggestions (2 watched → 3)',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a', 'b'],
      expectedSymbols: ['c', 'd', 'e'],
    },
    {
      description: 'excludes already-watchlisted tokens from the suggestions',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['d'],
      expectedSymbols: ['a', 'b', 'c', 'e'],
    },
    {
      description: 'compares asset IDs case-insensitively',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a'],
      expectedSymbols: ['b', 'c', 'd', 'e'],
      uppercaseWatchedIds: true,
    },
    {
      description: 'shows no suggestions once the watchlist reaches the limit',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a', 'b', 'c', 'd', 'e'],
      expectedSymbols: [],
    },
    {
      description: 'shows no suggestions when the watchlist exceeds the limit',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a', 'b', 'c', 'd', 'e', 'f'],
      expectedSymbols: [],
    },
    {
      description:
        'returns fewer suggestions when the pool is smaller than the target',
      poolSymbols: ['a'],
      watchedSymbols: [],
      expectedSymbols: ['a'],
    },
    {
      description:
        'returns an empty list when every suggested token is watched',
      poolSymbols: ['a', 'b'],
      watchedSymbols: ['a', 'b'],
      expectedSymbols: [],
    },
    {
      description: 'honors a custom limit',
      poolSymbols: defaultPoolSymbols,
      watchedSymbols: ['a'],
      expectedSymbols: ['b', 'c'],
      limit: 3,
    },
  ];

  it.each(testCases)('$description', ({ ...testCase }) => {
    const pool = buildPool(testCase.poolSymbols);
    let watchedIds = buildWatchedIds(pool, testCase.watchedSymbols);
    if (testCase.uppercaseWatchedIds) {
      watchedIds = watchedIds.map((id) => id.toUpperCase());
    }

    const result = getSuggestedWatchlistTokens(
      pool,
      watchedIds,
      testCase.limit,
    );

    expect(result.map((token) => token.symbol)).toEqual(
      testCase.expectedSymbols,
    );
  });

  it('caps at zero (no floor-of-one) once the watchlist is full', () => {
    const pool = buildPool(defaultPoolSymbols);
    const watchedIds = buildWatchedIds(pool, ['a', 'b', 'c', 'd', 'e']);

    expect(getSuggestedWatchlistTokens(pool, watchedIds)).toEqual([]);
  });
});

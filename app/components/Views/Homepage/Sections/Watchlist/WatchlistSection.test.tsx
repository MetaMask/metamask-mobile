import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistSection from './WatchlistSection';
import Routes from '../../../../../constants/navigation/Routes';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';

let mockIsWatchlistEnabled = true;
const mockNavigate = jest.fn();

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
    const { selectTokenWatchlistEnabled } = jest.requireMock(
      '../../../../UI/Assets/selectors/featureFlags',
    );
    if (selector === selectTokenWatchlistEnabled) return mockIsWatchlistEnabled;
    return undefined;
  },
}));

jest.mock('../../../../UI/Assets/selectors/featureFlags', () => ({
  selectTokenWatchlistEnabled: jest.fn(),
}));

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

const mockAddMutation = { mutate: jest.fn() };
jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistMutations',
  () => ({
    useTokenWatchlistAddItemMutation: () => mockAddMutation,
  }),
);

const mockUseTokenWatchlistAssetIds = jest.fn();
jest.mock('../../../../UI/Assets/watchlist/hooks/useTokenWatchlist', () => ({
  useTokenWatchlistAssetIds: () => mockUseTokenWatchlistAssetIds(),
}));

const mockUseUnifiedWatchlist = jest.fn();
jest.mock('../../../../UI/Watchlist/hooks/useUnifiedWatchlist', () => ({
  useUnifiedWatchlist: () => mockUseUnifiedWatchlist(),
}));

const mockAddPerp = jest.fn();
jest.mock('../../../../UI/Perps/hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: () => ({
    addToWatchlist: mockAddPerp,
  }),
}));

jest.mock('../../../../UI/Perps/hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketDetails: jest.fn(),
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
    const { Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({ token }: { token: { name: string } }) =>
      ReactActual.createElement(
        View,
        { testID: `row-${token.name}` },
        ReactActual.createElement(Text, null, token.name),
      );
    Mock.displayName = 'TrendingTokenRowItem';
    return {
      __esModule: true,
      default: ReactActual.memo(Mock),
    };
  },
);

jest.mock('../../../../UI/Watchlist/WatchlistTokenRowItem', () => {
  const { Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({ token }: { token: { name: string } }) =>
    ReactActual.createElement(
      View,
      { testID: `row-${token.name}` },
      ReactActual.createElement(Text, null, token.name),
    );
  Mock.displayName = 'WatchlistTokenRowItem';
  return {
    __esModule: true,
    default: ReactActual.memo(Mock),
  };
});

const mockPerpsMarketRowItem = jest.fn();

jest.mock(
  '../../../../UI/Perps/components/PerpsMarketRowItem/PerpsMarketRowItem',
  () => {
    const { Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');

    const Mock = ({
      market,
      showBadge,
    }: {
      market: { symbol: string };
      showBadge?: boolean;
    }) => {
      mockPerpsMarketRowItem({ market, showBadge });
      return ReactActual.createElement(
        View,
        { testID: `perps-row-${market.symbol}` },
        ReactActual.createElement(Text, null, market.symbol),
      );
    };

    Mock.displayName = 'PerpsMarketRowItem';
    return { __esModule: true, default: ReactActual.memo(Mock) };
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
const makeWatchlistPerp = (symbol: string) => ({
  kind: 'perp' as const,
  key: `perp:hyperliquid:${symbol}`,
  symbol,
  status: 'resolved' as const,
  market: { id: `hyperliquid:${symbol}`, symbol, name: symbol },
});

describe('WatchlistSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWatchlistEnabled = true;
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseTokenWatchlistAssetIds.mockReturnValue([]);
    mockUseUnifiedWatchlist.mockImplementation(() => {
      const tokenQuery = mockUseTokenWatchlistQuery();
      const tokenItems = (tokenQuery.data ?? [])
        .slice()
        .reverse()
        .map((token: { assetId: string }) => ({
          kind: 'token' as const,
          key: `token:${token.assetId.toLowerCase()}`,
          assetId: token.assetId,
          token,
        }));

      return {
        isUnifiedEnabled: false,
        isPerpsEnabled: false,
        orderedItems: tokenItems,
        tokens: {
          items: tokenItems,
          isLoading: tokenQuery.isLoading,
          error: null,
        },
        perps: { items: [], isLoading: false, error: null },
        canUseLivePerpsPrices: false,
        canRefresh: true,
        isInitialLoading: false,
        persistOrder: jest.fn(),
        refresh: jest.fn(),
      };
    });
  });

  const renderSection = () =>
    render(<WatchlistSection sectionIndex={1} totalSectionsLoaded={5} />);

  it('keeps the shared performance hook on its legacy metadata contract', () => {
    render(<WatchlistSection sectionIndex={0} totalSectionsLoaded={1} />);

    expect(jest.mocked(useSectionPerformance)).toHaveBeenCalledWith({
      sectionId: 'watchlist',
      contentReady: true,
      isEmpty: true,
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

  it('hides retry when token metadata is unavailable offline', () => {
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: false,
      isPerpsEnabled: false,
      orderedItems: [],
      isOrderLoading: false,
      tokens: {
        items: [],
        isLoading: false,
        error: 'Watchlist metadata is unavailable offline',
      },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: false,
      canFetchSuggestions: false,
      tokenMembershipAssetIds: ['eip155:1/slip44:60'],
      isTokenMetadataComplete: false,
      tokenCount: 1,
      perpsCount: 0,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByText, queryByText } = renderSection();

    expect(getByText('Unable to load watchlist items')).toBeOnTheScreen();
    expect(queryByText('Try again')).not.toBeOnTheScreen();
  });

  it('shows the error row alongside partially hydrated legacy tokens', () => {
    const token = makeWatchlistToken('watched');
    const tokenItem = {
      kind: 'token' as const,
      key: `token:${token.assetId.toLowerCase()}`,
      assetId: token.assetId,
      token,
    };
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: false,
      isPerpsEnabled: false,
      orderedItems: [tokenItem],
      isOrderLoading: false,
      tokens: {
        items: [tokenItem],
        isLoading: false,
        error: 'Watchlist token metadata is incomplete',
      },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      canFetchSuggestions: true,
      tokenMembershipAssetIds: [token.assetId, 'eip155:1/erc20:0xmissing'],
      isTokenMetadataComplete: false,
      tokenCount: 2,
      perpsCount: 0,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('watchlist-error-row')).toBeOnTheScreen();
    expect(getByTestId('row-watched')).toBeOnTheScreen();
  });

  it('interleaves token and Perps rows and caps the homepage preview at five', () => {
    const tokens = ['eth', 'btc', 'sol', 'arb'].map(makeWatchlistToken);
    const perps = ['ETH', 'BTC'].map(makeWatchlistPerp);

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      tokens: {
        items: tokens.map((token) => ({
          kind: 'token' as const,
          key: `token:${token.assetId.toLowerCase()}`,
          assetId: token.assetId,
          token,
        })),
        isLoading: false,
        error: null,
      },
      perps: { items: perps, isLoading: false, error: null },
      orderedItems: [
        {
          kind: 'token' as const,
          key: `token:${tokens[0].assetId.toLowerCase()}`,
          assetId: tokens[0].assetId,
          token: tokens[0],
        },
        perps[0],
        {
          kind: 'token' as const,
          key: `token:${tokens[1].assetId.toLowerCase()}`,
          assetId: tokens[1].assetId,
          token: tokens[1],
        },
        perps[1],
        ...tokens.slice(2).map((token) => ({
          kind: 'token' as const,
          key: `token:${token.assetId.toLowerCase()}`,
          assetId: token.assetId,
          token,
        })),
      ],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderSection();

    expect(getByTestId('row-eth')).toBeDefined();
    expect(getByTestId('perps-row-ETH')).toBeDefined();
    expect(getByTestId('row-btc')).toBeDefined();
    expect(getByTestId('perps-row-BTC')).toBeDefined();
    expect(mockPerpsMarketRowItem.mock.calls).toHaveLength(2);
    expect(
      mockPerpsMarketRowItem.mock.calls.every(
        ([{ showBadge }]) => showBadge === false,
      ),
    ).toBe(true);
    expect(getByTestId('row-sol')).toBeDefined();
    expect(queryByTestId('row-arb')).toBeNull();
  });

  it('renders the static fallback when the watchlist has no saved items', () => {
    const { getByTestId, getByText, queryByTestId } = renderSection();

    expect(getByTestId('watchlist-empty-fallback')).toBeOnTheScreen();
    expect(getByTestId('watchlist-empty-icon')).toBeOnTheScreen();
    expect(getByText('You have no watchlist items yet')).toBeOnTheScreen();
    expect(queryByTestId('row-bitcoin')).not.toBeOnTheScreen();
  });

  it('renders legacy suggestions when the unified rollout is disabled', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeWatchlistToken('suggested')],
      isLoading: false,
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(getByTestId('row-suggested')).toBeOnTheScreen();
  });

  it('renders legacy suggestions below saved items', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('watched')],
      isLoading: false,
      refetch: jest.fn(),
    });
    mockUseTokenWatchlistAssetIds.mockReturnValue(['watched']);
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeWatchlistToken('suggested')],
      isLoading: false,
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('row-watched')).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(getByTestId('row-suggested')).toBeOnTheScreen();
  });

  it('renders suggested Perps in the unified suggestion group', () => {
    const suggestedPerp = makeWatchlistPerp('SOL').market;

    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [suggestedPerp],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(getByTestId('perps-row-SOL')).toBeOnTheScreen();
    expect(mockPerpsMarketRowItem).toHaveBeenCalledWith(
      expect.objectContaining({ showBadge: false }),
    );
  });

  it('renders unified suggestions below saved items', () => {
    const watchedToken = makeWatchlistToken('watched');
    const watchedItem = {
      kind: 'token' as const,
      key: `token:${watchedToken.assetId.toLowerCase()}`,
      assetId: watchedToken.assetId,
      token: watchedToken,
    };

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [watchedItem],
      isOrderLoading: false,
      tokens: { items: [watchedItem], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [makeWatchlistPerp('SOL').market],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('row-watched')).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
    expect(getByTestId('perps-row-SOL')).toBeOnTheScreen();
  });

  it('keeps the homepage suggestion group capped at five items', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: Array.from(
        { length: 12 },
        (_, index) => makeWatchlistPerp(`SUGGESTED-${index}`).market,
      ),
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderSection();

    expect(getByTestId('perps-row-SUGGESTED-0')).toBeOnTheScreen();
    expect(getByTestId('perps-row-SUGGESTED-4')).toBeOnTheScreen();
    expect(queryByTestId('perps-row-SUGGESTED-5')).not.toBeOnTheScreen();
  });

  it('uses authoritative membership to limit suggestions during partial hydration', () => {
    const watchedToken = makeWatchlistToken('watched');
    const watchedItem = {
      kind: 'token' as const,
      key: `token:${watchedToken.assetId.toLowerCase()}`,
      assetId: watchedToken.assetId,
      token: watchedToken,
    };
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [watchedItem],
      tokens: { items: [watchedItem], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      canFetchSuggestions: true,
      tokenMembershipAssetIds: Array.from(
        { length: 5 },
        (_, index) => `eip155:1/erc20:0x${index}`,
      ),
      isTokenMetadataComplete: false,
      tokenCount: 5,
      perpsCount: 0,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: Array.from({ length: 5 }, (_, index) =>
        makeWatchlistToken(`suggested-${index}`),
      ),
      isLoading: false,
    });

    const { queryByTestId } = renderSection();

    expect(queryByTestId('watchlist-suggested-section')).not.toBeOnTheScreen();
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

  it('renders only saved tokens when the watchlist holds 5 tokens', () => {
    const names = ['eth', 'btc', 'sol', 'doge', 'ada'];
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: names.map(makeWatchlistToken),
      isLoading: false,
      refetch: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderSection();

    expect(getByTestId('row-eth')).toBeOnTheScreen();
    expect(getByTestId('row-ada')).toBeOnTheScreen();
    expect(queryByTestId('row-bitcoin')).not.toBeOnTheScreen();
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
});

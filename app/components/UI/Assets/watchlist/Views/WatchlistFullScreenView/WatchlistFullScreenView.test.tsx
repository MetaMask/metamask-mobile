import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ImpactMoment } from '../../../../../../util/haptics';
import WatchlistFullScreenView from './WatchlistFullScreenView';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { selectTokenWatchlistEnabled } from '../../../selectors/featureFlags';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUseTokenWatchlistQuery = jest.fn();
const mockUseUnifiedWatchlist = jest.fn();
const mockUseSuggestedWatchlistItemsQuery = jest.fn();
const mockUpdateListMutate = jest.fn();
const mockAddTokenMutate = jest.fn();
const mockUseTrackWatchlistPageViewed = jest.fn();
const mockNavigateToMarketDetails = jest.fn();
const mockAddPerp = jest.fn();
const mockRemovePerp = jest.fn().mockResolvedValue(true);
const mockTrackEvent = jest.fn();
const mockAddAnalyticsProperties = jest.fn(() => ({
  build: jest.fn(),
}));

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({ params: { source: 'watchlist_homepage' } }),
}));

jest.mock('../../hooks/useTokenWatchlistQuery', () => ({
  useTokenWatchlistQuery: () => mockUseTokenWatchlistQuery(),
}));

jest.mock('../../hooks/useSuggestedWatchlistItemsQuery', () => ({
  useSuggestedWatchlistItemsQuery: (options: unknown) =>
    mockUseSuggestedWatchlistItemsQuery(options),
}));

jest.mock('../../../../Watchlist/hooks/useUnifiedWatchlist', () => ({
  useUnifiedWatchlist: () => mockUseUnifiedWatchlist(),
}));

jest.mock('../../../../Watchlist/WatchlistPerpsProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../Perps/hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketDetails: mockNavigateToMarketDetails,
  }),
}));

jest.mock('../../../../Perps/hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: () => ({
    addToWatchlist: mockAddPerp,
    removeFromWatchlist: mockRemovePerp,
  }),
}));

jest.mock('../../../../../../util/haptics', () => ({
  fireImpact: jest.fn(),
  ImpactMoment: { SliderGrip: 'sliderGrip' },
}));

const getMockFireImpact = (): jest.Mock =>
  jest.requireMock('../../../../../../util/haptics').fireImpact;

jest.mock(
  '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem',
  () => {
    const { Pressable, Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');

    const Mock = ({
      market,
      onPress,
      onWatchlistPress,
      onLongPress,
      isWatchlisted,
      twClassName,
      showBadge,
    }: {
      market: { symbol: string };
      onPress?: (market: { symbol: string }) => void;
      onWatchlistPress?: (market: { symbol: string }) => void;
      onLongPress?: () => void;
      isWatchlisted?: boolean;
      twClassName?: string;
      showBadge?: boolean;
    }) =>
      ReactActual.createElement(
        View,
        {
          testID: `mock-perps-row-${market.symbol}`,
          twClassName,
          showBadge,
        },
        ReactActual.createElement(Pressable, {
          testID: `mock-perps-drag-${market.symbol}`,
          onLongPress,
        }),
        ReactActual.createElement(Text, null, market.symbol),
        ReactActual.createElement(Pressable, {
          testID: `mock-perps-open-${market.symbol}`,
          onPress: () => onPress?.(market),
        }),
        onWatchlistPress
          ? ReactActual.createElement(Pressable, {
              testID: `mock-perps-watchlist-${market.symbol}`,
              onPress: () => onWatchlistPress(market),
              accessibilityState: { selected: isWatchlisted },
            })
          : null,
      );

    Mock.displayName = 'PerpsMarketRowItem';
    return { __esModule: true, default: Mock };
  },
);

jest.mock('../../../../Watchlist/WatchlistTokenRowItem', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const Mock = ({
    token,
    onLongPress,
    twClassName,
    accessibilityActions,
    onAccessibilityAction,
  }: {
    token: { assetId: string; symbol: string };
    onLongPress?: () => void;
    twClassName?: string;
    accessibilityActions?: { name: string; label?: string }[];
    onAccessibilityAction?: (event: {
      nativeEvent: { actionName: string };
    }) => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: `mock-token-row-${token.assetId}`, twClassName },
      ReactActual.createElement(Pressable, {
        testID: `mock-token-drag-${token.assetId}`,
        onLongPress,
        accessibilityActions,
        onAccessibilityAction,
      }),
      ReactActual.createElement(Text, null, token.symbol),
    );

  Mock.displayName = 'WatchlistTokenRowItem';
  return { __esModule: true, default: Mock };
});

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: jest.fn(() => ({
      addProperties: mockAddAnalyticsProperties,
    })),
  }),
}));

jest.mock('../../hooks/useTokenWatchlistMutations', () => ({
  useTokenWatchlistAddItemMutation: () => ({
    mutate: mockAddTokenMutate,
  }),
  useTokenWatchlistRemoveItemMutation: () => ({
    mutate: mockUpdateListMutate,
  }),
  useTokenWatchlistUpdateListMutation: () => ({
    mutate: mockUpdateListMutate,
    mutateAsync: mockUpdateListMutate,
  }),
}));

jest.mock('../../hooks/useTrackWatchlistPageViewed', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseTrackWatchlistPageViewed(...args),
}));

jest.mock('react-native-reorderable-list', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  interface MockItem {
    key?: string;
    assetId?: string;
  }

  const ReorderableList = ({
    data,
    renderItem,
    testID,
    onReorder,
    dragEnabled,
    style,
    contentContainerStyle,
    ListFooterComponent,
  }: {
    data: MockItem[];
    renderItem: (info: { item: MockItem; index: number }) => React.ReactNode;
    testID?: string;
    onReorder?: (event: { from: number; to: number }) => void;
    dragEnabled?: boolean;
    style?: unknown;
    contentContainerStyle?: unknown;
    ListFooterComponent?: React.ReactNode;
  }) =>
    ReactActual.createElement(
      View,
      { testID, style, contentContainerStyle, dragEnabled },
      data.map((item, index) =>
        ReactActual.createElement(
          View,
          {
            key: item.key ?? item.assetId,
            testID: `reorderable-item-${item.key ?? item.assetId}`,
          },
          renderItem({ item, index }),
        ),
      ),
      ListFooterComponent,
      onReorder
        ? ReactActual.createElement(Pressable, {
            testID: 'mock-reorder-trigger',
            onPress: () => onReorder({ from: 0, to: 1 }),
          })
        : null,
    );

  return {
    __esModule: true,
    default: ReorderableList,
    reorderItems: <T,>(arr: T[], from: number, to: number) => {
      const result = [...arr];
      const [removed] = result.splice(from, 1);
      result.splice(to, 0, removed);
      return result;
    },
    useReorderableDrag: () => jest.fn(),
  };
});
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
  Reanimated.useReducedMotion = jest.fn(() => false);
  return Reanimated;
});

jest.mock('../../components/WatchlistEmptyCTA', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = () =>
    ReactActual.createElement(View, { testID: 'watchlist-empty-cta' });
  Mock.displayName = 'WatchlistEmptyCTA';
  return Mock;
});

jest.mock('../../../../Watchlist/WatchlistSuggestedSection', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const Mock = ({
    rows,
    showPerpBadge,
    onAddPerpPress,
  }: {
    rows: {
      kind: 'token' | 'perp';
      market?: { symbol: string };
    }[];
    showPerpBadge?: boolean;
    onAddPerpPress?: (market: { symbol: string }) => void;
  }) => {
    const perpRows = rows.filter(
      (
        row,
      ): row is {
        kind: 'perp';
        market: { symbol: string };
      } => row.kind === 'perp' && row.market !== undefined,
    );

    return ReactActual.createElement(
      View,
      {
        testID: 'watchlist-suggested-section',
        showPerpBadge,
      },
      ReactActual.createElement(
        Text,
        { testID: 'suggested-token-count' },
        String(rows.filter((row) => row.kind === 'token').length),
      ),
      ReactActual.createElement(
        Text,
        { testID: 'suggested-perp-count' },
        String(perpRows.length),
      ),
      ...perpRows.map((row) =>
        ReactActual.createElement(Pressable, {
          key: row.market.symbol,
          testID: `suggested-perp-add-${row.market.symbol}`,
          onPress: () => onAddPerpPress?.(row.market),
        }),
      ),
    );
  };

  Mock.displayName = 'WatchlistSuggestedSection';
  return { __esModule: true, default: Mock };
});

jest.mock('./WatchlistSearchContent', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({ onDismiss }: { onDismiss: () => void }) =>
    ReactActual.createElement(
      View,
      { testID: 'watchlist-search-content' },
      ReactActual.createElement(Pressable, {
        testID: 'watchlist-search-dismiss',
        onPress: onDismiss,
      }),
    );
  Mock.displayName = 'WatchlistSearchContent';
  return Mock;
});

jest.mock(
  '../../../../Trending/components/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = () =>
      ReactActual.createElement(View, { testID: 'trending-skeleton' });
    Mock.displayName = 'TrendingTokensSkeleton';
    return Mock;
  },
);

const makeWatchlistToken = (name: string) => ({
  assetId: `eip155:1/erc20:0x${name}`,
  symbol: name.toUpperCase(),
  name,
  decimals: 18,
  balance: '100',
  isInWallet: true,
  marketData: {
    price: 100,
    pricePercentChange24h: 1.5,
    marketCap: 1_000_000,
    totalVolume: 500_000,
  },
});

const makeWatchlistPerp = (symbol: string) => ({
  id: `hyperliquid:${symbol}`,
  symbol,
  name: symbol,
  price: '$100.00',
  change24h: '$1.00',
  change24hPercent: '+1.00%',
  volume: '$1M',
  fundingRate: '0.01%',
  maxLeverage: 10,
  openInterest: '$2M',
});

describe('WatchlistFullScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockAddPerp.mockResolvedValue(true);
    mockRemovePerp.mockResolvedValue(true);
    mockUseSelector.mockImplementation(
      (selector) => selector === selectTokenWatchlistEnabled,
    );
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
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

  it('tracks watchlist page viewed when loading completes', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<WatchlistFullScreenView />);

    expect(mockUseTrackWatchlistPageViewed).toHaveBeenCalledWith({
      tokenCount: 0,
      perpsCount: 0,
      isEmpty: true,
      isLoading: false,
      source: 'watchlist_homepage',
      activeTab: 'tokens',
      isUnified: false,
    });
  });

  it('passes token count to page viewed tracking when items exist', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth'), makeWatchlistToken('btc')],
      isLoading: false,
    });

    render(<WatchlistFullScreenView />);

    expect(mockUseTrackWatchlistPageViewed).toHaveBeenCalledWith({
      tokenCount: 2,
      perpsCount: 0,
      isEmpty: false,
      isLoading: false,
      source: 'watchlist_homepage',
      activeTab: 'tokens',
      isUnified: false,
    });
  });

  it('uses authoritative token membership count for page-view tracking', () => {
    const token = makeWatchlistToken('eth');
    const tokenItem = {
      kind: 'token' as const,
      key: `token:${token.assetId.toLowerCase()}`,
      assetId: token.assetId,
      token,
    };
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [tokenItem],
      isOrderLoading: false,
      tokens: { items: [tokenItem], isLoading: false, error: null },
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

    render(<WatchlistFullScreenView />);

    expect(mockUseTrackWatchlistPageViewed).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenCount: 5,
        perpsCount: 0,
      }),
    );
  });

  it('uses authoritative membership counts for filter analytics', () => {
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      canFetchSuggestions: true,
      tokenMembershipAssetIds: [],
      isTokenMetadataComplete: false,
      tokenCount: 5,
      perpsCount: 2,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS),
    );

    expect(mockAddAnalyticsProperties).toHaveBeenCalledWith({
      filter: 'tokens',
      token_count: 5,
      perps_count: 2,
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('keeps page-view tracking loading when the token filter is selected before Perps resolves', () => {
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [], isLoading: true, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: true,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS),
    );

    expect(mockUseTrackWatchlistPageViewed).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTab: 'tokens',
        isLoading: true,
      }),
    );
  });

  it('renders the fullscreen container and title', () => {
    const { getByTestId, queryByText } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TITLE),
    ).toBeDefined();
    expect(queryByText('Tokens')).toBeNull();
  });

  it('closes the full-screen route when the token watchlist flag turns off', () => {
    mockUseSelector.mockReturnValue(false);
    const { queryByTestId } = render(<WatchlistFullScreenView />);

    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders five skeletons while loading', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getAllByTestId } = render(<WatchlistFullScreenView />);

    expect(getAllByTestId('trending-skeleton')).toHaveLength(5);
  });

  it('disables suggestion hydration when optional remote work is blocked', () => {
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      canFetchSuggestions: false,
      tokenMembershipAssetIds: [],
      isTokenMetadataComplete: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    render(<WatchlistFullScreenView />);

    expect(mockUseSuggestedWatchlistItemsQuery).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('shows healthy suggestions alongside a domain error', () => {
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: false,
      isPerpsEnabled: false,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: 'token error' },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      canFetchSuggestions: true,
      tokenMembershipAssetIds: [],
      isTokenMetadataComplete: true,
      tokenCount: 0,
      perpsCount: 0,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeWatchlistToken('suggested')],
      isLoading: false,
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(getByTestId('watchlist-error-row')).toBeOnTheScreen();
    expect(getByTestId('watchlist-suggested-section')).toBeOnTheScreen();
  });

  it('shows a retryable order error without hiding healthy rows', () => {
    const token = makeWatchlistToken('eth');
    const tokenItem = {
      kind: 'token' as const,
      key: `token:${token.assetId.toLowerCase()}`,
      assetId: token.assetId,
      token,
    };
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [tokenItem],
      isOrderLoading: false,
      isOrderReady: false,
      orderError: 'Order storage unavailable',
      tokens: { items: [tokenItem], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh,
    });
    const { getByTestId, getByText } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByText('Try again'));

    expect(getByTestId('watchlist-error-row')).toBeOnTheScreen();
    expect(getByTestId(`mock-token-row-${token.assetId}`)).toBeOnTheScreen();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders watchlist tokens newest first', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
      ],
      isLoading: false,
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeDefined();
    expect(getByTestId('mock-token-row-eip155:1/erc20:0xsol')).toBeDefined();
    expect(getByTestId('mock-token-row-eip155:1/erc20:0xbtc')).toBeDefined();
    expect(getByTestId('mock-token-row-eip155:1/erc20:0xeth')).toBeDefined();
  });

  it('renders mixed token and Perps rows with filter pills', () => {
    const token = makeWatchlistToken('eth');
    const perp = makeWatchlistPerp('ETH');

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      tokens: {
        items: [
          {
            kind: 'token',
            key: `token:${token.assetId.toLowerCase()}`,
            assetId: token.assetId,
            token,
          },
        ],
        isLoading: false,
        error: null,
      },
      perps: {
        items: [
          {
            kind: 'perp',
            key: `perp:${perp.id}`,
            symbol: perp.symbol,
            status: 'resolved',
            market: perp,
          },
        ],
        isLoading: false,
        error: null,
      },
      orderedItems: [
        {
          kind: 'token',
          key: `token:${token.assetId.toLowerCase()}`,
          assetId: token.assetId,
          token,
        },
        {
          kind: 'perp',
          key: `perp:${perp.id}`,
          symbol: perp.symbol,
          status: 'resolved',
          market: perp,
        },
      ],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.MIXED_LIST),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_ALL),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_PERPS),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTERS),
    ).toHaveStyle({
      flexGrow: 0,
      flexShrink: 0,
    });
    expect(getByTestId(`mock-token-row-${token.assetId}`)).toHaveProp(
      'twClassName',
      'px-4',
    );
    expect(getByTestId(`mock-perps-row-${perp.symbol}`)).toHaveProp(
      'twClassName',
      'px-4',
    );
    expect(
      getByTestId(`mock-perps-row-${perp.symbol}`).props.showBadge,
    ).toBeUndefined();
  });

  it('filters mixed rows from the All filter', () => {
    const token = makeWatchlistToken('eth');
    const perp = makeWatchlistPerp('ETH');

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      tokens: {
        items: [
          {
            kind: 'token',
            key: `token:${token.assetId.toLowerCase()}`,
            assetId: token.assetId,
            token,
          },
        ],
        isLoading: false,
        error: null,
      },
      perps: {
        items: [
          {
            kind: 'perp',
            key: `perp:${perp.id}`,
            symbol: perp.symbol,
            status: 'resolved',
            market: perp,
          },
        ],
        isLoading: false,
        error: null,
      },
      orderedItems: [
        {
          kind: 'token',
          key: `token:${token.assetId.toLowerCase()}`,
          assetId: token.assetId,
          token,
        },
        {
          kind: 'perp',
          key: `perp:${perp.id}`,
          symbol: perp.symbol,
          status: 'resolved',
          market: perp,
        },
      ],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: [makeWatchlistToken('suggested')],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_TOKENS),
    );
    expect(getByTestId(`mock-token-row-${token.assetId}`)).toBeDefined();
    expect(queryByTestId(`mock-perps-row-${perp.symbol}`)).toBeNull();

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_ALL),
    );
    expect(getByTestId('watchlist-suggested-section')).toBeDefined();

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_PERPS),
    );
    expect(getByTestId(`mock-perps-row-${perp.symbol}`)).toBeDefined();
    expect(queryByTestId(`mock-token-row-${token.assetId}`)).toBeNull();
  });

  it('navigates to Perps details and supports removing from the full view', () => {
    const perp = makeWatchlistPerp('ETH');

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      tokens: { items: [], isLoading: false, error: null },
      perps: {
        items: [
          {
            kind: 'perp',
            key: `perp:${perp.id}`,
            symbol: perp.symbol,
            status: 'resolved',
            market: perp,
          },
        ],
        isLoading: false,
        error: null,
      },
      orderedItems: [
        {
          kind: 'perp',
          key: `perp:${perp.id}`,
          symbol: perp.symbol,
          status: 'resolved',
          market: perp,
        },
      ],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId(`mock-perps-open-${perp.symbol}`));

    expect(getByTestId(`mock-perps-watchlist-${perp.symbol}`)).toBeDefined();
    fireEvent.press(getByTestId(`mock-perps-watchlist-${perp.symbol}`));

    expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
      perp,
      expect.any(String),
    );
    expect(mockRemovePerp).toHaveBeenCalledWith(perp.symbol);
  });

  it('keeps an unavailable watched Perps market removable', () => {
    const unavailablePerp = {
      kind: 'perp' as const,
      key: 'perp:eth',
      symbol: 'ETH',
      status: 'unavailable' as const,
    };
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [unavailablePerp],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [unavailablePerp], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: false,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    const { getByLabelText, getByText } = render(<WatchlistFullScreenView />);

    expect(getByText('Market data unavailable')).toBeOnTheScreen();
    fireEvent.press(getByLabelText('Remove from watchlist'));

    expect(mockRemovePerp).toHaveBeenCalledWith('ETH');
  });

  it('removes a watched Perps row before persistence settles', () => {
    const perp = makeWatchlistPerp('ETH');
    const perpItem = {
      kind: 'perp' as const,
      key: 'perp:eth',
      symbol: perp.symbol,
      status: 'resolved' as const,
      market: perp,
    };
    mockRemovePerp.mockReturnValue(new Promise(() => undefined));
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [perpItem],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [perpItem], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId(`mock-perps-watchlist-${perp.symbol}`));

    expect(mockRemovePerp).toHaveBeenCalledWith(perp.symbol);
    expect(
      queryByTestId(`mock-perps-row-${perp.symbol}`),
    ).not.toBeOnTheScreen();
  });

  it('adds a suggested Perps row before persistence settles', () => {
    const perp = makeWatchlistPerp('NVDA');
    mockAddPerp.mockReturnValue(new Promise(() => undefined));
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [],
      isOrderLoading: false,
      tokens: { items: [], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [perp],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId(`suggested-perp-add-${perp.symbol}`));

    expect(mockAddPerp).toHaveBeenCalledWith(perp.symbol);
    expect(getByTestId(`mock-perps-row-${perp.symbol}`)).toBeOnTheScreen();
    expect(
      queryByTestId(`suggested-perp-add-${perp.symbol}`),
    ).not.toBeOnTheScreen();
  });

  it('persists a reordered mixed list from the All filter', async () => {
    const token = makeWatchlistToken('eth');
    const perp = makeWatchlistPerp('ETH');
    const tokenItem = {
      kind: 'token' as const,
      key: `token:${token.assetId.toLowerCase()}`,
      assetId: token.assetId,
      token,
    };
    const perpItem = {
      kind: 'perp' as const,
      key: `perp:${perp.id}`,
      symbol: perp.symbol,
      status: 'resolved' as const,
      market: perp,
    };
    const persistOrder = jest.fn().mockResolvedValue(undefined);

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [tokenItem, perpItem],
      isOrderReady: true,
      tokens: { items: [tokenItem], isLoading: false, error: null },
      perps: { items: [perpItem], isLoading: false, error: null },
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder,
      refresh: jest.fn(),
    });

    const { getAllByTestId, getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId('mock-reorder-trigger'));

    await waitFor(() =>
      expect(
        getAllByTestId(/^reorderable-item-/).map((node) => node.props.testID),
      ).toEqual([
        `reorderable-item-${tokenItem.key}`,
        `reorderable-item-${perpItem.key}`,
      ]),
    );
    expect(persistOrder).toHaveBeenCalledWith([perpItem.key, tokenItem.key]);
  });

  it('disables mixed reorder until persisted order hydration is ready', () => {
    const token = makeWatchlistToken('eth');
    const perp = makeWatchlistPerp('ETH');
    const tokenItem = {
      kind: 'token' as const,
      key: `token:${token.assetId.toLowerCase()}`,
      assetId: token.assetId,
      token,
    };
    const perpItem = {
      kind: 'perp' as const,
      key: `perp:${perp.id}`,
      symbol: perp.symbol,
      status: 'resolved' as const,
      market: perp,
    };
    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [tokenItem, perpItem],
      isOrderLoading: true,
      isOrderReady: false,
      tokens: { items: [tokenItem], isLoading: false, error: null },
      perps: { items: [perpItem], isLoading: false, error: null },
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: true,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.MIXED_LIST),
    ).toHaveProp('dragEnabled', false);
  });

  it('updates only token AUS order when reordering token-only mode', () => {
    const eth = makeWatchlistToken('eth');
    const btc = makeWatchlistToken('btc');
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [eth, btc],
      isLoading: false,
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId('mock-reorder-trigger'));

    expect(mockUpdateListMutate).toHaveBeenCalledWith([
      btc.assetId,
      eth.assetId,
    ]);
  });

  it('disables reorder while authoritative token metadata is incomplete', () => {
    const token = makeWatchlistToken('eth');
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
      tokens: { items: [tokenItem], isLoading: false, error: null },
      perps: { items: [], isLoading: false, error: null },
      suggestedPerps: [],
      canUseLivePerpsPrices: false,
      canRefresh: true,
      canFetchSuggestions: true,
      tokenMembershipAssetIds: [token.assetId, 'eip155:1/erc20:0xmissing'],
      isTokenMetadataComplete: false,
      isInitialLoading: false,
      persistOrder: jest.fn(),
      refresh: jest.fn(),
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toHaveProp('dragEnabled', false);
  });

  it('reorders through the move-down accessibility action', () => {
    const eth = makeWatchlistToken('eth');
    const btc = makeWatchlistToken('btc');
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [eth, btc],
      isLoading: false,
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);
    const firstRow = getByTestId(`mock-token-drag-${btc.assetId}`);

    expect(firstRow).toHaveProp(
      'accessibilityActions',
      expect.arrayContaining([expect.objectContaining({ name: 'moveDown' })]),
    );
    fireEvent(firstRow, 'accessibilityAction', {
      nativeEvent: { actionName: 'moveDown' },
    });

    expect(mockUpdateListMutate).toHaveBeenCalledWith([
      btc.assetId,
      eth.assetId,
    ]);
  });

  it('starts normal-mode drag with haptics and persists the reordered mixed list', async () => {
    const token = makeWatchlistToken('eth');
    const perp = makeWatchlistPerp('ETH');
    const tokenItem = {
      kind: 'token' as const,
      key: `token:${token.assetId.toLowerCase()}`,
      assetId: token.assetId,
      token,
    };
    const perpItem = {
      kind: 'perp' as const,
      key: `perp:${perp.id}`,
      symbol: perp.symbol,
      status: 'resolved' as const,
      market: perp,
    };
    const persistOrder = jest.fn().mockResolvedValue(undefined);

    mockUseUnifiedWatchlist.mockReturnValue({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [tokenItem, perpItem],
      isOrderReady: true,
      tokens: { items: [tokenItem], isLoading: false, error: null },
      perps: { items: [perpItem], isLoading: false, error: null },
      canUseLivePerpsPrices: false,
      canRefresh: true,
      isInitialLoading: false,
      persistOrder,
      refresh: jest.fn(),
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent(getByTestId(`mock-token-drag-${token.assetId}`), 'longPress');
    expect(getMockFireImpact()).toHaveBeenCalledWith(ImpactMoment.SliderGrip);

    fireEvent.press(getByTestId('mock-reorder-trigger'));

    await waitFor(() =>
      expect(persistOrder).toHaveBeenCalledWith([perpItem.key, tokenItem.key]),
    );
  });

  it('shows up to ten full-screen suggestions', () => {
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: Array.from({ length: 12 }, (_, index) =>
        makeWatchlistToken(`suggested-${index}`),
      ),
      isLoading: false,
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(getByTestId('suggested-token-count').props.children).toBe('10');
  });

  it('reduces full-screen suggestions by the number of watched items up to two', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: Array.from({ length: 2 }, (_, index) =>
        makeWatchlistToken(`watched-${index}`),
      ),
      isLoading: false,
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: Array.from({ length: 12 }, (_, index) =>
        makeWatchlistToken(`suggested-${index}`),
      ),
      isLoading: false,
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(getByTestId('suggested-token-count').props.children).toBe('8');
  });

  it('hides full-screen suggestions when at least three items are watched', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: Array.from({ length: 3 }, (_, index) =>
        makeWatchlistToken(`watched-${index}`),
      ),
      isLoading: false,
    });
    mockUseSuggestedWatchlistItemsQuery.mockReturnValue({
      data: Array.from({ length: 12 }, (_, index) =>
        makeWatchlistToken(`suggested-${index}`),
      ),
      isLoading: false,
    });

    const { queryByTestId } = render(<WatchlistFullScreenView />);

    expect(queryByTestId('watchlist-suggested-section')).toBeNull();
  });

  it('renders empty CTA when the watchlist is empty', () => {
    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    expect(getByTestId('watchlist-empty-cta')).toBeDefined();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeNull();
  });

  it('calls navigation.goBack when the back button is pressed', () => {
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not call navigation.goBack when canGoBack returns false', () => {
    mockCanGoBack.mockReturnValue(false);

    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows search action when items exist', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId, queryByText } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeDefined();
    expect(queryByText('Edit')).toBeNull();
  });

  it('opens search mode when the search button is pressed', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    );

    expect(getByTestId('watchlist-search-content')).toBeDefined();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeNull();
    expect(queryByTestId('watchlist-row-eip155:1/erc20:0xeth')).toBeNull();
    expect(queryByTestId(WatchlistFullScreenViewSelectorsIDs.TITLE)).toBeNull();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeNull();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.HEADER),
    ).toBeNull();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
  });

  it('returns to list view and header when search is dismissed', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    );
    fireEvent.press(getByTestId('watchlist-search-dismiss'));

    expect(queryByTestId('watchlist-search-content')).toBeNull();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TITLE),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.HEADER),
    ).toBeDefined();
  });

  describe('glass header', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(true);
    });

    it('renders glass header components when flag is enabled', () => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth')],
        isLoading: false,
      });

      const { getByTestId } = render(<WatchlistFullScreenView />);

      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.HEADER),
      ).toBeDefined();
      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
      ).toBeDefined();
    });

    it('renders CapsuleGlass wrapper for header actions with glass header', () => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth')],
        isLoading: false,
      });

      const { getByTestId } = render(<WatchlistFullScreenView />);

      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
      ).toBeDefined();
    });

    it('hides header end actions when in search mode with glass header', () => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth')],
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = render(
        <WatchlistFullScreenView />,
      );

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
      );

      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
      ).toBeNull();
    });
  });
});

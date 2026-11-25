import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { NetworkTier } from '../../../../../../util/deviceCapability/types';
import WatchlistSearchContent from './WatchlistSearchContent';
import { WatchlistSearchContentTestIds } from './WatchlistSearchContent.testIds';

const mockUseTokensFeed = jest.fn();
const mockUsePerpsFeed = jest.fn();
const mockOnDismiss = jest.fn();
const mockAddPerp = jest.fn().mockResolvedValue(true);
const mockRemovePerp = jest.fn().mockResolvedValue(true);
const mockNavigateToMarketDetails = jest.fn();
const mockUseNetworkTier = jest.fn((): NetworkTier | null => null);

jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockUseNetworkTier(),
}));

jest.mock(
  '../../../../../Views/TrendingView/components/ExploreSearchBar/ExploreSearchBar',
  () => {
    const { Pressable, TextInput, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({
      searchQuery,
      onSearchChange,
      onCancel,
      placeholder,
    }: {
      searchQuery: string;
      onSearchChange: (query: string) => void;
      onCancel: () => void;
      placeholder?: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'mock-explore-search-bar' },
        ReactActual.createElement(TextInput, {
          testID: 'mock-watchlist-search-input',
          value: searchQuery,
          onChangeText: onSearchChange,
          placeholder,
        }),
        ReactActual.createElement(Pressable, {
          testID: 'explore-search-cancel-button',
          onPress: onCancel,
        }),
      );
    Mock.displayName = 'ExploreSearchBar';
    return Mock;
  },
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock(
  '../../../../../Views/TrendingView/feeds/tokens/useTokensFeed',
  () => ({
    useTokensFeed: (...args: unknown[]) => mockUseTokensFeed(...args),
  }),
);

jest.mock('../../../../../Views/TrendingView/feeds/perps/usePerpsFeed', () => ({
  usePerpsFeed: (...args: unknown[]) => mockUsePerpsFeed(...args),
}));

jest.mock('../../../../Perps/hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: () => ({
    addToWatchlist: mockAddPerp,
    removeFromWatchlist: mockRemovePerp,
  }),
}));

jest.mock('../../../../Perps/hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketDetails: mockNavigateToMarketDetails,
  }),
}));

jest.mock(
  '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem',
  () => {
    const ReactActual = jest.requireActual('react');
    const { Pressable, Text, View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        market,
        onAddPress,
        onWatchlistPress,
        onPress,
        isWatchlisted,
      }: {
        market: { symbol: string };
        onAddPress?: (market: { symbol: string }) => void;
        onWatchlistPress?: (market: { symbol: string }) => void;
        onPress?: (market: { symbol: string }) => void;
        isWatchlisted?: boolean;
      }) =>
        ReactActual.createElement(
          View,
          { testID: `mock-perps-search-row-${market.symbol}` },
          ReactActual.createElement(Text, null, market.symbol),
          ReactActual.createElement(Pressable, {
            testID: `mock-perps-search-add-${market.symbol}`,
            onPress: () => onAddPress?.(market),
          }),
          ReactActual.createElement(Pressable, {
            testID: `mock-perps-search-remove-${market.symbol}`,
            onPress: () => onWatchlistPress?.(market),
            accessibilityState: { selected: isWatchlisted },
          }),
          ReactActual.createElement(Pressable, {
            testID: `mock-perps-search-open-${market.symbol}`,
            onPress: () => onPress?.(market),
          }),
        ),
    };
  },
);

jest.mock(
  '../../../../../Views/TrendingView/feeds/tokens/CryptoMoversPillItem',
  () => {
    const { Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({ token }: { token: { symbol: string } }) =>
      ReactActual.createElement(
        View,
        { testID: `mock-popular-pill-${token.symbol}` },
        ReactActual.createElement(Text, null, token.symbol),
      );
    Mock.displayName = 'CryptoMoversPillItem';
    return Mock;
  },
);

jest.mock(
  '../../components/WatchlistSearchRowItem/WatchlistSearchRowItem',
  () => {
    const { Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    const Mock = ({ token }: { token: { symbol: string } }) =>
      ReactActual.createElement(
        View,
        { testID: `mock-search-row-${token.symbol}` },
        ReactActual.createElement(Text, null, token.symbol),
      );
    Mock.displayName = 'WatchlistSearchRowItem';
    return Mock;
  },
);

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

const makeToken = (symbol: string): TrendingAsset =>
  ({
    assetId: `eip155:1/erc20:0x${symbol}`,
    symbol,
    name: symbol,
  }) as TrendingAsset;

const makePerp = (symbol: string, isWatchlisted = false) => ({
  market: {
    id: `hyperliquid:${symbol}`,
    symbol,
    name: symbol,
  },
  isWatchlisted,
});

describe('WatchlistSearchContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseNetworkTier.mockReturnValue(null);
    mockUseTokensFeed.mockReturnValue({
      data: [makeToken('eth'), makeToken('btc')],
      isLoading: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });
    mockUsePerpsFeed.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      defaultSortOptionId: 'volume',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders watchlist search placeholder copy', () => {
    const { getByPlaceholderText } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    expect(getByPlaceholderText('Search for any asset to add')).toBeDefined();
  });

  it('calls useTokensFeed with debounced query', () => {
    const { getByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    fireEvent.changeText(getByTestId('mock-watchlist-search-input'), 'pepe');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockUseTokensFeed).toHaveBeenLastCalledWith({
      query: 'pepe',
      enabled: true,
    });
  });

  it('renders skeleton while loading', () => {
    mockUseTokensFeed.mockReturnValue({
      data: [],
      isLoading: true,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });

    const { getAllByTestId, getByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    expect(getByTestId(WatchlistSearchContentTestIds.LIST)).toBeDefined();
    expect(
      getByTestId(WatchlistSearchContentTestIds.SKELETON_OVERLAY),
    ).toBeDefined();
    expect(getAllByTestId('trending-skeleton')).toHaveLength(5);
  });

  it('applies Figma search bar container padding', () => {
    const { getByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    expect(
      getByTestId(WatchlistSearchContentTestIds.SEARCH_BAR_CONTAINER).props
        .style,
    ).toEqual(
      expect.objectContaining({
        paddingTop: 8,
        paddingHorizontal: 16,
        paddingBottom: 12,
      }),
    );
  });

  it('calls onDismiss when Cancel is pressed', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <WatchlistSearchContent onDismiss={onDismiss} />,
    );

    fireEvent.press(getByTestId('explore-search-cancel-button'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders search results when feed has data', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(getByTestId(WatchlistSearchContentTestIds.CONTAINER)).toBeDefined();
    expect(getByText('eth')).toBeDefined();
    expect(getByText('btc')).toBeDefined();
    expect(
      queryByTestId(WatchlistSearchContentTestIds.SKELETON_OVERLAY),
    ).toBeNull();
  });

  it('renders empty state when search returns no results', () => {
    mockUseTokensFeed.mockReturnValue({
      data: [],
      isLoading: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });

    const { getByTestId, getByText } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    fireEvent.changeText(getByTestId('mock-watchlist-search-input'), 'zzzz');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(
      getByTestId(WatchlistSearchContentTestIds.EMPTY_STATE),
    ).toBeDefined();
    expect(getByText('No results found for "zzzz"')).toBeDefined();
    expect(getByText('Check out other popular assets')).toBeDefined();
  });

  it('shows Perps markets immediately on the Perps filter even before typing a query', () => {
    mockUsePerpsFeed.mockReturnValue({
      data: [
        {
          market: {
            symbol: 'ETH',
            name: 'Ethereum Perpetual',
            price: '$2,000.00',
            change24h: '+$50.00',
            change24hPercent: '+2.50%',
            volume: '$1.5B',
            maxLeverage: '50x',
            openInterest: '$500M',
            marketType: 'crypto',
          },
          isWatchlisted: false,
          sparklineData: [],
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn().mockResolvedValue(undefined),
      defaultSortOptionId: 'volume',
    });

    const { getByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} activeFilter="perps" />,
    );

    expect(mockUsePerpsFeed).toHaveBeenCalledWith({
      query: '',
      skipInitialFetch: false,
    });
    expect(getByTestId('mock-perps-search-row-ETH')).toBeDefined();
  });

  it('renders a retryable error instead of empty results when Perps search fails', () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockUsePerpsFeed.mockReturnValue({
      data: [],
      isLoading: false,
      error: 'Perps market search unavailable',
      refetch,
      defaultSortOptionId: 'volume',
    });
    const { getByTestId, getByText, queryByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} activeFilter="perps" />,
    );

    fireEvent.changeText(getByTestId('mock-watchlist-search-input'), 'eth');
    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.press(getByText('Try again'));

    expect(
      getByTestId(WatchlistSearchContentTestIds.ERROR_STATE),
    ).toBeDefined();
    expect(queryByTestId(WatchlistSearchContentTestIds.EMPTY_STATE)).toBeNull();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps results mounted when loading refetches with existing data', () => {
    const { getByTestId, getByText, rerender } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    fireEvent.changeText(getByTestId('mock-watchlist-search-input'), 'pepe');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    mockUseTokensFeed.mockReturnValue({
      data: [makeToken('pepe')],
      isLoading: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });

    rerender(<WatchlistSearchContent onDismiss={mockOnDismiss} />);

    expect(getByText('pepe')).toBeDefined();

    mockUseTokensFeed.mockReturnValue({
      data: [makeToken('pepe')],
      isLoading: true,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });

    rerender(<WatchlistSearchContent onDismiss={mockOnDismiss} />);

    expect(getByText('pepe')).toBeDefined();
  });

  it('hides skeleton overlay after loading completes', () => {
    mockUseTokensFeed.mockReturnValue({
      data: [],
      isLoading: true,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });

    const { getByTestId, queryByTestId, rerender } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    expect(
      getByTestId(WatchlistSearchContentTestIds.SKELETON_OVERLAY),
    ).toBeDefined();

    mockUseTokensFeed.mockReturnValue({
      data: [makeToken('eth')],
      isLoading: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });

    rerender(<WatchlistSearchContent onDismiss={mockOnDismiss} />);

    act(() => {
      jest.runAllTimers();
    });

    expect(
      queryByTestId(WatchlistSearchContentTestIds.SKELETON_OVERLAY),
    ).toBeNull();
  });

  it('composes Perps search results and uses add/remove actions', () => {
    mockUseTokensFeed.mockReturnValue({
      data: [],
      isLoading: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
    });
    mockUsePerpsFeed.mockReturnValue({
      data: [makePerp('ETH', false), makePerp('BTC', true)],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      defaultSortOptionId: 'volume',
    });

    const { getByTestId, getByText } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} activeFilter="perps" />,
    );

    fireEvent.changeText(getByTestId('mock-watchlist-search-input'), 'eth');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(getByText('ETH')).toBeDefined();
    expect(getByText('BTC')).toBeDefined();

    fireEvent.press(getByTestId('mock-perps-search-add-ETH'));
    fireEvent.press(getByTestId('mock-perps-search-remove-BTC'));
    fireEvent.press(getByTestId('mock-perps-search-open-ETH'));

    expect(mockAddPerp).toHaveBeenCalledWith('ETH');
    expect(mockRemovePerp).toHaveBeenCalledWith('BTC');
    expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'ETH' }),
      expect.any(String),
    );
  });

  it('skips both remote search feeds when the network is offline', () => {
    mockUseNetworkTier.mockReturnValue('NONE');

    const { getByTestId, queryByTestId } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} activeFilter="all" />,
    );

    fireEvent.changeText(getByTestId('mock-watchlist-search-input'), 'eth');
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockUseTokensFeed).toHaveBeenLastCalledWith({
      query: 'eth',
      enabled: false,
    });
    expect(mockUsePerpsFeed).toHaveBeenLastCalledWith({
      query: 'eth',
      skipInitialFetch: true,
    });
    expect(
      getByTestId(WatchlistSearchContentTestIds.ERROR_STATE),
    ).toBeDefined();
    expect(queryByTestId(WatchlistSearchContentTestIds.EMPTY_STATE)).toBeNull();
  });
});

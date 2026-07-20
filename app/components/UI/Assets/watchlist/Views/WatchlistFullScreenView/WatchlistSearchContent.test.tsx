import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import WatchlistSearchContent from './WatchlistSearchContent';
import { WatchlistSearchContentTestIds } from './WatchlistSearchContent.testIds';

const mockUseTokensFeed = jest.fn();
const mockOnDismiss = jest.fn();

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

describe('WatchlistSearchContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTokensFeed.mockReturnValue({
      data: [makeToken('eth'), makeToken('btc')],
      isLoading: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      hasMore: false,
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

    expect(mockUseTokensFeed).toHaveBeenLastCalledWith({ query: 'pepe' });
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
    const { getByTestId, getByText } = render(
      <WatchlistSearchContent onDismiss={mockOnDismiss} />,
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(getByTestId(WatchlistSearchContentTestIds.CONTAINER)).toBeDefined();
    expect(getByText('eth')).toBeDefined();
    expect(getByText('btc')).toBeDefined();
  });
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistFullScreenView from './WatchlistFullScreenView';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUseTokenWatchlistQuery = jest.fn();
const mockUseTrackWatchlistPageViewed = jest.fn();

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

jest.mock('../../hooks/useTrackWatchlistPageViewed', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseTrackWatchlistPageViewed(...args),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
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

jest.mock('./WatchlistEditableRow', () => {
  const { Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({
    token,
    isEditMode,
  }: {
    token: { name: string; assetId: string };
    isEditMode: boolean;
  }) =>
    ReactActual.createElement(
      View,
      { testID: `editable-row-${token.assetId}` },
      ReactActual.createElement(Text, null, token.name),
      ReactActual.createElement(
        Text,
        { testID: `editable-row-mode-${token.assetId}` },
        isEditMode ? 'edit' : 'view',
      ),
    );
  Mock.displayName = 'WatchlistEditableRow';
  return { __esModule: true, default: Mock };
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

describe('WatchlistFullScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
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
      isEmpty: true,
      isLoading: false,
      source: 'watchlist_homepage',
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
      isEmpty: false,
      isLoading: false,
      source: 'watchlist_homepage',
    });
  });

  it('renders the fullscreen container and title', () => {
    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.CONTAINER),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TITLE),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKENS_TAB),
    ).toBeDefined();
  });

  it('renders five skeletons while loading', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { getAllByTestId } = render(<WatchlistFullScreenView />);

    expect(getAllByTestId('trending-skeleton')).toHaveLength(5);
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

    const { getByTestId, getAllByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeDefined();
    expect(getByTestId('editable-row-eip155:1/erc20:0xsol')).toBeDefined();
    expect(getByTestId('editable-row-eip155:1/erc20:0xbtc')).toBeDefined();
    expect(getByTestId('editable-row-eip155:1/erc20:0xeth')).toBeDefined();
  });

  it('renders empty CTA when the watchlist is empty', () => {
    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    expect(getByTestId('watchlist-empty-cta')).toBeDefined();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeNull();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
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

  it('shows edit and search actions when items exist outside edit mode', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId('editable-row-mode-eip155:1/erc20:0xeth').props.children,
    ).toBe('view');
  });

  it('enters edit mode and passes isEditMode to rows', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    ).toBeDefined();
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON),
    ).toBeNull();
    expect(
      getByTestId('editable-row-mode-eip155:1/erc20:0xeth').props.children,
    ).toBe('edit');
  });

  it('exits edit mode when Done is pressed', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );
    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    );

    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).toBeDefined();
  });

  it('exits edit mode when the watchlist becomes empty', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('eth')],
      isLoading: false,
    });

    const { getByTestId, queryByTestId, rerender } = render(
      <WatchlistFullScreenView />,
    );

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    ).toBeDefined();

    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    rerender(<WatchlistFullScreenView />);

    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    ).toBeNull();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeDefined();
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
    expect(queryByTestId('editable-row-eip155:1/erc20:0xeth')).toBeNull();
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
});

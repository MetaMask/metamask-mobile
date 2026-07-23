import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import WatchlistFullScreenView from './WatchlistFullScreenView';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUseTokenWatchlistQuery = jest.fn();
const mockUpdateListMutate = jest.fn();
const mockRemoveMutate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('../../hooks/useTokenWatchlistQuery', () => ({
  useTokenWatchlistQuery: () => mockUseTokenWatchlistQuery(),
}));

jest.mock('../../hooks/useTokenWatchlistMutations', () => ({
  useTokenWatchlistUpdateListMutation: () => ({
    mutate: mockUpdateListMutate,
  }),
  useTokenWatchlistRemoveItemMutation: () => ({
    mutate: mockRemoveMutate,
  }),
}));

jest.mock('react-native-reorderable-list', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const ReorderableList = ({
    data,
    renderItem,
    testID,
    onReorder,
  }: {
    data: { assetId: string }[];
    renderItem: (info: {
      item: { assetId: string };
      index: number;
    }) => React.ReactNode;
    testID?: string;
    onReorder?: (event: { from: number; to: number }) => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID },
      data.map((item, index) =>
        ReactActual.createElement(
          View,
          { key: item.assetId, testID: `reorderable-item-${item.assetId}` },
          renderItem({ item, index }),
        ),
      ),
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
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const Mock = ({
    token,
    isEditMode,
    onRemoveFromDraft,
  }: {
    token: { name: string; assetId: string };
    isEditMode: boolean;
    onRemoveFromDraft?: (assetId: string) => void;
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
      isEditMode
        ? ReactActual.createElement(Pressable, {
            testID: `watchlist-mock-unwatch-${token.assetId}`,
            onPress: () => {
              onRemoveFromDraft?.(token.assetId);
              mockRemoveMutate(token.assetId);
            },
          })
        : null,
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

  it('persists reordered list when Done is pressed in edit mode', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
      ],
      isLoading: false,
    });

    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );
    fireEvent.press(getByTestId('mock-reorder-trigger'));
    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    );

    expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
    expect(mockUpdateListMutate).toHaveBeenCalledWith([
      'eip155:1/erc20:0xeth',
      'eip155:1/erc20:0xsol',
      'eip155:1/erc20:0xbtc',
    ]);
  });

  describe('edit draft consistency', () => {
    const threeTokenFixture = () => ({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
      ],
      isLoading: false,
    });

    it('does not persist removed tokens when Done is pressed before hydrated query updates', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xbtc'),
      );
      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      );

      expect(mockRemoveMutate).toHaveBeenCalledWith('eip155:1/erc20:0xbtc');
      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateListMutate).toHaveBeenCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
      ]);
    });

    it('persists reordered list after unwatch updates hydrated query in the same edit session', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId, rerender } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(getByTestId('mock-reorder-trigger'));
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xbtc'),
      );

      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth'), makeWatchlistToken('sol')],
        isLoading: false,
      });
      rerender(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      );

      expect(mockRemoveMutate).toHaveBeenCalledWith('eip155:1/erc20:0xbtc');
      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateListMutate).toHaveBeenCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
      ]);
    });

    it('does not clear the edit draft when hydrated query changes during edit mode', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId, rerender } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(getByTestId('mock-reorder-trigger'));

      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth'), makeWatchlistToken('sol')],
        isLoading: false,
      });
      rerender(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateListMutate).toHaveBeenCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
      ]);
    });
  });
});

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import WatchlistFullScreenView from './WatchlistFullScreenView';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import { selectIsUnifiedWatchlistActive } from '../../../selectors/featureFlags';
import { WatchlistErrorRowTestIds } from '../../../../Watchlist/WatchlistErrorRow.testIds';
import type { UnifiedWatchlistItem } from '../../../../Watchlist/types';
import type { PerpsMarketData } from '@metamask/perps-controller';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';
import { AnalyticsEventBuilder } from '../../../../../../util/analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const mockTrackEvent = jest.fn();

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUseTokenWatchlistQuery = jest.fn();
const mockUpdateListMutate = jest.fn();
const mockUseTrackWatchlistPageViewed = jest.fn();

const mockUseSelector = jest.fn();
const mockUseUnifiedWatchlist = jest.fn();
const mockRemovePerpFromWatchlist = jest.fn();
const mockNavigateToMarketDetails = jest.fn();
let capturedOnReorder:
  | ((event: { from: number; to: number }) => void)
  | undefined;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    mockUseSelector(selector),
}));

jest.mock('../../../../Watchlist/hooks/useUnifiedWatchlist', () => ({
  useUnifiedWatchlist: () => mockUseUnifiedWatchlist(),
}));

jest.mock('../../../../Perps/hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: () => ({
    addToWatchlist: jest.fn(),
    removeFromWatchlist: mockRemovePerpFromWatchlist,
  }),
}));

jest.mock('../../../../Perps/hooks/usePerpsNavigation', () => ({
  usePerpsNavigation: () => ({
    navigateToMarketDetails: mockNavigateToMarketDetails,
  }),
}));

jest.mock('../../../../Perps/providers/PerpsStreamManager', () => {
  const ReactActual = jest.requireActual('react');
  return {
    PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock(
  '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem',
  () => {
    const { Text, View } = jest.requireActual('react-native');
    const ReactActual = jest.requireActual('react');
    return ({ market }: { market: { symbol: string } }) =>
      ReactActual.createElement(
        View,
        { testID: `perps-row-${market.symbol}` },
        ReactActual.createElement(Text, null, market.symbol),
      );
  },
);

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

jest.mock('../../hooks/useTokenWatchlistMutations', () => ({
  useTokenWatchlistAddItemMutation: () => ({
    mutate: jest.fn(),
  }),
  useTokenWatchlistRemoveItemMutation: () => ({
    mutate: jest.fn(),
  }),
  useTokenWatchlistUpdateListMutation: () => ({
    mutate: mockUpdateListMutate,
  }),
}));

jest.mock('../../hooks/useSuggestedWatchlistItemsQuery', () => ({
  useSuggestedWatchlistItemsQuery: () => ({
    data: [],
    isLoading: false,
  }),
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../hooks/useTrackWatchlistPageViewed', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseTrackWatchlistPageViewed(...args),
}));

jest.mock('react-native-reorderable-list', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  const ReorderableList = ({
    data,
    renderItem,
    keyExtractor,
    testID,
    onReorder,
  }: {
    data: { assetId?: string; key?: string }[];
    renderItem: (info: {
      item: { assetId?: string; key?: string };
      index: number;
    }) => React.ReactNode;
    keyExtractor?: (item: { assetId?: string; key?: string }) => string;
    testID?: string;
    onReorder?: (event: { from: number; to: number }) => void;
  }) => {
    capturedOnReorder = onReorder;
    return ReactActual.createElement(
      View,
      { testID },
      data.map((item, index) => {
        const itemKey =
          keyExtractor?.(item) ?? item.key ?? item.assetId ?? String(index);
        return ReactActual.createElement(
          View,
          { key: itemKey, testID: `reorderable-item-${itemKey}` },
          renderItem({ item, index }),
        );
      }),
      onReorder
        ? ReactActual.createElement(Pressable, {
            testID: 'mock-reorder-trigger',
            onPress: () => onReorder({ from: 0, to: 1 }),
          })
        : null,
    );
  };

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
  return {
    ...Reanimated,
    useReducedMotion: () => false,
  };
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

const expectUpdateListMutateCalledWith = (assetIds: string[]) => {
  expect(mockUpdateListMutate).toHaveBeenCalledWith(
    assetIds,
    expect.objectContaining({
      onError: expect.any(Function),
      onSuccess: expect.any(Function),
    }),
  );
};

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
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
      }),
    );
    mockCanGoBack.mockReturnValue(true);
    mockUseSelector.mockReturnValue(false);
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

    const { getByTestId, queryByText } = render(<WatchlistFullScreenView />);

    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    ).toBeDefined();
    expect(queryByText('Edit')).toBeNull();
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

  it('does not flash empty CTA when toggling edit and done without changes', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
      ],
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    const toggleEditDone = () => {
      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      expect(queryByTestId('watchlist-empty-cta')).toBeNull();
      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
      ).toBeDefined();

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      );
      expect(queryByTestId('watchlist-empty-cta')).toBeNull();
      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
      ).toBeDefined();
    };

    toggleEditDone();
    toggleEditDone();

    expect(mockUpdateListMutate).not.toHaveBeenCalled();
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

    expect(mockUpdateListMutate).not.toHaveBeenCalled();
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
    expectUpdateListMutateCalledWith([
      'eip155:1/erc20:0xeth',
      'eip155:1/erc20:0xsol',
      'eip155:1/erc20:0xbtc',
    ]);
  });

  it('keeps reordered display after Done when mutation does not update query', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
      ],
      isLoading: false,
    });

    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <WatchlistFullScreenView />,
    );

    const getRenderedAssetOrder = () =>
      getAllByTestId(/^reorderable-item-/).map((node) =>
        String(node.props.testID).replace('reorderable-item-', ''),
      );

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );
    fireEvent.press(getByTestId('mock-reorder-trigger'));
    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    );

    expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    ).toBeNull();
    expect(getRenderedAssetOrder()).toEqual([
      'eip155:1/erc20:0xbtc',
      'eip155:1/erc20:0xsol',
      'eip155:1/erc20:0xeth',
    ]);
  });

  it('keeps reordered display after Done when query updates optimistically', () => {
    mockUseTokenWatchlistQuery.mockReturnValue({
      data: [
        makeWatchlistToken('eth'),
        makeWatchlistToken('btc'),
        makeWatchlistToken('sol'),
      ],
      isLoading: false,
    });

    mockUpdateListMutate.mockImplementation((assetIds: string[]) => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: assetIds.map((assetId) => {
          const name = assetId.split(':').pop()?.replace('0x', '') ?? '';
          return makeWatchlistToken(name);
        }),
        isLoading: false,
      });
    });

    const { getByTestId, getAllByTestId, queryByTestId, rerender } = render(
      <WatchlistFullScreenView />,
    );

    const getRenderedAssetOrder = () =>
      getAllByTestId(/^reorderable-item-/).map((node) =>
        String(node.props.testID).replace('reorderable-item-', ''),
      );

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
    );
    fireEvent.press(getByTestId('mock-reorder-trigger'));
    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    );

    expect(
      queryByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
    ).toBeNull();
    expect(getRenderedAssetOrder()).toEqual([
      'eip155:1/erc20:0xbtc',
      'eip155:1/erc20:0xsol',
      'eip155:1/erc20:0xeth',
    ]);

    rerender(<WatchlistFullScreenView />);

    expect(getRenderedAssetOrder()).toEqual([
      'eip155:1/erc20:0xbtc',
      'eip155:1/erc20:0xsol',
      'eip155:1/erc20:0xeth',
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

    it('persists final list with one updateListMutate after unwatch and reorder', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(getByTestId('mock-reorder-trigger'));
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xbtc'),
      );
      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
      ]);
    });

    it('persists removed tokens when Done is pressed before hydrated query updates', () => {
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

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
      ]);
    });

    it('persists when hydrated query already matches draft after unwatch', () => {
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

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
      ]);
    });

    it('persists when hydrated query already matches reordered draft', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId, rerender } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(getByTestId('mock-reorder-trigger'));

      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          makeWatchlistToken('eth'),
          makeWatchlistToken('btc'),
          makeWatchlistToken('sol'),
        ],
        isLoading: false,
      });
      rerender(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([
        'eip155:1/erc20:0xeth',
        'eip155:1/erc20:0xsol',
        'eip155:1/erc20:0xbtc',
      ]);
    });

    it('does not repopulate from cached query when all draft items are unwatched', () => {
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
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xeth'),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([]);
      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      ).toBeNull();

      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });
      rerender(<WatchlistFullScreenView />);

      expect(queryByTestId('editable-row-eip155:1/erc20:0xeth')).toBeNull();
      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
      ).toBeNull();
      expect(getByTestId('watchlist-empty-cta')).toBeDefined();
    });

    it('persists empty watchlist when all tokens are unwatched in edit mode', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xeth'),
      );
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xbtc'),
      );
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xsol'),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([]);
    });

    it('clears draft after query syncs following unwatch-all', () => {
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
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xeth'),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([]);
      expect(getByTestId('watchlist-empty-cta')).toBeDefined();

      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });
      rerender(<WatchlistFullScreenView />);

      expect(queryByTestId('editable-row-eip155:1/erc20:0xeth')).toBeNull();
      expect(getByTestId('watchlist-empty-cta')).toBeDefined();
    });

    it('keeps empty display locked while cached query is stale after unwatch-all', () => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth')],
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = render(
        <WatchlistFullScreenView />,
      );

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xeth'),
      );

      expect(mockUpdateListMutate).toHaveBeenCalledTimes(1);
      expectUpdateListMutateCalledWith([]);
      expect(queryByTestId('editable-row-eip155:1/erc20:0xeth')).toBeNull();
      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
      ).toBeNull();
      expect(getByTestId('watchlist-empty-cta')).toBeDefined();
    });

    it('keeps draft removals visible while cached query is stale during edit mode', () => {
      mockUseTokenWatchlistQuery.mockReturnValue(threeTokenFixture());

      const { getByTestId, queryByTestId } = render(
        <WatchlistFullScreenView />,
      );

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );
      fireEvent.press(
        getByTestId('watchlist-mock-unwatch-eip155:1/erc20:0xbtc'),
      );

      expect(queryByTestId('editable-row-eip155:1/erc20:0xbtc')).toBeNull();
      expect(getByTestId('editable-row-eip155:1/erc20:0xsol')).toBeDefined();
      expect(getByTestId('editable-row-eip155:1/erc20:0xeth')).toBeDefined();
    });
  });

  describe('glass header', () => {
    beforeEach(() => {
      mockUseSelector.mockImplementation(
        (selector) => selector === selectGlassHeadersEnabled,
      );
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
      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      ).toBeDefined();
    });

    it('renders CapsuleGlass wrapper for Done button in edit mode with glass header', () => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth')],
        isLoading: false,
      });

      const { getByTestId } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );

      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
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
      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
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
      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      ).toBeNull();
    });

    it('renders header without back button when in edit mode with glass header', () => {
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [makeWatchlistToken('eth')],
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = render(
        <WatchlistFullScreenView />,
      );

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.EDIT_BUTTON),
      );

      expect(
        queryByTestId(WatchlistFullScreenViewSelectorsIDs.BACK_BUTTON),
      ).toBeNull();
      expect(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.DONE_BUTTON),
      ).toBeDefined();
    });
  });

  describe('unified watchlist mode', () => {
    const createPerpItem = (symbol: string): UnifiedWatchlistItem => ({
      kind: 'perp',
      key: `perp:${symbol.toLowerCase()}`,
      symbol,
      status: 'resolved',
      market: { symbol, name: `${symbol} Perpetual` } as PerpsMarketData,
    });

    beforeEach(() => {
      capturedOnReorder = undefined;
      mockUseSelector.mockImplementation(
        (selector) => selector === selectIsUnifiedWatchlistActive,
      );
    });

    it('surfaces order load errors with a retry action', () => {
      const mockRefresh = jest.fn().mockResolvedValue(undefined);
      mockUseUnifiedWatchlist.mockReturnValue({
        items: [createPerpItem('BTC')],
        tokens: { items: [], error: null },
        perps: { items: [], error: null },
        suggestedPerps: [],
        canUseLivePerpsPrices: false,
        canUseMotion: false,
        canRefresh: true,
        canFetchSuggestions: false,
        tokenMembershipAssetIds: [],
        perpsMembershipSymbols: ['BTC'],
        tokenCount: 0,
        perpsCount: 1,
        isInitialLoading: false,
        isOrderReady: false,
        orderError: 'Failed to read watchlist order',
        persistOrder: jest.fn(),
        appendOrderKey: jest.fn(),
        refresh: mockRefresh,
      });

      const { getByTestId, getByText } = render(<WatchlistFullScreenView />);

      expect(getByTestId(WatchlistErrorRowTestIds.ROW)).toBeTruthy();
      fireEvent.press(getByText('Try again'));
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('composes overlapping reorder events from latest order state', async () => {
      const mockPersistOrder = jest.fn().mockResolvedValue(undefined);
      const items = [
        createPerpItem('BTC'),
        createPerpItem('ETH'),
        createPerpItem('SOL'),
      ];
      mockUseUnifiedWatchlist.mockReturnValue({
        items,
        tokens: { items: [], error: null },
        perps: { items, error: null },
        suggestedPerps: [],
        canUseLivePerpsPrices: false,
        canUseMotion: false,
        canRefresh: true,
        canFetchSuggestions: false,
        tokenMembershipAssetIds: [],
        perpsMembershipSymbols: ['BTC', 'ETH', 'SOL'],
        tokenCount: 0,
        perpsCount: 3,
        isInitialLoading: false,
        isOrderReady: true,
        orderError: null,
        persistOrder: mockPersistOrder,
        appendOrderKey: jest.fn(),
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      render(<WatchlistFullScreenView />);

      // Dispatch two back-to-back reorders inside the same batch before re-render:
      // [BTC, ETH, SOL] -> move 0->2 => [ETH, SOL, BTC] -> move 0->1 => [SOL, ETH, BTC]
      act(() => {
        capturedOnReorder?.({ from: 0, to: 2 });
        capturedOnReorder?.({ from: 0, to: 1 });
      });

      await waitFor(() => {
        expect(mockPersistOrder).toHaveBeenLastCalledWith([
          'perp:sol',
          'perp:eth',
          'perp:btc',
        ]);
      });
    });

    it('tracks UNIFIED_WATCHLIST_FILTER_SELECTED when switching filter tabs', () => {
      const items = [createPerpItem('BTC')];
      mockUseUnifiedWatchlist.mockReturnValue({
        items,
        tokens: { items: [], error: null },
        perps: { items, error: null },
        suggestedPerps: [],
        canUseLivePerpsPrices: false,
        canUseMotion: false,
        canRefresh: true,
        canFetchSuggestions: false,
        tokenMembershipAssetIds: [],
        perpsMembershipSymbols: ['BTC'],
        tokenCount: 0,
        perpsCount: 1,
        isInitialLoading: false,
        isOrderReady: true,
        orderError: null,
        persistOrder: jest.fn(),
        appendOrderKey: jest.fn(),
        refresh: jest.fn().mockResolvedValue(undefined),
      });

      const { getByTestId } = render(<WatchlistFullScreenView />);

      fireEvent.press(
        getByTestId(WatchlistFullScreenViewSelectorsIDs.FILTER_PERPS),
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: MetaMetricsEvents.UNIFIED_WATCHLIST_FILTER_SELECTED.category,
          properties: {
            filter: 'perps',
            token_count: 0,
            perps_count: 1,
          },
        }),
      );
    });
  });
});

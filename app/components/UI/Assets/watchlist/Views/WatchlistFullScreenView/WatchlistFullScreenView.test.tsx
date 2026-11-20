import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import WatchlistFullScreenView from './WatchlistFullScreenView';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import type {
  UnifiedWatchlistItem,
  UnifiedWatchlistResult,
} from '../../../../Watchlist/types';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUpdateList = jest.fn();
const mockRemoveToken = jest.fn();
const mockRemovePerp = jest.fn().mockResolvedValue(true);
const mockPersistOrder = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);
let mockReduceMotion = false;
let mockLatestListProps: {
  dragEnabled: boolean;
  itemLayoutAnimation?: unknown;
} | null = null;

const TOKEN_A: Extract<UnifiedWatchlistItem, { kind: 'token' }> = {
  kind: 'token',
  key: 'token:eip155:1/erc20:0xa',
  assetId: 'eip155:1/erc20:0xa',
  token: {
    assetId: 'eip155:1/erc20:0xa',
    symbol: 'A',
    name: 'Token A',
    decimals: 18,
    price: '1',
  } as TrendingAsset,
};
const TOKEN_B: Extract<UnifiedWatchlistItem, { kind: 'token' }> = {
  kind: 'token',
  key: 'token:eip155:1/erc20:0xb',
  assetId: 'eip155:1/erc20:0xb',
  token: {
    assetId: 'eip155:1/erc20:0xb',
    symbol: 'B',
    name: 'Token B',
    decimals: 18,
    price: '1',
  } as TrendingAsset,
};
const PERP: Extract<
  UnifiedWatchlistItem,
  { kind: 'perp'; status: 'resolved' }
> = {
  kind: 'perp',
  key: 'perp:eth',
  symbol: 'ETH',
  status: 'resolved',
  market: {
    symbol: 'ETH',
    name: 'Ethereum Perpetual',
    maxLeverage: '50x',
    price: '$2,000.00',
    change24h: '+$50.00',
    change24hPercent: '+2.50%',
    volume: '$1.5B',
  } as PerpsMarketData,
};

const createResult = (
  overrides: Partial<UnifiedWatchlistResult> = {},
): UnifiedWatchlistResult => ({
  isUnifiedEnabled: false,
  isPerpsEnabled: false,
  orderedItems: [TOKEN_A, TOKEN_B],
  isOrderLoading: false,
  isOrderReady: false,
  orderError: null,
  tokens: { items: [TOKEN_A, TOKEN_B], isLoading: false, error: null },
  perps: { items: [], isLoading: false, error: null },
  canUseLivePerpsPrices: true,
  canUseMotion: true,
  canRefresh: true,
  canFetchSuggestions: true,
  tokenMembershipAssetIds: [TOKEN_A.assetId, TOKEN_B.assetId],
  isTokenMetadataComplete: true,
  tokenCount: 2,
  isInitialLoading: false,
  persistOrder: mockPersistOrder,
  refresh: mockRefresh,
  ...overrides,
});

let mockUnifiedResult = createResult();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({ params: { source: 'watchlist_homepage' } }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => undefined;
  return {
    ...Reanimated,
    useReducedMotion: () => mockReduceMotion,
  };
});

jest.mock('react-native-reorderable-list', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockList = ({
    data,
    renderItem,
    keyExtractor,
    onReorder,
    dragEnabled,
    itemLayoutAnimation,
    testID,
  }: {
    data: UnifiedWatchlistItem[];
    renderItem: (info: {
      item: UnifiedWatchlistItem;
      index: number;
    }) => React.ReactNode;
    keyExtractor: (item: UnifiedWatchlistItem) => string;
    onReorder: (event: { from: number; to: number }) => void;
    dragEnabled: boolean;
    itemLayoutAnimation?: unknown;
    testID: string;
  }) => {
    mockLatestListProps = { dragEnabled, itemLayoutAnimation };
    return ReactActual.createElement(
      View,
      { testID },
      ReactActual.createElement(
        Text,
        { testID: 'drag-enabled' },
        String(dragEnabled),
      ),
      data.map((item, index) =>
        ReactActual.createElement(
          View,
          { key: keyExtractor(item) },
          renderItem({ item, index }),
        ),
      ),
      ReactActual.createElement(Pressable, {
        testID: 'reorder-trigger',
        onPress: () => onReorder({ from: 0, to: 1 }),
      }),
    );
  };
  MockList.displayName = 'ReorderableList';
  return {
    __esModule: true,
    default: MockList,
  };
});

jest.mock('../../hooks/useTokenWatchlistMutations', () => ({
  useTokenWatchlistUpdateListMutation: () => ({ mutate: mockUpdateList }),
  useTokenWatchlistRemoveItemMutation: () => ({ mutate: mockRemoveToken }),
}));

jest.mock('../../hooks/useTrackWatchlistPageViewed', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../Watchlist/WatchlistPerpsProvider', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../../../Watchlist/hooks/useUnifiedWatchlist', () => ({
  useUnifiedWatchlist: () => mockUnifiedResult,
}));

jest.mock('../../../../Perps/hooks/usePerpsWatchlistActions', () => ({
  usePerpsWatchlistActions: () => ({
    removeFromWatchlist: mockRemovePerp,
  }),
}));

jest.mock('./WatchlistReorderableRow', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockRow = ({
    item,
    onRemoveFromWatchlist,
    onMoveDown,
  }: {
    item: UnifiedWatchlistItem;
    onRemoveFromWatchlist: (item: UnifiedWatchlistItem) => void;
    onMoveDown?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: `row-${item.key}` },
      ReactActual.createElement(Text, null, item.key),
      ReactActual.createElement(Pressable, {
        testID: `remove-${item.key}`,
        onPress: () => onRemoveFromWatchlist(item),
      }),
      onMoveDown
        ? ReactActual.createElement(Pressable, {
            testID: `move-down-${item.key}`,
            onPress: onMoveDown,
          })
        : null,
    );
  MockRow.displayName = 'WatchlistReorderableRow';
  return { __esModule: true, default: MockRow };
});

jest.mock('./WatchlistSearchContent', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockSearch = ({ onDismiss }: { onDismiss: () => void }) =>
    ReactActual.createElement(
      View,
      { testID: 'watchlist-search-content' },
      ReactActual.createElement(Pressable, {
        testID: 'dismiss-search',
        onPress: onDismiss,
      }),
    );
  MockSearch.displayName = 'WatchlistSearchContent';
  return { __esModule: true, default: MockSearch };
});

jest.mock('../../../../Watchlist/WatchlistErrorRow', () => {
  const { Pressable, View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  const MockError = ({ onRetry }: { onRetry?: () => void }) =>
    ReactActual.createElement(
      View,
      { testID: 'watchlist-error' },
      ReactActual.createElement(Pressable, {
        testID: 'retry-order',
        onPress: onRetry,
      }),
    );
  MockError.displayName = 'WatchlistErrorRow';
  return { __esModule: true, default: MockError };
});

describe('WatchlistFullScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion = false;
    mockLatestListProps = null;
    mockUnifiedResult = createResult();
  });

  it('renders the same persisted orderedItems consumed by Homepage', () => {
    mockUnifiedResult = createResult({
      orderedItems: [TOKEN_B, TOKEN_A],
    });

    const { getAllByTestId } = render(<WatchlistFullScreenView />);

    expect(
      getAllByTestId(/^row-token:/).map((row) => row.props.testID),
    ).toEqual([`row-${TOKEN_B.key}`, `row-${TOKEN_A.key}`]);
  });

  it('writes only token AUS order in token-only mode', () => {
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId('reorder-trigger'));

    expect(mockUpdateList).toHaveBeenCalledWith([
      TOKEN_A.assetId,
      TOKEN_B.assetId,
    ]);
    expect(mockPersistOrder).not.toHaveBeenCalled();
  });

  it('writes only presentation order in mixed mode', () => {
    mockUnifiedResult = createResult({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      orderedItems: [TOKEN_A, PERP],
      isOrderReady: true,
      perps: { items: [PERP], isLoading: false, error: null },
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId('reorder-trigger'));

    expect(mockPersistOrder).toHaveBeenCalledWith([PERP.key, TOKEN_A.key]);
    expect(mockUpdateList).not.toHaveBeenCalled();
  });

  it('disables reorder while authoritative token metadata is incomplete', () => {
    mockUnifiedResult = createResult({
      isTokenMetadataComplete: false,
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    expect(getByTestId('drag-enabled')).toHaveTextContent('false');
  });

  it('reorders through the move-down accessibility path', () => {
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId(`move-down-${TOKEN_A.key}`));

    expect(mockUpdateList).toHaveBeenCalledWith([
      TOKEN_A.assetId,
      TOKEN_B.assetId,
    ]);
  });

  it('removes Reanimated layout motion when Reduce Motion is enabled', () => {
    mockReduceMotion = true;

    render(<WatchlistFullScreenView />);

    expect(mockLatestListProps?.itemLayoutAnimation).toBeUndefined();
  });

  it('shows a retryable order error without hiding healthy mixed rows', () => {
    mockUnifiedResult = createResult({
      isUnifiedEnabled: true,
      isPerpsEnabled: true,
      isOrderReady: false,
      orderError: 'storage unavailable',
    });
    const { getByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(getByTestId('retry-order'));

    expect(getByTestId(`row-${TOKEN_A.key}`)).toBeOnTheScreen();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('keeps search token-only and returns to the ordered list', () => {
    const { getByTestId, queryByTestId } = render(<WatchlistFullScreenView />);

    fireEvent.press(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.SEARCH_BUTTON),
    );
    expect(getByTestId('watchlist-search-content')).toBeOnTheScreen();

    fireEvent.press(getByTestId('dismiss-search'));

    expect(queryByTestId('watchlist-search-content')).not.toBeOnTheScreen();
    expect(
      getByTestId(WatchlistFullScreenViewSelectorsIDs.TOKEN_LIST),
    ).toBeOnTheScreen();
  });
});

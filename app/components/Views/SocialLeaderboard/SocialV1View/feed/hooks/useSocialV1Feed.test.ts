import { renderHook } from '@testing-library/react-native';
import {
  useTraderFeed,
  type TraderFeedRow,
} from '../../../FeedView/hooks/useTraderFeed';
import { mockPerpFeedItem } from '../../../FeedView/mocks/coreFeed.mock';
import { mapFeedItem } from '../../../FeedView/utils/mapFeedItem';
import { useSocialV1Feed } from './useSocialV1Feed';

jest.mock('../../../FeedView/hooks/useTraderFeed');

const mockUseTraderFeed = jest.mocked(useTraderFeed);

const mockLoadMore = jest.fn();
const mockRefresh = jest.fn();

const buildRow = (positionId: string): TraderFeedRow => {
  const core = mockPerpFeedItem({ positionId });
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('fixture did not map to a FeedItem');
  }
  return { item, core };
};

const arrangeFeed = (rows: TraderFeedRow[]) => {
  mockUseTraderFeed.mockReturnValue({
    rows,
    items: rows.map((row) => row.item),
    sections: [],
    hasLoadedItems: rows.length > 0,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    loadMore: mockLoadMore,
    error: null,
    refresh: mockRefresh,
    dataUpdatedAt: undefined,
  });
};

describe('useSocialV1Feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeFeed([buildRow('pos-1'), buildRow('pos-2')]);
  });

  it('maps every loaded row into a V1 card, preserving order', () => {
    const { result } = renderHook(() => useSocialV1Feed());

    expect(result.current.items.map((item) => item.id)).toEqual([
      'pos-1-1700000500',
      'pos-2-1700000500',
    ]);
  });

  it('reads the leaderboard scope for the default audience', () => {
    renderHook(() => useSocialV1Feed());

    expect(mockUseTraderFeed).toHaveBeenCalledWith({
      audience: 'all',
      enabled: true,
    });
  });

  // Following must hit its own scope, or both tabs would render one list.
  it('reads the following scope for the following audience', () => {
    renderHook(() => useSocialV1Feed({ audience: 'following' }));

    expect(mockUseTraderFeed).toHaveBeenCalledWith({
      audience: 'following',
      enabled: true,
    });
  });

  it('passes the enabled gate straight through', () => {
    renderHook(() => useSocialV1Feed({ audience: 'all', enabled: false }));

    expect(mockUseTraderFeed).toHaveBeenCalledWith({
      audience: 'all',
      enabled: false,
    });
  });

  it('re-exposes the pagination and refresh surface', () => {
    const { result } = renderHook(() => useSocialV1Feed());

    expect(result.current.hasNextPage).toBe(true);
    result.current.loadMore();
    expect(mockLoadMore).toHaveBeenCalled();
    result.current.refresh();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('surfaces the normalised feed error', () => {
    mockUseTraderFeed.mockReturnValue({
      rows: [],
      items: [],
      sections: [],
      hasLoadedItems: false,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: mockLoadMore,
      error: 'Network request failed',
      refresh: mockRefresh,
      dataUpdatedAt: undefined,
    });

    const { result } = renderHook(() => useSocialV1Feed());

    expect(result.current.error).toBe('Network request failed');
    expect(result.current.items).toEqual([]);
  });
});

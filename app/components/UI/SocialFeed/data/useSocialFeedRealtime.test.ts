import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  AuthorComment,
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
  SocialFeedEventListener,
  SocialFeedRealtimeScope,
} from '@metamask/social-controllers';
import { mockSpotFeedItem } from '../mocks/coreFeed.mock';
import type { SocialV1FeedPost, TraderFeedRow } from '../types';
import { mapFeedItem } from '../utils/mapFeedItem';
import { SOCIAL_FEED_REALTIME_BUFFER_SIZE } from './socialFeedRealtime';
import { resetSocialRealtimeLeases } from './socialRealtimeLease';
import { useSocialFeedRealtime } from './useSocialFeedRealtime';

const mockAddListener = jest.fn();
const mockAddReconnectListener = jest.fn();
const mockSetScopes = jest.fn();
const mockSetActive = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SocialRealtimeService: {
        addListener: (...args: unknown[]) => mockAddListener(...args),
        addReconnectListener: (...args: unknown[]) =>
          mockAddReconnectListener(...args),
        setScopes: (...args: unknown[]) => mockSetScopes(...args),
        setActive: (...args: unknown[]) => mockSetActive(...args),
      },
    },
  },
}));

interface HookProps {
  rows?: TraderFeedRow[];
  dataUpdatedAt?: number;
  realtimeScope?: SocialFeedRealtimeScope | null;
  active?: boolean;
  paused?: boolean;
  nearTop?: boolean;
  holdNewPosts?: boolean;
  filterPost?: (post: SocialV1FeedPost) => boolean;
  matchesItem?: (item: CoreFeedItem) => boolean;
  streamKey?: string;
}

const NO_ROWS: TraderFeedRow[] = [];

const buildRow = (overrides: Partial<CoreFeedItem> = {}): TraderFeedRow => {
  const core = mockSpotFeedItem(overrides);
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error('Expected the feed item to map');
  }
  return { core, item };
};

const buildEvent = (
  feedItemId: string,
  overrides: Partial<Omit<SocialFeedEvent, 'data'>> & {
    data?: Partial<CoreFeedItem>;
  } = {},
): SocialFeedEvent => {
  const { data, ...rest } = overrides;
  return {
    version: 1,
    kind: 'feed-item',
    eventId: `event-${feedItemId}`,
    revision: 1,
    occurredAt: '2026-01-01T00:00:01.000Z',
    ...rest,
    feedItemId,
    data: mockSpotFeedItem({ positionId: feedItemId, ...data }),
  };
};

const positionIds = (posts: SocialV1FeedPost[]) =>
  posts.map((post) => post.position?.positionId);

const buildCall = (uid: string): AuthorComment => ({
  uid,
  text: 'this is alpha',
  timestamp: 1_700_000_000,
  engagement: { reactions: [], userReaction: null },
});

describe('useSocialFeedRealtime', () => {
  let listener: SocialFeedEventListener | undefined;
  let reconnectListener: (() => void) | undefined;
  let refresh: jest.Mock<Promise<void>, []>;

  const renderRealtime = (initialProps: HookProps = {}) =>
    renderHook(
      ({
        rows = NO_ROWS,
        dataUpdatedAt,
        realtimeScope = 'all',
        active = true,
        paused = false,
        nearTop = true,
        holdNewPosts = false,
        filterPost,
        matchesItem,
        streamKey,
      }: HookProps) =>
        useSocialFeedRealtime(
          { rows, dataUpdatedAt, refresh },
          {
            realtimeScope,
            active,
            paused,
            nearTop,
            holdNewPosts,
            filterPost,
            matchesItem,
            streamKey,
          },
        ),
      { initialProps },
    );

  const emit = (
    event: SocialFeedEvent,
    scope: SocialFeedRealtimeScope = 'all',
  ) => {
    act(() => {
      listener?.(event, scope);
    });
  };

  const emitMany = (count: number, prefix = 'pos') => {
    act(() => {
      for (let index = 0; index < count; index++) {
        listener?.(buildEvent(`${prefix}-${index}`), 'all');
      }
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetSocialRealtimeLeases();
    listener = undefined;
    reconnectListener = undefined;
    refresh = jest.fn().mockResolvedValue(undefined);
    mockAddListener.mockImplementation((next: SocialFeedEventListener) => {
      listener = next;
      return jest.fn();
    });
    mockAddReconnectListener.mockImplementation((next: () => void) => {
      reconnectListener = next;
      return jest.fn();
    });
    mockSetScopes.mockResolvedValue(undefined);
    mockSetActive.mockResolvedValue(undefined);
  });

  it('returns null and stays idle without a realtime scope', () => {
    const { result } = renderRealtime({ realtimeScope: null });

    expect(result.current).toBeNull();
    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('subscribes to the scope while active and deactivates on unmount', async () => {
    const { unmount } = renderRealtime({ realtimeScope: 'trending' });
    await waitFor(() => expect(mockSetActive).toHaveBeenCalledWith(true));

    unmount();

    expect(mockSetScopes).toHaveBeenCalledWith(['trending']);
    expect(mockAddReconnectListener).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mockSetActive).toHaveBeenLastCalledWith(false));
  });

  it('does not subscribe while inactive', () => {
    renderRealtime({ active: false });

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockSetActive).not.toHaveBeenCalled();
  });

  it('keeps unchanged posts when a refresh returns them as new objects', () => {
    const { result, rerender } = renderRealtime({
      rows: [
        buildRow({ positionId: 'pos-a' }),
        buildRow({ positionId: 'pos-b' }),
      ],
      dataUpdatedAt: 1_000,
    });
    const [before, beforeChanged] = result.current?.posts ?? [];

    rerender({
      rows: [
        buildRow({ positionId: 'pos-a' }),
        buildRow({ positionId: 'pos-b', copyCount: 42 }),
      ],
      dataUpdatedAt: 2_000,
    });
    const [after, afterChanged] = result.current?.posts ?? [];

    expect(after).toBe(before);
    expect(afterChanged).not.toBe(beforeChanged);
  });

  it('keeps the post when a new page rebuilds the row around the same position', () => {
    const row = buildRow({ positionId: 'pos-a' });
    const { result, rerender } = renderRealtime({
      rows: [row],
      dataUpdatedAt: 1_000,
    });
    const before = result.current?.posts[0];

    rerender({
      rows: [{ ...row, item: { ...row.item } }],
      dataUpdatedAt: 2_000,
    });

    expect(result.current?.posts[0]).toBe(before);
  });

  it('adds a new post at the top with an entrance while live', () => {
    const { result } = renderRealtime();

    emit(buildEvent('pos-a'));

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-a']);
    expect(result.current?.posts[0]?.realtimeEventId).toBe('event-pos-a');
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('ignores events from another scope', () => {
    const { result } = renderRealtime();

    emit(buildEvent('pos-a'), 'trending');

    expect(result.current?.posts).toEqual([]);
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('ignores a stale revision after a newer one', () => {
    const { result } = renderRealtime();

    emit(buildEvent('pos-a', { revision: 2, eventId: 'event-2' }));
    emit(buildEvent('pos-a', { revision: 1, eventId: 'event-1' }));

    expect(result.current?.posts).toHaveLength(1);
    expect(result.current?.posts[0]?.realtimeEventId).toBe('event-2');
  });

  it('holds new posts away from the top and drains them at the top', async () => {
    const { result, rerender } = renderRealtime({ nearTop: false });
    emit(buildEvent('pos-a'));
    const heldCount = result.current?.realtime.pendingNewCount;
    const heldPosts = result.current?.posts;

    rerender({ nearTop: true });

    expect(heldCount).toBe(1);
    expect(heldPosts).toEqual([]);
    await waitFor(() => expect(result.current?.posts).toHaveLength(1));
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('reveals every held post at once with a single entrance', async () => {
    const { result } = renderRealtime({ paused: true });
    emitMany(3);

    act(() => {
      result.current?.realtime.revealPending();
    });

    await waitFor(() => expect(result.current?.posts).toHaveLength(3));
    const animated = result.current?.posts.filter(
      (post) => post.realtimeEventId,
    );
    expect(animated).toHaveLength(1);
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('reveals posts held at the top past one drain batch and keeps the count at zero', async () => {
    const { result } = renderRealtime({ holdNewPosts: true });
    emitMany(5);
    const heldCount = result.current?.realtime.pendingNewCount;

    act(() => {
      result.current?.realtime.revealPending();
    });

    expect(heldCount).toBe(5);
    expect(result.current?.posts).toHaveLength(5);
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('holds new posts at the top when asked to, but applies updates', () => {
    const rows = [buildRow({ positionId: 'pos-a', revision: 1 })];
    const { result } = renderRealtime({ rows, holdNewPosts: true });

    emit(buildEvent('pos-new'));
    emit(buildEvent('pos-a', { revision: 2, data: { pnlValueUsd: 99 } }));

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-a']);
    expect(result.current?.posts[0]?.position?.pnlValueUsd).toBe(99);
    expect(result.current?.realtime.pendingNewCount).toBe(1);
  });

  it('handles updates to loaded posts away from the top straight away', () => {
    const rows = [buildRow({ positionId: 'pos-a', revision: 1 })];
    const { result } = renderRealtime({ rows, nearTop: false });

    emit(buildEvent('pos-a', { revision: 2, data: { pnlValueUsd: 99 } }));

    expect(result.current?.posts[0]?.position?.pnlValueUsd).toBe(99);
    expect(result.current?.posts[0]?.realtimeEventId).toBeUndefined();
    expect(result.current?.realtime.hasPendingUpdate('pos-a')).toBe(false);
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('handles a stale update to a loaded post away from the top without applying it', () => {
    const rows = [buildRow({ positionId: 'pos-a', revision: 3 })];
    const { result } = renderRealtime({ rows, nearTop: false });
    const before = result.current?.posts[0]?.position?.pnlValueUsd;

    emit(buildEvent('pos-a', { revision: 2, data: { pnlValueUsd: 99 } }));

    expect(result.current?.posts[0]?.position?.pnlValueUsd).toBe(before);
    expect(result.current?.realtime.hasPendingUpdate('pos-a')).toBe(false);
  });

  it('handles a held new post as new away from the top once its server copy loads', async () => {
    const rows = [buildRow({ positionId: 'pos-a', revision: 1 })];
    const { result, rerender } = renderRealtime({ nearTop: false });
    emit(buildEvent('pos-a', { revision: 1 }));

    rerender({ rows, nearTop: false });
    emit(buildEvent('pos-a', { revision: 2 }));

    expect(result.current?.posts).toEqual([]);
    expect(result.current?.realtime.pendingNewCount).toBe(1);

    rerender({ rows, nearTop: true });

    await waitFor(() => expect(result.current?.posts).toHaveLength(1));
    expect(result.current?.posts[0]?.realtimeEventId).toBe('event-pos-a');
    expect(result.current?.realtime.pendingNewCount).toBe(0);
  });

  it('drops new posts the filter rejects before holding or counting them', () => {
    const filterPost = (post: SocialV1FeedPost) =>
      post.position?.positionId !== 'pos-rejected';
    const { result } = renderRealtime({ paused: true, filterPost });

    emit(buildEvent('pos-rejected'));
    emit(buildEvent('pos-kept'));

    expect(result.current?.realtime.pendingNewCount).toBe(1);
  });

  it("drops new posts outside the request's slice before holding or counting them", () => {
    const matchesItem = (item: CoreFeedItem) => item.positionId !== 'pos-out';
    const { result } = renderRealtime({ paused: true, matchesItem });

    emit(buildEvent('pos-out'));
    emit(buildEvent('pos-in'));

    expect(result.current?.realtime.pendingNewCount).toBe(1);
  });

  it("adds a new post in the request's slice at the top", () => {
    const matchesItem = (item: CoreFeedItem) => item.positionId === 'pos-in';
    const { result } = renderRealtime({ matchesItem });

    emit(buildEvent('pos-out'));
    emit(buildEvent('pos-in'));

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-in']);
  });

  it("applies revisions to loaded posts without checking the request's slice", () => {
    const rows = [buildRow({ positionId: 'pos-a', revision: 1, copyCount: 8 })];
    const { result } = renderRealtime({ rows, matchesItem: () => false });

    emit(buildEvent('pos-a', { revision: 2, data: { copyCount: 9 } }));

    expect(result.current?.posts[0]?.copyCount).toBe(9);
  });

  it('drops socket posts and catches up when the streamed request changes', async () => {
    const rows = [buildRow({ positionId: 'pos-a' })];
    const { result, rerender } = renderRealtime({
      rows,
      dataUpdatedAt: 1,
      streamKey: 'token-a',
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    emit(buildEvent('pos-b'));
    const postsBefore = positionIds(result.current?.posts ?? []);

    rerender({ rows, dataUpdatedAt: 1, streamKey: 'token-b' });

    expect(postsBefore).toEqual(['pos-b', 'pos-a']);
    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-a']);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it('never renders socket posts of the previous request', () => {
    const rows = [buildRow({ positionId: 'pos-a' })];
    const renderedPosts: (string | undefined)[][] = [];
    const { rerender } = renderHook(
      ({ streamKey }: { streamKey: string }) => {
        const realtime = useSocialFeedRealtime(
          { rows, dataUpdatedAt: 1, refresh },
          {
            realtimeScope: 'all',
            active: true,
            paused: false,
            nearTop: true,
            holdNewPosts: false,
            streamKey,
          },
        );
        renderedPosts.push(positionIds(realtime?.posts ?? []));
        return realtime;
      },
      { initialProps: { streamKey: 'token-a' } },
    );
    emit(buildEvent('pos-b'));
    const rendersBeforeChange = renderedPosts.length;

    rerender({ streamKey: 'token-b' });

    expect(renderedPosts[rendersBeforeChange - 1]).toEqual(['pos-b', 'pos-a']);
    renderedPosts
      .slice(rendersBeforeChange)
      .forEach((posts) => expect(posts).toEqual(['pos-a']));
  });

  it('does not catch up on a request change before its first page loads', () => {
    const { rerender } = renderRealtime({ streamKey: 'token-a' });

    rerender({ streamKey: 'token-b' });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('filters the merged posts', () => {
    const rows = [
      buildRow({ positionId: 'pos-a' }),
      buildRow({ positionId: 'pos-b' }),
    ];
    const filterPost = (post: SocialV1FeedPost) =>
      post.position?.positionId === 'pos-b';

    const { result } = renderRealtime({ rows, filterPost });

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-b']);
  });

  it('handles updates to loaded posts while paused without counting them', async () => {
    const rows = [buildRow({ positionId: 'pos-a', revision: 1 })];
    const { result, rerender } = renderRealtime({ rows, paused: true });
    emit(buildEvent('pos-a', { revision: 2, data: { pnlValueUsd: 99 } }));

    await waitFor(() =>
      expect(result.current?.posts[0]?.position?.pnlValueUsd).toBe(99),
    );
    const pendingCount = result.current?.realtime.pendingNewCount;
    const wasHeld = result.current?.realtime.hasPendingUpdate('pos-a');

    rerender({ rows, paused: false });

    expect(pendingCount).toBe(0);
    expect(wasHeld).toBe(false);
    expect(result.current?.posts[0]?.position?.pnlValueUsd).toBe(99);
    expect(result.current?.posts[0]?.realtimeEventId).toBeUndefined();
    expect(result.current?.realtime.hasPendingUpdate('pos-a')).toBe(false);
  });

  it('caps socket-only posts and refreshes to catch up', async () => {
    const { result } = renderRealtime();

    emitMany(SOCIAL_FEED_REALTIME_BUFFER_SIZE + 1);

    expect(result.current?.posts).toHaveLength(
      SOCIAL_FEED_REALTIME_BUFFER_SIZE,
    );
    expect(positionIds(result.current?.posts ?? [])).not.toContain('pos-0');
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('does not bring back an evicted post on a later revision', () => {
    const { result } = renderRealtime();
    emitMany(SOCIAL_FEED_REALTIME_BUFFER_SIZE + 1);

    emit(buildEvent('pos-0', { revision: 2 }));

    expect(positionIds(result.current?.posts ?? [])).not.toContain('pos-0');
  });

  it('caps held new posts and catches up once back at the top', async () => {
    const { result, rerender } = renderRealtime({ paused: true });
    emitMany(SOCIAL_FEED_REALTIME_BUFFER_SIZE + 1);
    const heldCount = result.current?.realtime.pendingNewCount;
    const refreshedWhilePaused = refresh.mock.calls.length;

    rerender({ paused: false });

    expect(heldCount).toBe(SOCIAL_FEED_REALTIME_BUFFER_SIZE);
    expect(refreshedWhilePaused).toBe(0);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('keeps holding new posts when asked to, but still catches up on overflow', async () => {
    const { result } = renderRealtime({ holdNewPosts: true });

    emitMany(SOCIAL_FEED_REALTIME_BUFFER_SIZE + 1);

    expect(result.current?.posts).toEqual([]);
    expect(result.current?.realtime.pendingNewCount).toBe(
      SOCIAL_FEED_REALTIME_BUFFER_SIZE,
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('defers a reconnect catch-up until the list is back at the top', async () => {
    const { rerender } = renderRealtime({ nearTop: false });
    await waitFor(() => expect(reconnectListener).toBeDefined());
    act(() => {
      reconnectListener?.();
    });
    const refreshedAwayFromTop = refresh.mock.calls.length;

    rerender({ nearTop: true });

    expect(refreshedAwayFromTop).toBe(0);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('catches up when a filter change widens the feed', async () => {
    const rejectAll = () => false;
    const { rerender } = renderRealtime({ filterPost: rejectAll });
    emit(buildEvent('pos-a'));
    const refreshedBeforeFilterChange = refresh.mock.calls.length;

    rerender({ filterPost: () => true });

    expect(refreshedBeforeFilterChange).toBe(0);
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('catches up when it becomes active again with loaded rows', async () => {
    const rows = [buildRow({ positionId: 'pos-a' })];
    const { rerender } = renderRealtime({
      rows,
      dataUpdatedAt: 1,
      active: false,
    });

    rerender({ rows, dataUpdatedAt: 1, active: true });

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('folds a socket post into the server rows once the server returns it', () => {
    const { result, rerender } = renderRealtime();
    emit(buildEvent('pos-a'));

    rerender({ rows: [buildRow({ positionId: 'pos-a', revision: 1 })] });

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-a']);
    expect(result.current?.posts[0]?.realtimeEventId).toBeUndefined();
  });

  it('clears the rest authorComment when a realtime update carries a null authorComment', () => {
    const restCall = buildCall('call-rest');
    const rows = [
      buildRow({ positionId: 'pos-a', revision: 1, authorComment: restCall }),
    ];
    const { result } = renderRealtime({ rows, dataUpdatedAt: 1_000 });

    emit(buildEvent('pos-a', { revision: 2, data: { authorComment: null } }));

    expect(result.current?.posts[0]?.commentId).toBeUndefined();
  });

  it('keeps the rest authorComment when a realtime update omits authorComment', () => {
    const restCall = buildCall('call-rest');
    const rows = [
      buildRow({ positionId: 'pos-a', revision: 1, authorComment: restCall }),
    ];
    const { result } = renderRealtime({ rows, dataUpdatedAt: 1_000 });

    emit(buildEvent('pos-a', { revision: 2 }));

    expect(result.current?.posts[0]?.commentId).toBe('call-rest');
  });

  it('clears the comment when a server row promotes a socket-only post with a null authorComment', () => {
    const restCall = buildCall('call-rest');
    const { result, rerender } = renderRealtime();
    emit(buildEvent('pos-a', { revision: 2, data: { authorComment: null } }));

    rerender({
      rows: [
        buildRow({ positionId: 'pos-a', revision: 1, authorComment: restCall }),
      ],
    });

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-a']);
    expect(result.current?.posts[0]?.commentId).toBeUndefined();
  });

  it('keeps socket posts while inactive', async () => {
    const { result, rerender } = renderRealtime();
    emit(buildEvent('pos-a'));

    rerender({ active: false });

    expect(positionIds(result.current?.posts ?? [])).toEqual(['pos-a']);
    await waitFor(() => expect(mockSetActive).toHaveBeenLastCalledWith(false));
  });
});

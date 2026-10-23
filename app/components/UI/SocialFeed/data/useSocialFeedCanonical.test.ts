import { act, renderHook, waitFor } from '@testing-library/react-native';
import type {
  FeedItem as CoreFeedItem,
  SocialFeedEvent,
} from '@metamask/social-controllers';
import type { TraderFeedRow } from '../types';
import { mockSpotFeedItem } from '../mocks/coreFeed.mock';
import { mapFeedItem } from '../utils/mapFeedItem';
import type { SocialFeedState, UseSocialFeedOptions } from './useSocialFeed';
import type { SocialFeedSource } from './socialFeedSource';
import {
  applyRealtimeEventToRow,
  getVisiblePendingNewCount,
  mergeRealtimeFeedItem,
  rememberEvictedRevision,
  shouldDeferPendingNewRow,
  toSocialFeedSource,
  toSocialFeedRow,
  useSocialFeedCanonical,
} from './useSocialFeedCanonical';

let mockUseIsFocused: jest.MockedFunction<() => boolean>;
let mockUseSocialFeed: jest.MockedFunction<
  (
    source: SocialFeedSource | null,
    options?: UseSocialFeedOptions,
  ) => SocialFeedState
>;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      SocialRealtimeService: {
        addListener: jest.fn(),
        addReconnectListener: jest.fn(),
        setScopes: jest.fn(),
        setActive: jest.fn(),
      },
    },
  },
}));

jest.mock('./useSocialFeed', () => ({
  useSocialFeed: jest.fn(),
}));

let mockAddListener: jest.MockedFunction<
  (listener: (event: SocialFeedEvent, scope: string) => void) => () => void
>;
let mockAddReconnectListener: jest.MockedFunction<
  (listener: () => void) => () => void
>;
let mockSetScopes: jest.MockedFunction<(scopes: string[]) => Promise<void>>;
let mockSetActive: jest.MockedFunction<(active: boolean) => Promise<void>>;

const current = {
  positionId: 'position-1',
  timestamp: 100,
  trades: [],
} as unknown as CoreFeedItem;

const httpItem = {
  positionId: 'position-1',
  timestamp: 100,
  chain: 'base',
  tokenSymbol: 'TKN',
  tokenName: 'Token',
  tokenAddress: '0x0000000000000000000000000000000000000001',
  positionAmount: 1,
  isOpen: true,
  boughtUsd: null,
  soldUsd: null,
  realizedPnl: null,
  costBasis: null,
  lastTradeAt: 100,
  trades: [],
  actor: {
    profileId: 'profile-1',
    name: 'Trader',
    address: '0x0000000000000000000000000000000000000002',
    imageUrl: null,
  },
} as unknown as CoreFeedItem;

const event = {
  version: 1,
  kind: 'feed-item',
  eventId: 'event-2',
  feedItemId: 'position-1',
  revision: 2,
  occurredAt: '2026-01-01T00:00:02.000Z',
  data: {
    ...httpItem,
    timestamp: 200,
    lastTradeAt: 200,
  },
} as unknown as SocialFeedEvent;

const createFeedState = (
  overrides: Partial<SocialFeedState> = {},
): SocialFeedState => ({
  posts: [],
  rows: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: jest.fn(),
  error: null,
  refresh: jest.fn().mockResolvedValue(undefined),
  dataUpdatedAt: 1_700_000_000_000,
  ...overrides,
});

const createRealtimeEvent = (
  overrides: Partial<SocialFeedEvent> = {},
): SocialFeedEvent =>
  ({
    version: 1,
    kind: 'feed-item',
    eventId: 'event-1',
    feedItemId: 'position-1',
    revision: 1,
    occurredAt: '2026-01-01T00:00:01.000Z',
    data: httpItem,
    ...overrides,
  }) as unknown as SocialFeedEvent;

describe('useSocialFeedCanonical helpers', () => {
  it('maps canonical scopes to HTTP feed sources', () => {
    expect(toSocialFeedSource('trending')).toEqual({
      kind: 'all',
      audience: 'all',
      scope: 'trending',
    });
    expect(toSocialFeedSource('following')).toEqual({
      kind: 'all',
      audience: 'following',
      scope: 'following',
    });
    expect(toSocialFeedSource('all')).toEqual({
      kind: 'all',
      audience: 'all',
      scope: 'all',
    });
  });

  it('preserves HTTP presentation fields while applying event revision metadata', () => {
    const merged = mergeRealtimeFeedItem(current, event);

    expect(merged).toMatchObject({
      positionId: 'position-1',
      timestamp: 200,
      eventId: 'event-2',
      revision: 2,
      occurredAt: '2026-01-01T00:00:02.000Z',
    });
    expect(merged?.trades).toEqual([]);
  });

  it('normalizes a full event without an HTTP row', () => {
    const fullEvent = {
      ...event,
      data: httpItem,
    } as unknown as SocialFeedEvent;
    const merged = mergeRealtimeFeedItem(undefined, fullEvent);

    expect(merged).toMatchObject({
      positionId: 'position-1',
      tokenSymbol: 'TKN',
      eventId: 'event-2',
      revision: 2,
    });
  });

  it('preserves Live identity and ordering while applying an existing row revision', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const liveRow = toSocialFeedRow(row);
    const revisedRow = applyRealtimeEventToRow(row, event, liveRow, false);

    expect(revisedRow).toMatchObject({
      stableId: liveRow.stableId,
      sortTimestamp: liveRow.sortTimestamp,
      realtimeEventId: undefined,
      revision: event.revision,
      item: {
        id: liveRow.item.id,
        timestamp: 200000,
      },
    });
  });

  it('retains the event ID when a pending new row enters the Live feed', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const liveRow = applyRealtimeEventToRow(row, event, undefined, true);

    expect(liveRow?.realtimeEventId).toBe(event.eventId);
  });

  it('keeps the entrance event ID of a Live row across later revisions', () => {
    const item = mapFeedItem(httpItem);
    if (!item) {
      throw new Error('Expected the HTTP item to map');
    }
    const row: TraderFeedRow = { core: httpItem, item };
    const enteredRow = {
      ...toSocialFeedRow(row),
      realtimeEventId: 'event-1',
      revision: 1,
    };

    const revisedRow = applyRealtimeEventToRow(
      undefined,
      event,
      enteredRow,
      true,
    );

    expect(revisedRow?.realtimeEventId).toBe('event-1');
    expect(revisedRow?.revision).toBe(event.revision);
  });

  it('hides pending count while Live is active at the top', () => {
    expect(getVisiblePendingNewCount(1, false, true)).toBe(0);
    expect(getVisiblePendingNewCount(1, true, true)).toBe(1);
    expect(getVisiblePendingNewCount(1, false, false)).toBe(1);
  });

  it('hides pending count while queued posts are being revealed', () => {
    expect(getVisiblePendingNewCount(6, true, true, true)).toBe(0);
  });

  it('defers the HTTP row while a new realtime item is pending', () => {
    expect(shouldDeferPendingNewRow({ animate: true })).toBe(true);
    expect(shouldDeferPendingNewRow({ animate: false })).toBe(false);
    expect(shouldDeferPendingNewRow(undefined)).toBe(false);
  });

  it('keeps the evicted revision ledger bounded and monotonic', () => {
    const ledger = new Map<string, number>();

    rememberEvictedRevision(ledger, 'position-1', 3);
    rememberEvictedRevision(ledger, 'position-1', 2);
    for (let index = 2; index <= 61; index++) {
      rememberEvictedRevision(ledger, `position-${index}`, index);
    }

    expect(ledger.get('position-1')).toBeUndefined();
    expect(ledger.get('position-61')).toBe(61);
    expect(ledger.size).toBe(60);
  });
});

describe('useSocialFeedCanonical', () => {
  let realtimeListener:
    | ((event: SocialFeedEvent, scope: string) => void)
    | undefined;
  let reconnectListener: (() => void) | undefined;

  beforeEach(() => {
    mockUseIsFocused = jest.requireMock('@react-navigation/native')
      .useIsFocused as jest.MockedFunction<() => boolean>;
    mockUseSocialFeed = jest.requireMock('./useSocialFeed')
      .useSocialFeed as jest.MockedFunction<
      (
        source: SocialFeedSource | null,
        options?: UseSocialFeedOptions,
      ) => SocialFeedState
    >;
    const mockRealtimeService = jest.requireMock('../../../../core/Engine')
      .default.context.SocialRealtimeService;
    mockAddListener = jest.mocked(mockRealtimeService.addListener);
    mockAddReconnectListener = jest.mocked(
      mockRealtimeService.addReconnectListener,
    );
    mockSetScopes = jest.mocked(mockRealtimeService.setScopes);
    mockSetActive = jest.mocked(mockRealtimeService.setActive);
    jest.clearAllMocks();
    realtimeListener = undefined;
    reconnectListener = undefined;
    mockUseIsFocused.mockReturnValue(true);
    mockUseSocialFeed.mockReturnValue(createFeedState());
    mockAddListener.mockImplementation(
      (listener: (event: SocialFeedEvent, scope: string) => void) => {
        realtimeListener = listener;
        return jest.fn();
      },
    );
    mockAddReconnectListener.mockImplementation((listener: () => void) => {
      reconnectListener = listener;
      return jest.fn();
    });
    mockSetScopes.mockResolvedValue(undefined);
    mockSetActive.mockResolvedValue(undefined);
  });

  it('maps HTTP rows and delegates feed actions', async () => {
    const core = mockSpotFeedItem({ positionId: 'position-1' });
    const item = mapFeedItem(core);
    if (!item) {
      throw new Error('Expected the feed item to map');
    }
    const loadMore = jest.fn();
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseSocialFeed.mockReturnValue(
      createFeedState({
        rows: [{ core, item }],
        isLoading: true,
        isFetchingNextPage: true,
        hasNextPage: true,
        loadMore,
        refresh,
      }),
    );

    const { result } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'trending',
      }),
    );

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0]?.position?.positionId).toBe('position-1');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(true);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.loadMore).toBe(loadMore);
    expect(result.current.refresh).toBe(refresh);
    expect(mockUseSocialFeed).toHaveBeenCalledWith(
      {
        kind: 'all',
        audience: 'all',
        scope: 'trending',
      },
      {
        enabled: true,
        pageSize: 30,
      },
    );
  });

  it('enables the realtime service for the active all feed', async () => {
    const { unmount } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'all',
        realtime: true,
      }),
    );

    await waitFor(() => expect(mockSetActive).toHaveBeenCalledWith(true));
    expect(mockSetScopes).toHaveBeenCalledWith(['all']);
    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddReconnectListener).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('uses the trending realtime scope and deactivates it on unmount', async () => {
    const { unmount } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'trending',
        realtime: true,
      }),
    );

    await waitFor(() =>
      expect(mockSetScopes).toHaveBeenCalledWith(['trending']),
    );
    unmount();

    expect(mockSetActive).toHaveBeenLastCalledWith(false);
  });

  it('does not enable realtime for the following scope', () => {
    renderHook(() =>
      useSocialFeedCanonical({
        scope: 'following',
        realtime: true,
      }),
    );

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockSetActive).not.toHaveBeenCalled();
    expect(mockUseSocialFeed).toHaveBeenCalledWith(
      {
        kind: 'all',
        audience: 'following',
        scope: 'following',
      },
      {
        enabled: true,
        pageSize: 30,
      },
    );
  });

  it('does not enable realtime while the feed is disabled or unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderHook(() =>
      useSocialFeedCanonical({
        enabled: false,
        realtime: true,
      }),
    );

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockSetActive).not.toHaveBeenCalled();
    expect(mockUseSocialFeed).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false }),
    );
  });

  it('applies an active realtime event as an animated row', async () => {
    const { result } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'all',
        realtime: true,
      }),
    );

    await waitFor(() => expect(realtimeListener).toBeDefined());
    act(() => {
      realtimeListener?.(createRealtimeEvent(), 'all');
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0]?.realtimeEventId).toBe('event-1');
  });

  it('ignores events from another realtime scope', async () => {
    const { result } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'all',
        realtime: true,
      }),
    );

    await waitFor(() => expect(realtimeListener).toBeDefined());
    act(() => {
      realtimeListener?.(createRealtimeEvent(), 'trending');
    });

    expect(result.current.posts).toEqual([]);
    expect(result.current.pendingNewCount).toBe(0);
  });

  it('queues realtime events away from the top and drains them at the top', async () => {
    const { result, rerender } = renderHook(
      ({ nearTop }) =>
        useSocialFeedCanonical({
          scope: 'all',
          realtime: true,
          nearTop,
        }),
      { initialProps: { nearTop: false } },
    );

    await waitFor(() => expect(realtimeListener).toBeDefined());
    act(() => {
      realtimeListener?.(createRealtimeEvent(), 'all');
    });
    expect(result.current.pendingNewCount).toBe(1);
    expect(result.current.posts).toEqual([]);

    rerender({ nearTop: true });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.pendingNewCount).toBe(0);
  });

  it('reveals queued events immediately when requested while paused', async () => {
    const { result } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'all',
        realtime: true,
        paused: true,
      }),
    );

    await waitFor(() => expect(realtimeListener).toBeDefined());
    act(() => {
      realtimeListener?.(createRealtimeEvent(), 'all');
    });
    expect(result.current.pendingNewCount).toBe(1);

    act(() => {
      result.current.revealPending();
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.pendingNewCount).toBe(0);
  });

  it('refreshes after reconnecting and deactivates realtime when disabled', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseSocialFeed.mockReturnValue(createFeedState({ refresh }));
    const { rerender } = renderHook(
      ({ realtime }) =>
        useSocialFeedCanonical({
          scope: 'all',
          realtime,
        }),
      { initialProps: { realtime: true } },
    );

    await waitFor(() => expect(reconnectListener).toBeDefined());
    await act(async () => {
      reconnectListener?.();
    });
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender({ realtime: false });
    expect(mockSetActive).toHaveBeenLastCalledWith(false);
  });

  it('ignores a stale revision after a newer realtime row is applied', async () => {
    const { result } = renderHook(() =>
      useSocialFeedCanonical({
        scope: 'all',
        realtime: true,
      }),
    );

    await waitFor(() => expect(realtimeListener).toBeDefined());
    act(() => {
      realtimeListener?.(
        createRealtimeEvent({ revision: 2, eventId: 'event-2' }),
        'all',
      );
      realtimeListener?.(
        createRealtimeEvent({ revision: 1, eventId: 'event-1-old' }),
        'all',
      );
    });

    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.posts[0]?.realtimeEventId).toBe('event-2');
  });
});

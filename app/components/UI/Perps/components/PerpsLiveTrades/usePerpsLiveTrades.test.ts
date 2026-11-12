import { act, renderHook } from '@testing-library/react-native';
import type { SocialV1FeedPost } from '../../../SocialFeed';
import { PERPS_LIVE_TRADES_CONFIG } from '../../constants/perpsConfig';
import {
  isLiveTradePost,
  selectNewLiveTrades,
  usePerpsLiveTrades,
} from './usePerpsLiveTrades';

const mockRefresh = jest.fn();
const mockUseSocialFeed = jest.fn();
const mockFeedState: {
  posts: SocialV1FeedPost[];
  isLoading: boolean;
  error: string | null;
  dataUpdatedAt: number | undefined;
} = { posts: [], isLoading: false, error: null, dataUpdatedAt: 1 };

jest.mock('../../../SocialFeed', () => ({
  ...jest.requireActual('../../../SocialFeed'),
  useSocialFeed: (
    source: unknown,
    options: { filterPost?: (post: SocialV1FeedPost) => boolean },
  ) => {
    mockUseSocialFeed(source, options);
    return {
      ...mockFeedState,
      posts: options.filterPost
        ? mockFeedState.posts.filter(options.filterPost)
        : mockFeedState.posts,
      rows: [],
      refresh: mockRefresh,
    };
  },
}));

const buildPost = (
  id: string,
  {
    variant = 'perpsOpen',
    winRatePercent = 72,
    valueLabel = '',
  }: {
    variant?: SocialV1FeedPost['item']['variant'];
    winRatePercent?: number | null;
    valueLabel?: string;
  } = {},
): SocialV1FeedPost =>
  ({
    id,
    authorHandle: `trader-${id}`,
    timestampMs: 0,
    reactions: [],
    item: {
      id,
      variant,
      direction: 'long',
      author: { id: `author-${id}`, username: `trader-${id}`, winRatePercent },
      asset: { symbol: 'BTC' },
      timestamp: 0,
      valueLabel,
      pnlLabel: '',
      isPnlPositive: true,
    },
  }) as unknown as SocialV1FeedPost;

const buildPosts = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => buildPost(`${prefix}${index}`));

const idsOf = (posts: SocialV1FeedPost[]) => posts.map((post) => post.id);

const replacePost = (id: string, post: SocialV1FeedPost) => {
  mockFeedState.posts = mockFeedState.posts.map((current) =>
    current.id === id ? post : current,
  );
};

const advance = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

describe('isLiveTradePost', () => {
  it.each([
    ['an open perp trade above the threshold', buildPost('a'), true],
    [
      'a closed perp trade above the threshold',
      buildPost('b', { variant: 'perpsClosed' }),
      true,
    ],
    [
      'a trader at exactly the threshold',
      buildPost('c', {
        winRatePercent: PERPS_LIVE_TRADES_CONFIG.MinWinRatePercent,
      }),
      false,
    ],
    [
      'a trader with no win rate',
      buildPost('d', { winRatePercent: null }),
      false,
    ],
    ['a spot trade', buildPost('e', { variant: 'spotOpen' }), false],
  ])('returns %s as %s', (_label, post, expected) => {
    expect(isLiveTradePost(post)).toBe(expected);
  });

  describe('when the threshold is below zero', () => {
    let restoreThreshold: () => void;

    beforeEach(() => {
      restoreThreshold = jest.replaceProperty(
        PERPS_LIVE_TRADES_CONFIG as Record<'MinWinRatePercent', number>,
        'MinWinRatePercent',
        -1,
      ).restore;
    });

    afterEach(() => {
      restoreThreshold();
    });

    it.each([
      ['keeps a genuine zero win rate', 0, true],
      ['excludes a missing win rate', null, false],
      ['excludes an invalid win rate', Number.NaN, false],
    ])('%s', (_label, winRatePercent, expected) => {
      expect(isLiveTradePost(buildPost('z', { winRatePercent }))).toBe(
        expected,
      );
    });
  });
});

describe('selectNewLiveTrades', () => {
  it('returns unseen posts oldest first, capped at the newest list size', () => {
    const posts = buildPosts('n', 7);

    const result = selectNewLiveTrades(posts, new Set(['n1']));

    expect(idsOf(result)).toEqual(['n5', 'n4', 'n3', 'n2', 'n0']);
  });
});

describe('usePerpsLiveTrades', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockRefresh.mockReset().mockResolvedValue(undefined);
    mockUseSocialFeed.mockClear();
    mockFeedState.posts = [];
    mockFeedState.isLoading = false;
    mockFeedState.error = null;
    mockFeedState.dataUpdatedAt = 1;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderLiveTrades = (isActive = true, isOffline = false) =>
    renderHook(
      (props: { isActive: boolean; isOffline: boolean }) =>
        usePerpsLiveTrades(props),
      { initialProps: { isActive, isOffline } },
    );

  it('shows the latest trades at once on first load', () => {
    mockFeedState.posts = buildPosts('p', 7);

    const { result } = renderLiveTrades();

    expect(idsOf(result.current.trades)).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
  });

  it('shows cached trades from the first render', () => {
    mockFeedState.posts = buildPosts('p', 5);
    const renderedTrades: string[][] = [];

    renderHook(() => {
      const result = usePerpsLiveTrades({ isActive: true, isOffline: false });
      renderedTrades.push(idsOf(result.trades));
      return result;
    });

    expect(renderedTrades[0]).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
  });

  it('adds new trades at the top one per second', async () => {
    mockFeedState.posts = buildPosts('p', 5);
    const { result, rerender } = renderLiveTrades();

    mockFeedState.posts = [
      buildPost('new1'),
      buildPost('new0'),
      ...buildPosts('p', 5),
    ];
    rerender({ isActive: true, isOffline: false });
    expect(idsOf(result.current.trades)[0]).toBe('p0');

    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);
    expect(idsOf(result.current.trades)).toEqual([
      'new0',
      'p0',
      'p1',
      'p2',
      'p3',
    ]);

    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);
    expect(idsOf(result.current.trades)).toEqual([
      'new1',
      'new0',
      'p0',
      'p1',
      'p2',
    ]);
  });

  it('only shows the newest five when more new trades arrive at once', async () => {
    mockFeedState.posts = buildPosts('p', 5);
    const { result, rerender } = renderLiveTrades();

    mockFeedState.posts = [...buildPosts('new', 7), ...buildPosts('p', 5)];
    rerender({ isActive: true, isOffline: false });
    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs * 7);

    expect(idsOf(result.current.trades)).toEqual([
      'new0',
      'new1',
      'new2',
      'new3',
      'new4',
    ]);
  });

  it.each([
    ['inactive', { isActive: false, isOffline: false }],
    ['offline', { isActive: true, isOffline: true }],
  ])(
    'holds new trades while %s and adds them once live',
    async (_label, heldProps) => {
      mockFeedState.posts = buildPosts('p', 5);
      const { result, rerender } = renderLiveTrades(
        heldProps.isActive,
        heldProps.isOffline,
      );

      mockFeedState.posts = [buildPost('new0'), ...buildPosts('p', 5)];
      rerender(heldProps);
      await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs * 3);
      expect(idsOf(result.current.trades)[0]).toBe('p0');

      rerender({ isActive: true, isOffline: false });
      await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);
      expect(idsOf(result.current.trades)[0]).toBe('new0');
    },
  );

  it('shows a newer revision of a displayed trade without waiting', () => {
    mockFeedState.posts = buildPosts('p', 5);
    const { result, rerender } = renderLiveTrades();

    replacePost('p1', buildPost('p1', { valueLabel: '$2,500' }));
    rerender({ isActive: true, isOffline: false });

    expect(idsOf(result.current.trades)).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
    expect(result.current.trades[1].item.valueLabel).toBe('$2,500');
  });

  it('removes a displayed trade once its trader drops below the threshold', () => {
    mockFeedState.posts = buildPosts('p', 6);
    const { result, rerender } = renderLiveTrades();

    replacePost(
      'p1',
      buildPost('p1', {
        winRatePercent: PERPS_LIVE_TRADES_CONFIG.MinWinRatePercent - 10,
      }),
    );
    rerender({ isActive: true, isOffline: false });

    expect(idsOf(result.current.trades)).toEqual([
      'p0',
      'p2',
      'p3',
      'p4',
      'p5',
    ]);
  });

  it('keeps the shown trades while inactive even when the feed drops streamed posts', () => {
    mockFeedState.posts = [buildPost('streamed0'), ...buildPosts('p', 5)];
    const { result, rerender } = renderLiveTrades();

    mockFeedState.posts = buildPosts('p', 5);
    rerender({ isActive: false, isOffline: false });

    expect(idsOf(result.current.trades)).toEqual([
      'streamed0',
      'p0',
      'p1',
      'p2',
      'p3',
    ]);
  });

  it('adds the newest revision of a queued trade', async () => {
    mockFeedState.posts = buildPosts('p', 5);
    const { result, rerender } = renderLiveTrades();
    mockFeedState.posts = [
      buildPost('new0', { valueLabel: '$100' }),
      ...buildPosts('p', 5),
    ];
    rerender({ isActive: true, isOffline: false });

    replacePost('new0', buildPost('new0', { valueLabel: '$300' }));
    rerender({ isActive: true, isOffline: false });
    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);

    expect(result.current.trades[0].id).toBe('new0');
    expect(result.current.trades[0].item.valueLabel).toBe('$300');
  });

  it('skips a queued trade whose trader drops below the threshold', async () => {
    mockFeedState.posts = buildPosts('p', 5);
    const { result, rerender } = renderLiveTrades();
    mockFeedState.posts = [
      buildPost('new1'),
      buildPost('new0'),
      ...buildPosts('p', 5),
    ];
    rerender({ isActive: true, isOffline: false });

    replacePost('new0', buildPost('new0', { winRatePercent: null }));
    rerender({ isActive: true, isOffline: false });
    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);

    expect(idsOf(result.current.trades)).toEqual([
      'new1',
      'p0',
      'p1',
      'p2',
      'p3',
    ]);
  });

  it.each([true, false])(
    'requests live updates only while active (%s)',
    (isActive) => {
      renderLiveTrades(isActive);

      expect(mockUseSocialFeed).toHaveBeenLastCalledWith(
        { scope: 'all', chains: ['eip155:999'] },
        expect.objectContaining({ realtime: isActive }),
      );
    },
  );

  it('reports loading only until trades are shown', () => {
    mockFeedState.isLoading = true;

    const { result } = renderLiveTrades();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.trades).toEqual([]);
  });

  it.each([
    ['online', false, true],
    ['offline', true, false],
  ])(
    'fetches only while not known to be offline (%s)',
    (_label, isOffline, enabled) => {
      renderLiveTrades(true, isOffline);

      expect(mockUseSocialFeed).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({ enabled, realtime: true }),
      );
    },
  );

  it('does not refetch on retry while offline', async () => {
    const { result, rerender } = renderLiveTrades(true, true);

    await act(async () => {
      await result.current.refresh();
    });
    expect(mockRefresh).not.toHaveBeenCalled();

    rerender({ isActive: true, isOffline: false });
    await act(async () => {
      await result.current.refresh();
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('reports loading instead of empty while offline before any trades load', () => {
    mockFeedState.dataUpdatedAt = undefined;

    const { result } = renderLiveTrades(true, true);

    expect(result.current.isLoading).toBe(true);
    expect(result.current.trades).toEqual([]);
  });

  it('keeps showing cached trades while offline', () => {
    mockFeedState.posts = buildPosts('p', 5);

    const { result } = renderLiveTrades(true, true);

    expect(result.current.isLoading).toBe(false);
    expect(idsOf(result.current.trades)).toEqual([
      'p0',
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
  });
});

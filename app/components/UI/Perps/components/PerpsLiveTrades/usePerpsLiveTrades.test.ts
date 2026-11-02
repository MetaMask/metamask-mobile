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
} = { posts: [], isLoading: false, error: null };

jest.mock('../../../SocialFeed', () => ({
  ...jest.requireActual('../../../SocialFeed'),
  useSocialFeed: (...args: unknown[]) => {
    mockUseSocialFeed(...args);
    return { ...mockFeedState, rows: [], refresh: mockRefresh };
  },
}));

const buildPost = (
  id: string,
  {
    variant = 'perpsOpen',
    winRatePercent = 72,
  }: {
    variant?: SocialV1FeedPost['item']['variant'];
    winRatePercent?: number | null;
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
      valueLabel: '',
      pnlLabel: '',
      isPnlPositive: true,
    },
  }) as unknown as SocialV1FeedPost;

const buildPosts = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => buildPost(`${prefix}${index}`));

const idsOf = (posts: SocialV1FeedPost[]) => posts.map((post) => post.id);

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
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderLiveTrades = (isActive = true) =>
    renderHook((props: { isActive: boolean }) => usePerpsLiveTrades(props), {
      initialProps: { isActive },
    });

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
      const result = usePerpsLiveTrades({ isActive: true });
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
    rerender({ isActive: true });
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
    rerender({ isActive: true });
    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs * 7);

    expect(idsOf(result.current.trades)).toEqual([
      'new0',
      'new1',
      'new2',
      'new3',
      'new4',
    ]);
  });

  it('holds new trades while inactive and adds them once active', async () => {
    mockFeedState.posts = buildPosts('p', 5);
    const { result, rerender } = renderLiveTrades(false);

    mockFeedState.posts = [buildPost('new0'), ...buildPosts('p', 5)];
    rerender({ isActive: false });
    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs * 3);
    expect(idsOf(result.current.trades)[0]).toBe('p0');

    rerender({ isActive: true });
    await advance(PERPS_LIVE_TRADES_CONFIG.RevealIntervalMs);
    expect(idsOf(result.current.trades)[0]).toBe('new0');
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
});

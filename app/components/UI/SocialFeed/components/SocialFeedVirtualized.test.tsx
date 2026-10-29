import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { useIsFocused } from '@react-navigation/native';
import React from 'react';
import { FlatList, RefreshControl, Text } from 'react-native';
import {
  useAnimatedScrollHandler,
  useComposedEventHandler,
} from 'react-native-reanimated';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { createSocialFeedEntrances } from '../data/socialFeedEntrances';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import { useSocialFeed, type SocialFeedState } from '../data/useSocialFeed';
import { useSocialLivePrices } from '../live/SocialLivePricesContext';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialFeedPageHandle, SocialV1FeedPost } from '../types';
import FeedItemEntryAnimation from './FeedItemEntryAnimation';
import type { SocialFeedInlineRow } from './SocialFeed.types';
import { useSocialFeedRealtime } from './SocialFeedRealtime/SocialFeedRealtimeContext';
import SocialFeedVirtualized, {
  REFRESH_MIN_DURATION_MS,
} from './SocialFeedVirtualized';

const RealtimeProbe = () => {
  const realtime = useSocialFeedRealtime();
  if (!realtime) {
    return null;
  }
  const { paused, pendingNewCount } = realtime;
  return <Text>{`${pendingNewCount} held${paused ? ', paused' : ''}`}</Text>;
};

jest.mock('../../../../util/haptics', () => ({
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockUseSocialFeedScreenView = jest.fn();
jest.mock('../socialFeedTracking', () => ({
  SocialFeedTrackingProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useSocialFeedTracking: () => ({}),
  useSocialFeedScreenView: (...args: unknown[]) =>
    mockUseSocialFeedScreenView(...args),
  socialFeedTracksLocation: () => false,
}));
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import {
  SOCIAL_FEED_EMPTY_TEST_ID,
  SOCIAL_FEED_RETRY_TEST_ID,
} from './SocialFeedStates.testIds';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';
import {
  SocialFeedSurfaceProvider,
  useSocialFeedSurface,
} from '../SocialFeedSurface';
import { useSocialTabFirstContentTrace } from '../../../Views/SocialLeaderboard/SocialV1View/performance/useSocialTabFirstContentTrace';
import type { SocialPerformanceContext } from '../../../../util/social/socialPerformance';

jest.mock(
  '../../../Views/SocialLeaderboard/SocialV1View/performance/useSocialTabFirstContentTrace',
  () => ({ useSocialTabFirstContentTrace: jest.fn() }),
);

jest.mock('@react-navigation/native', () => ({
  useIsFocused: jest.fn(() => true),
}));

jest.mock('../data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(() => null),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(() => null),
}));

jest.mock('../live/SocialLivePricesContext', () => ({
  useSocialLivePrices: jest.fn(() => null),
}));

const mockIsEntryHidden = jest.fn((_entry: { postId: string }) => false);
jest.mock('./SocialEntryOptionsBottomSheet', () => ({
  useSocialEntryModeration: () => ({ isEntryHidden: mockIsEntryHidden }),
}));

jest.mock('./SocialFeedPostShell', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: { id: string } }) => (
      <MockText>{post.id}</MockText>
    ),
  };
});

jest.mock('./FeedItemEntryAnimation', () => ({
  __esModule: true,
  default: jest.fn(({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  )),
  createFeedItemEntryScheduler: () => () => 0,
  FEED_ROW_LAYOUT_TRANSITION: 'row-layout-transition',
  FEED_ROW_LAYOUT_TRANSITION_LOW: 'row-layout-transition-low',
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedScrollHandler: jest.fn(() => 'near-top-handler'),
    useComposedEventHandler: jest.fn(() => undefined),
    useReducedMotion: jest.fn(() => false),
  };
});

type NearTopWorklet = (
  event: { contentOffset: { y: number } },
  context: Record<string, unknown>,
) => void;

const mockUseSocialFeed = jest.mocked(useSocialFeed);
const mockUseIsFocused = jest.mocked(useIsFocused);
const mockUseNetworkTier = jest.mocked(useNetworkTier);
const mockGetHardwareTier = jest.mocked(getHardwareTier);
const mockUseSocialLivePrices = jest.mocked(useSocialLivePrices);
const mockFeedItemEntryAnimation = jest.mocked(FeedItemEntryAnimation);
const mockUseAnimatedScrollHandler = jest.mocked(useAnimatedScrollHandler);
const mockUseComposedEventHandler = jest.mocked(useComposedEventHandler);
const mockUseSocialTabFirstContentTrace = jest.mocked(
  useSocialTabFirstContentTrace,
);

const performanceContext = (
  overrides: Partial<SocialPerformanceContext> = {},
): SocialPerformanceContext => ({
  enabled: true,
  hardwareTier: null,
  isActive: true,
  isFocused: true,
  networkTier: null,
  ...overrides,
});

const inlineRow = (key: string, afterIndex: number): SocialFeedInlineRow => ({
  key,
  afterIndex,
  render: () => <Text>{key}</Text>,
});

/** Text of every post and inline row on screen, top to bottom. */
const renderedRowTexts = (pattern: RegExp) =>
  screen.getAllByText(pattern).map((node) => node.props.children);

const SurfaceProbe: React.FC = () => {
  const { showMockedFields } = useSocialFeedSurface();
  return <Text>{`mocked:${showMockedFields}`}</Text>;
};

const query: SocialFeedQuery = { scope: 'all' };

const post = (id: string): SocialV1FeedPost => ({
  id,
  authorHandle: 'ada',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id }),
});

const feedState = (
  overrides: Partial<SocialFeedState> = {},
): SocialFeedState => ({
  posts: [],
  rows: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: jest.fn(),
  error: null,
  refresh: jest.fn(async () => undefined),
  dataUpdatedAt: 1,
  ...overrides,
});

const realtimeState = (pendingNewCount = 0) => ({
  pendingNewCount,
  revealPending: jest.fn(),
  entrances: createSocialFeedEntrances(),
});

const renderFeed = (
  props: Partial<React.ComponentProps<typeof SocialFeedVirtualized>> = {},
) =>
  render(
    <SocialFeedVirtualized
      {...query}
      location="social_live"
      scrollMode="virtualized"
      scrollTestID="feed-scroll"
      {...props}
    />,
  );

const getList = () => screen.UNSAFE_getByType(FlatList);

const lastFeedOptions = () => mockUseSocialFeed.mock.lastCall?.[1];

describe('SocialFeedVirtualized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocialFeed.mockReturnValue(feedState());
    mockUseIsFocused.mockReturnValue(true);
    mockUseNetworkTier.mockReturnValue(null);
    mockGetHardwareTier.mockReturnValue(null);
    mockUseSocialLivePrices.mockReturnValue(null);
    mockIsEntryHidden.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders posts with a divider below every post but the last', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderFeed();

    expect(screen.getByText('one')).toBeOnTheScreen();
    expect(screen.getByText('two')).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('social_live-one')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getSocialV1FeedEntryDividerTestId('social_live-two'),
      ),
    ).toBeNull();
  });

  it('keeps the existing first post divider-free when a post lands on top', () => {
    mockUseSocialFeed.mockReturnValue(feedState({ posts: [post('one')] }));
    const { rerender } = renderFeed();
    const dividerBeforeInsert = screen.queryByTestId(
      getSocialV1FeedEntryDividerTestId('social_live-one'),
    );

    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('new'), post('one')] }),
    );
    rerender(
      <SocialFeedVirtualized
        {...query}
        location="social_live"
        scrollMode="virtualized"
        scrollTestID="feed-scroll"
      />,
    );

    expect(dividerBeforeInsert).toBeNull();
    expect(
      screen.queryByTestId(
        getSocialV1FeedEntryDividerTestId('social_live-one'),
      ),
    ).toBeNull();
    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('social_live-new')),
    ).toBeOnTheScreen();
  });

  it('hides posts the viewer hid', () => {
    mockIsEntryHidden.mockImplementation(
      ({ postId }: { postId: string }) => postId === 'one',
    );
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderFeed();

    expect(screen.queryByText('one')).toBeNull();
    expect(screen.getByText('two')).toBeOnTheScreen();
  });

  it('passes the realtime, pause, and filter options to the feed', () => {
    const filterPost = jest.fn(() => true);

    renderFeed({ realtime: true, paused: true, filterPost });

    expect(mockUseSocialFeed).toHaveBeenCalledWith(query, {
      enabled: true,
      realtime: true,
      paused: true,
      nearTop: true,
      holdNewPosts: false,
      filterPost,
    });
  });

  it('stops fetching while unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderFeed();

    expect(lastFeedOptions()?.enabled).toBe(false);
  });

  it('stops fetching offline and shows two placeholder posts', () => {
    mockUseNetworkTier.mockReturnValue('NONE');
    mockUseSocialFeed.mockReturnValue(feedState({ dataUpdatedAt: undefined }));

    renderFeed();

    expect(lastFeedOptions()?.enabled).toBe(false);
    expect(mockUseSocialFeedScreenView).toHaveBeenCalledWith(
      'social_live',
      undefined,
      [true, false, false],
      undefined,
    );
    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(1)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(getSocialFeedPostSkeletonTestId(2))).toBeNull();
  });

  it('holds new posts on slow cellular', () => {
    mockUseNetworkTier.mockReturnValue('SLOW_CELLULAR');

    renderFeed();

    expect(lastFeedOptions()).toEqual(
      expect.objectContaining({ enabled: true, holdNewPosts: true }),
    );
  });

  it('shows two placeholder posts on low-end hardware', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseSocialFeed.mockReturnValue(feedState({ isLoading: true }));

    renderFeed();

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(1)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(getSocialFeedPostSkeletonTestId(2))).toBeNull();
  });

  it('uses a smaller window and reduced motion on low-end hardware', () => {
    mockGetHardwareTier.mockReturnValue('LOW');
    mockUseSocialFeed.mockReturnValue(feedState({ posts: [post('one')] }));

    renderFeed();

    expect(getList().props).toEqual(
      expect.objectContaining({
        initialNumToRender: 4,
        maxToRenderPerBatch: 1,
        windowSize: 3,
        itemLayoutAnimation: 'row-layout-transition-low',
      }),
    );
    expect(mockFeedItemEntryAnimation.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ reducedMotion: true }),
    );
  });

  it('keeps the default window, skeleton, and motion while tiers are unknown', () => {
    mockUseSocialFeed.mockReturnValue(feedState({ isLoading: true }));

    renderFeed();

    expect(getList().props).toEqual(
      expect.objectContaining({
        initialNumToRender: 6,
        maxToRenderPerBatch: 1,
        windowSize: 5,
        itemLayoutAnimation: 'row-layout-transition',
      }),
    );
    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(3)),
    ).toBeOnTheScreen();
    expect(lastFeedOptions()).toEqual(
      expect.objectContaining({ enabled: true, holdNewPosts: false }),
    );
  });

  it('composes the host scroll handler and reports leaving the top', async () => {
    const hostOnScroll = jest.fn();
    renderFeed({ onScroll: hostOnScroll as never });
    const nearTopWorklet = (
      mockUseAnimatedScrollHandler.mock.calls[0][0] as {
        onScroll: NearTopWorklet;
      }
    ).onScroll;

    act(() => {
      nearTopWorklet({ contentOffset: { y: 120 } }, {});
    });

    expect(mockUseComposedEventHandler).toHaveBeenCalledWith([
      hostOnScroll,
      'near-top-handler',
    ]);
    await waitFor(() => expect(lastFeedOptions()?.nearTop).toBe(false));
  });

  it('scrolls the list through the page ref', () => {
    const scrollToOffset = jest
      .spyOn(FlatList.prototype, 'scrollToOffset')
      .mockImplementation(() => undefined);
    const pageRef = React.createRef<SocialFeedPageHandle>();
    renderFeed({ pageRef });

    act(() => {
      pageRef.current?.scrollToOffset(12, true);
    });

    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 12, animated: true });
  });

  it('loads the next page at the end of the list', () => {
    const loadMore = jest.fn();
    mockUseSocialFeed.mockReturnValue(feedState({ loadMore }));
    renderFeed();

    act(() => {
      getList().props.onEndReached();
    });

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('refreshes through the refresh control', async () => {
    const refresh = jest.fn(async () => undefined);
    mockUseSocialFeed.mockReturnValue(feedState({ refresh }));
    renderFeed();

    await act(async () => {
      await screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('tells the host about a pull-to-refresh', async () => {
    jest.useFakeTimers();
    const onRefresh = jest.fn();
    renderFeed({ onRefresh });

    await act(async () => {
      const refreshing = screen
        .UNSAFE_getByType(RefreshControl)
        .props.onRefresh();
      jest.advanceTimersByTime(REFRESH_MIN_DURATION_MS);
      await refreshing;
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('clears the refresh spinner when the host callback throws', async () => {
    const onRefresh = jest.fn(() => {
      throw new Error('analytics down');
    });
    renderFeed({ onRefresh });
    const getRefreshControl = () => screen.UNSAFE_getByType(RefreshControl);

    await act(async () => {
      await expect(getRefreshControl().props.onRefresh()).rejects.toThrow(
        'analytics down',
      );
    });

    expect(getRefreshControl().props.refreshing).toBe(false);
  });

  it('holds the refresh spinner for the minimum duration', async () => {
    jest.useFakeTimers();
    renderFeed();
    const getRefreshControl = () => screen.UNSAFE_getByType(RefreshControl);

    await act(async () => {
      getRefreshControl().props.onRefresh();
    });
    await act(async () => {
      jest.advanceTimersByTime(REFRESH_MIN_DURATION_MS - 1);
    });
    const refreshingBeforeMinimum = getRefreshControl().props.refreshing;
    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    expect(refreshingBeforeMinimum).toBe(true);
    expect(getRefreshControl().props.refreshing).toBe(false);
  });

  const trackRevealSteps = (
    pendingNewCount: number,
    settleRefresh: () => Promise<void> = async () => undefined,
  ) => {
    const calls: string[] = [];
    const realtime = realtimeState(pendingNewCount);
    realtime.revealPending.mockImplementation(() => calls.push('reveal'));
    const refresh = jest.fn(async () => {
      await settleRefresh();
      calls.push('refresh');
    });
    jest
      .spyOn(FlatList.prototype, 'scrollToOffset')
      .mockImplementation(({ offset }) => {
        calls.push(`scroll ${offset}`);
      });
    mockUseSocialFeed.mockReturnValue(feedState({ refresh, realtime }));
    return calls;
  };

  it('reveals held posts from the pill, scrolls to the top, then refreshes', async () => {
    const calls = trackRevealSteps(3);
    renderFeed({ realtime: true });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('3 new posts'));
    });

    expect(calls).toEqual(['reveal', 'scroll 0', 'refresh']);
  });

  it('scrolls to the top from the pill before the refresh settles', async () => {
    const calls = trackRevealSteps(3, () => new Promise(() => undefined));
    renderFeed({ realtime: true });

    await act(async () => {
      fireEvent.press(screen.getByLabelText('3 new posts'));
    });

    expect(calls).toEqual(['reveal', 'scroll 0']);
  });

  it('hides the pill without held posts', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ realtime: realtimeState(0) }),
    );

    renderFeed({ realtime: true });

    expect(screen.queryByLabelText(/new post/)).toBeNull();
  });

  it('reveals held posts when resumed', async () => {
    const calls = trackRevealSteps(3);
    const { rerender } = renderFeed({ realtime: true, paused: true });

    await act(async () => {
      rerender(
        <SocialFeedVirtualized
          {...query}
          location="social_live"
          scrollMode="virtualized"
          scrollTestID="feed-scroll"
          realtime
          paused={false}
        />,
      );
    });

    expect(calls).toEqual(['reveal', 'scroll 0', 'refresh']);
  });

  it('reveals nothing while staying paused', async () => {
    const calls = trackRevealSteps(3);
    const { rerender } = renderFeed({ realtime: true, paused: true });

    await act(async () => {
      rerender(
        <SocialFeedVirtualized
          {...query}
          location="social_live"
          scrollMode="virtualized"
          scrollTestID="feed-scroll"
          realtime
          paused
        />,
      );
    });

    expect(calls).toEqual([]);
  });

  it('shares paused and the held count with the header', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ realtime: realtimeState(2) }),
    );

    renderFeed({
      realtime: true,
      paused: true,
      renderHeader: () => <RealtimeProbe />,
    });

    expect(screen.getByText('2 held, paused')).toBeOnTheScreen();
  });

  it('checks live price visibility once scrolling settles', () => {
    const requestVisibilityCheck = jest.fn();
    mockUseSocialLivePrices.mockReturnValue({
      requestVisibilityCheck,
    } as unknown as ReturnType<typeof useSocialLivePrices>);
    renderFeed();

    act(() => {
      getList().props.onMomentumScrollEnd();
      getList().props.onScrollEndDrag();
    });

    expect(requestVisibilityCheck).toHaveBeenCalledTimes(2);
  });

  it('offers a retry after a failed page while posts stay visible', () => {
    const refresh = jest.fn(async () => undefined);
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one')], error: 'next page down', refresh }),
    );
    renderFeed();

    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));

    expect(screen.getByText('one')).toBeOnTheScreen();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('loads the query its fields describe', () => {
    const assetIds = ['eip155:999/perp:BTC'] as const;

    renderFeed({ scope: 'trending', assetIds });

    expect(mockUseSocialFeed.mock.lastCall?.[0]).toEqual({
      scope: 'trending',
      assetIds,
    });
  });

  describe('mocked fields', () => {
    it('shows them when the host opts in', () => {
      renderFeed({
        showMockedFields: true,
        renderHeader: () => <SurfaceProbe />,
      });

      expect(screen.getByText('mocked:true')).toBeOnTheScreen();
    });

    it('keeps the outer surface choice when omitted', () => {
      render(
        <SocialFeedSurfaceProvider showMockedFields>
          <SocialFeedVirtualized
            {...query}
            location="social_live"
            scrollMode="virtualized"
            renderHeader={() => <SurfaceProbe />}
          />
        </SocialFeedSurfaceProvider>,
      );

      expect(screen.getByText('mocked:true')).toBeOnTheScreen();
    });
  });

  describe('inline rows', () => {
    const rowTextPattern = /^(one|two|three|rail|empty)$/;

    it('hides the rows while the first page loads', () => {
      mockUseSocialFeed.mockReturnValue(
        feedState({ isLoading: true, dataUpdatedAt: undefined }),
      );

      renderFeed({ inlineRows: [inlineRow('rail', 3)] });

      expect(screen.queryByText('rail')).toBeNull();
      expect(
        screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
      ).toBeOnTheScreen();
    });

    it('shows the rows under the empty state once the first page is empty', () => {
      renderFeed({
        inlineRows: [inlineRow('rail', 3)],
        emptyState: <Text>empty</Text>,
      });

      expect(renderedRowTexts(rowTextPattern)).toEqual(['empty', 'rail']);
    });

    it('keeps the retry below the rows after a failed first page', () => {
      mockUseSocialFeed.mockReturnValue(
        feedState({ error: 'feed down', dataUpdatedAt: undefined }),
      );

      renderFeed({
        inlineRows: [
          {
            key: 'rail',
            afterIndex: 3,
            render: () => <Text testID="inline-rail">rail</Text>,
          },
        ],
      });
      const orderedIds = screen
        .getAllByTestId(
          new RegExp(`^(inline-rail|${SOCIAL_FEED_RETRY_TEST_ID})$`),
        )
        .map((node) => node.props.testID);

      expect(screen.queryByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeNull();
      expect(orderedIds).toEqual(['inline-rail', SOCIAL_FEED_RETRY_TEST_ID]);
    });

    it('draws a divider under every row but the last, rows included', () => {
      mockUseSocialFeed.mockReturnValue(
        feedState({ posts: [post('one'), post('two')] }),
      );

      renderFeed({ inlineRows: [inlineRow('rail', 1)] });

      expect(
        screen.getByTestId(
          getSocialV1FeedEntryDividerTestId('social_live-one'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          getSocialV1FeedEntryDividerTestId('social_live-inline-rail'),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getSocialV1FeedEntryDividerTestId('social_live-two'),
        ),
      ).toBeNull();
    });
  });

  it('renders the host empty state in place of the default one', () => {
    renderFeed({ emptyState: <Text>nothing trending</Text> });

    expect(screen.getByText('nothing trending')).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeNull();
  });

  describe('performance', () => {
    it('traces the initial fetch for the tab while the context is enabled', () => {
      renderFeed({
        performance: { tab: 'trending', context: performanceContext() },
      });

      expect(lastFeedOptions()?.performance).toEqual({ tab: 'trending' });
    });

    it('does not trace the initial fetch while the context is disabled', () => {
      renderFeed({
        performance: {
          tab: 'trending',
          context: performanceContext({ enabled: false }),
        },
      });

      expect(lastFeedOptions()?.performance).toBeUndefined();
    });

    it('runs no first-content trace without a performance context', () => {
      renderFeed();

      expect(mockUseSocialTabFirstContentTrace).not.toHaveBeenCalled();
    });

    it.each<[string, Partial<SocialFeedState>, string | null, boolean]>([
      ['content once posts render', { posts: [post('one')] }, 'content', true],
      [
        'error when a failure leaves the list empty',
        { error: 'feed down', dataUpdatedAt: undefined },
        'error',
        false,
      ],
      ['empty when the settled first page is empty', {}, 'empty', true],
      [
        'nothing while the first page loads',
        { isLoading: true, dataUpdatedAt: undefined },
        null,
        false,
      ],
    ])('reports %s', (_label, overrides, expectedState, expectedUsableData) => {
      const context = performanceContext();
      mockUseSocialFeed.mockReturnValue(feedState(overrides));

      renderFeed({ performance: { tab: 'trending', context } });

      expect(mockUseSocialTabFirstContentTrace).toHaveBeenLastCalledWith({
        tab: 'trending',
        contentState: expectedState,
        hasUsableData: expectedUsableData,
        performance: context,
      });
    });
  });
});

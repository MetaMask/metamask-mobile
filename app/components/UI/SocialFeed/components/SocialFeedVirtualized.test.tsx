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
import { useSocialFeed, type SocialFeedState } from '../data/useSocialFeed';
import { useSocialLivePrices } from '../live/SocialLivePricesContext';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialFeedPageHandle, SocialV1FeedPost } from '../types';
import FeedItemEntryAnimation from './FeedItemEntryAnimation';
import type { SocialFeedHeaderProps } from './SocialFeed.types';
import SocialFeedVirtualized from './SocialFeedVirtualized';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import { SOCIAL_FEED_RETRY_TEST_ID } from './SocialFeedStates.testIds';
import { getSocialV1FeedEntryDividerTestId } from './SocialV1FeedPostList.testIds';

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

const source = { kind: 'all', audience: 'all', scope: 'all' } as const;

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
      source={source}
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
    jest.restoreAllMocks();
  });

  it('renders posts with a divider above every post but the first', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderFeed();

    expect(screen.getByText('one')).toBeOnTheScreen();
    expect(screen.getByText('two')).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialV1FeedEntryDividerTestId('social_live-two')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        getSocialV1FeedEntryDividerTestId('social_live-one'),
      ),
    ).toBeNull();
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

    expect(mockUseSocialFeed).toHaveBeenCalledWith(source, {
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

  it('reveals pending posts, refreshes, then scrolls to the top', async () => {
    const calls: string[] = [];
    const realtime = realtimeState(3);
    realtime.revealPending.mockImplementation(() => calls.push('reveal'));
    const refresh = jest.fn(async () => {
      calls.push('refresh');
    });
    jest
      .spyOn(FlatList.prototype, 'scrollToOffset')
      .mockImplementation(({ offset }) => {
        calls.push(`scroll ${offset}`);
      });
    mockUseSocialFeed.mockReturnValue(feedState({ refresh, realtime }));
    const renderHeader = jest.fn(
      ({ pendingNewCount, onRevealPending }: SocialFeedHeaderProps) => (
        <Text onPress={onRevealPending}>{`${pendingNewCount} new`}</Text>
      ),
    );
    renderFeed({ realtime: true, renderHeader });

    await act(async () => {
      fireEvent.press(screen.getByText('3 new'));
    });

    expect(calls).toEqual(['reveal', 'refresh', 'scroll 0']);
  });

  it('gives the header a no-op reveal without realtime', async () => {
    const refresh = jest.fn(async () => undefined);
    mockUseSocialFeed.mockReturnValue(feedState({ refresh }));
    const renderHeader = jest.fn(
      ({ pendingNewCount, onRevealPending }: SocialFeedHeaderProps) => (
        <Text onPress={onRevealPending}>{`${pendingNewCount} new`}</Text>
      ),
    );
    renderFeed({ renderHeader });

    await act(async () => {
      fireEvent.press(screen.getByText('0 new'));
    });

    expect(refresh).not.toHaveBeenCalled();
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
});

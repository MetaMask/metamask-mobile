import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialPerformanceContext } from '../../../../util/social/socialPerformance';
import {
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type {
  SocialFeedPageHandle,
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import { SocialEvent } from '../analytics/socialEvents';
import {
  FeedSortFilterSelectorsIDs,
  getFeedSortFilterOptionTestId,
} from '../components/Filters';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { SOCIAL_FILTER_EMPTY_STATE_TEST_ID } from '../shared/SocialFilterEmptyState';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import { SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID } from '../SocialV1View/feed/components/SocialV1FeedEmptyState.testIds';
import type { UsePopularTradersResult } from '../SocialV1View/feed/hooks/usePopularTraders';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import { FOLLOWING_SUGGESTIONS_TEST_ID } from './components/FollowingSuggestions';
import { FOLLOWING_EMPTY_LOADING_TEST_ID } from './components/FollowingEmptyContent';
import FollowingView, { FOLLOWING_FEED_QUERY } from './FollowingView';

interface MockSocialFeedProps {
  scope: string;
  realtime?: boolean;
  location: string;
  analyticsSource?: string;
  scrollMode: string;
  showMockedFields?: boolean;
  isActive?: boolean;
  renderHeader?: () => React.ReactNode;
  emptyState?: React.ReactNode;
  prepareRefresh?: () => void | Promise<void>;
  onRefresh?: () => void;
  onListStateChange?: (state: {
    showSkeleton: boolean;
    showEmpty: boolean;
    showRetry: boolean;
  }) => void;
  performance?: { tab: string; context: SocialPerformanceContext };
  pageRef?: React.Ref<SocialFeedPageHandle>;
  onCopyTrade?: unknown;
  filterPost?: (post: SocialV1FeedPost) => boolean;
  comparePosts?: (left: SocialV1FeedPost, right: SocialV1FeedPost) => number;
  requireSocialProfile?: boolean;
  testID?: string;
  scrollTestID?: string;
}

const mockSocialFeed = jest.fn<null, [MockSocialFeedProps]>();
const mockFeedScrollToOffset = jest.fn();
const mockFeedListState = {
  current: { showSkeleton: false, showEmpty: false, showRetry: false },
};
const mockUseFollowedTraders = jest.fn();
const mockInvalidateFollowingFeed = jest.fn(() => Promise.resolve());
const mockUsePopularTraders = jest.fn(
  (): UsePopularTradersResult => ({
    traders: [],
    isLoading: false,
    isFetching: false,
    hasFetched: true,
    error: null,
    refresh: jest.fn(),
    toggleFollow: jest.fn(),
  }),
);

jest.mock('../../../UI/SocialFeed/data/socialFeedQueries', () => ({
  invalidateFollowingFeed: () => mockInvalidateFollowingFeed(),
}));

jest.mock('../../../UI/SocialFeed/components/SocialFeed', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  const MockSocialFeed = (props: MockSocialFeedProps) => {
    mockSocialFeed(props);
    ReactActual.useEffect(() => {
      props.onListStateChange?.(mockFeedListState.current);
    }, [props.onListStateChange]);
    ReactActual.useImperativeHandle(props.pageRef, () => ({
      scrollToOffset: mockFeedScrollToOffset,
    }));
    return ReactActual.createElement(
      View,
      { testID: props.testID },
      props.renderHeader?.(),
      props.emptyState,
    );
  };

  return { __esModule: true, default: MockSocialFeed };
});

const mockTrackInteraction = jest.fn();
const mockUseSocialInteraction = jest.fn(
  (..._args: unknown[]) => mockTrackInteraction,
);
jest.mock('../analytics', () => ({
  ...jest.requireActual('../analytics/socialEvents'),
  useSocialInteraction: (...args: unknown[]) =>
    mockUseSocialInteraction(...args),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../NotificationPreferences/hooks/useFollowedTraders', () => ({
  useFollowedTraders: () => mockUseFollowedTraders(),
}));

jest.mock('../SocialV1View/feed/hooks/usePopularTraders', () => ({
  usePopularTraders: () => mockUsePopularTraders(),
}));

jest.mock('../hooks/useFollowWithNotificationSetup', () => ({
  useFollowWithNotificationSetup: () => ({
    followWithSetup: jest.fn(
      async (_isFollowing: boolean, performFollow: () => Promise<void>) => {
        await performFollow();
      },
    ),
  }),
}));

jest.mock('../../../../util/social/useSocialProfileId', () => ({
  useSocialProfileId: () => ({
    profileId: 'viewer-profile',
    isLoading: false,
  }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const { Filter, Interaction, Screen, Source, Tab } = SocialEvent;

const performanceContext: SocialPerformanceContext = {
  enabled: true,
  hardwareTier: null,
  isActive: true,
  isFocused: true,
  networkTier: null,
};

const lastFeedProps = (): MockSocialFeedProps => {
  const props = mockSocialFeed.mock.lastCall?.[0];
  if (!props) {
    throw new Error('SocialFeed was not rendered');
  }
  return props;
};

const toPost = (
  item: SocialV1FeedItem,
  reactionCount = 0,
): SocialV1FeedPost => ({
  id: item.id,
  authorHandle: item.author.username,
  timestampMs: item.timestamp,
  reactions: reactionCount > 0 ? [{ emotion: '🔥', count: reactionCount }] : [],
  item,
});

const chooseSort = (sort: 'most_recent' | 'popular') => {
  fireEvent.press(screen.getByTestId(FeedSortFilterSelectorsIDs.SELECTOR));
  fireEvent.press(screen.getByTestId(getFeedSortFilterOptionTestId(sort)));
};

describe('FollowingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: false,
      showRetry: false,
    };
    mockUseFollowedTraders.mockReturnValue({
      traders: [{ id: 'followed-1' }],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  it('renders the following_v1 feed in virtualized mode, without realtime', () => {
    const onCopyTrade = jest.fn();

    renderWithProvider(
      <FollowingView
        source={Source.NAV_TAB}
        onCopyTrade={onCopyTrade}
        testID="following-content"
        scrollTestID="following-scroll"
      />,
    );

    expect(lastFeedProps()).toEqual(
      expect.objectContaining({
        ...FOLLOWING_FEED_QUERY,
        scope: 'following_v1',
        location: 'social_following',
        analyticsSource: Source.NAV_TAB,
        scrollMode: 'virtualized',
        showMockedFields: true,
        isActive: true,
        onCopyTrade,
        requireSocialProfile: true,
        testID: 'following-content',
        scrollTestID: 'following-scroll',
      }),
    );
    expect(lastFeedProps().realtime).toBeUndefined();
  });

  it('passes the Following performance context to the feed', () => {
    renderWithProvider(<FollowingView performance={performanceContext} />);

    expect(lastFeedProps().performance).toEqual({
      tab: 'following',
      context: performanceContext,
    });
  });

  it('waits for the tab to be opened before mounting the feed', () => {
    const { rerender } = renderWithProvider(<FollowingView isActive={false} />);
    const mountedWhileClosed = mockSocialFeed.mock.calls.length;

    rerender(<FollowingView isActive />);

    expect(mountedWhileClosed).toBe(0);
    expect(lastFeedProps().isActive).toBe(true);
  });

  it('applies the Custom filters to each post', () => {
    renderWithProvider(
      <FollowingView
        appliedFilters={{ ...DEFAULT_FILTERS, positionStatus: 'closed' }}
      />,
    );

    const filterPost = lastFeedProps().filterPost;

    expect(filterPost?.(toPost(mockOpenPerpsFeedItem()))).toBe(false);
    expect(filterPost?.(toPost(mockClosedSpotFeedItem()))).toBe(true);
  });

  it('keeps the feed order until Popular is chosen', () => {
    renderWithProvider(<FollowingView />);

    expect(lastFeedProps().comparePosts).toBeUndefined();
  });

  it('orders posts by total reactions once Popular is chosen, and tracks it', () => {
    renderWithProvider(<FollowingView source={Source.NAV_TAB} />);
    const quiet = toPost(mockOpenPerpsFeedItem(), 1);
    const popular = toPost(mockClosedSpotFeedItem(), 5);

    chooseSort('popular');
    const ordered = [quiet, popular].sort(lastFeedProps().comparePosts);

    expect(ordered).toEqual([popular, quiet]);
    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(0, false);
    expect(mockTrackInteraction).toHaveBeenCalledWith(
      Interaction.SORT_APPLIED,
      {
        filter_name: Filter.FEED_SORT,
        previous_filter_value: 'most_recent',
        filter_value: 'popular',
      },
    );
  });

  it('does not track choosing the sort already applied', () => {
    renderWithProvider(<FollowingView />);

    chooseSort('most_recent');

    expect(mockTrackInteraction).not.toHaveBeenCalled();
    expect(lastFeedProps().comparePosts).toBeUndefined();
  });

  it('shows the Following empty state when the feed is empty', () => {
    renderWithProvider(<FollowingView />);

    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_FILTER_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  it('shows suggested traders and hides the filter bar when the viewer follows nobody', () => {
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: true,
      showRetry: false,
    };
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    renderWithProvider(<FollowingView />);

    expect(screen.getByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.getByText(
        'social_leaderboard.feed.v1_empty.following_suggestions.title',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR),
    ).toBeNull();
    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  // The feed and follow list are stubbed here. A view test would have to boot
  // the social query client to reach the same hold.
  it('keeps suggested traders on screen after a follow', () => {
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: true,
      showRetry: false,
    };
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { rerender } = renderWithProvider(<FollowingView />);

    mockUseFollowedTraders.mockReturnValue({
      traders: [{ id: 'followed-1' }],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    rerender(<FollowingView />);

    expect(screen.getByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR),
    ).toBeNull();
    expect(mockInvalidateFollowingFeed).not.toHaveBeenCalled();
  });

  it('reloads the following feed when the tab is opened again', async () => {
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: true,
      showRetry: false,
    };
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { rerender } = renderWithProvider(<FollowingView />);
    mockUseFollowedTraders.mockReturnValue({
      traders: [{ id: 'followed-1' }],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });

    rerender(<FollowingView isActive={false} />);
    rerender(<FollowingView isActive />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockInvalidateFollowingFeed).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeNull();
    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('leaves suggestions after a pull to refresh once someone is followed', () => {
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: true,
      showRetry: false,
    };
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    const { rerender } = renderWithProvider(<FollowingView />);
    mockUseFollowedTraders.mockReturnValue({
      traders: [{ id: 'followed-1' }],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    });
    rerender(<FollowingView />);

    act(() => {
      void lastFeedProps().prepareRefresh?.();
      lastFeedProps().onRefresh?.();
    });

    expect(mockInvalidateFollowingFeed).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeNull();
    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('says no one has posted yet when followed traders have no posts', () => {
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: true,
      showRetry: false,
    };

    renderWithProvider(<FollowingView />);

    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'social_leaderboard.feed.v1_empty.following.description',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeNull();
  });

  it('waits to choose an empty state while the follow list loads', () => {
    mockFeedListState.current = {
      showSkeleton: false,
      showEmpty: true,
      showRetry: false,
    };
    mockUseFollowedTraders.mockReturnValue({
      traders: [],
      isLoading: true,
      error: null,
      refresh: jest.fn(),
    });

    renderWithProvider(<FollowingView />);

    expect(
      screen.getByTestId(FOLLOWING_EMPTY_LOADING_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(FOLLOWING_SUGGESTIONS_TEST_ID)).toBeNull();
  });

  it('shows the filter empty state and a selected filter button while filters apply', () => {
    const onClearFilters = jest.fn();
    renderWithProvider(
      <FollowingView isFilterActive onClearFilters={onClearFilters} />,
    );

    const filterButtonState = screen.getByTestId(
      SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON,
    ).props.accessibilityState;

    expect(filterButtonState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(
      screen.getByTestId(SOCIAL_FILTER_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  it('opens Custom filters from the filter bar', () => {
    const onOpenFilters = jest.fn();
    renderWithProvider(<FollowingView onOpenFilters={onOpenFilters} />);

    fireEvent.press(
      screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON),
    );

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it('scrolls to the top when the Custom filters change', () => {
    const { rerender } = renderWithProvider(<FollowingView />);

    rerender(
      <FollowingView
        appliedFilters={{ ...DEFAULT_FILTERS, positionStatus: 'closed' }}
      />,
    );

    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(0, false);
  });

  it('tracks a pull-to-refresh on the Following screen', () => {
    renderWithProvider(<FollowingView source={Source.NAV_TAB} />);

    act(() => {
      lastFeedProps().onRefresh?.();
    });

    expect(mockUseSocialInteraction).toHaveBeenLastCalledWith(
      Screen.FOLLOWING,
      { tab_name: Tab.FOLLOWING, source: Source.NAV_TAB },
      true,
    );
    expect(mockTrackInteraction).toHaveBeenCalledWith(Interaction.REFRESH);
  });

  it('forwards page scrolls from the shell to the feed', () => {
    const pageRef = React.createRef<SocialTabPageHandle>();
    renderWithProvider(<FollowingView pageRef={pageRef} />);

    act(() => {
      pageRef.current?.scrollToOffset(24, true);
    });

    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(24, true);
  });
});

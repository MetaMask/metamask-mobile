import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import {
  addPendingPost,
  resetPendingPosts,
} from '../pendingPosts/pendingPostsStore';
import {
  mockUseSocialV1Feed,
  mockUseSocialV1FeedLoading,
} from '../SocialV1View/feed/mocks/mockComposedFeedHook';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import {
  FeedSortFilterSelectorsIDs,
  getFeedSortFilterOptionTestId,
} from '../components/Filters';
import { SOCIAL_FEED_ERROR_TEST_ID } from '../../../UI/SocialFeed/components/SocialFeedStates.testIds';
import { getSocialFeedPostSkeletonTestId } from '../../../UI/SocialFeed/components/SocialFeedPostSkeleton.testIds';
import { SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID } from '../SocialV1View/feed/components/SocialV1FeedEmptyState.testIds';
import {
  SOCIAL_FILTER_EMPTY_CLEAR_TEST_ID,
  SOCIAL_FILTER_EMPTY_STATE_TEST_ID,
} from '../shared/SocialFilterEmptyState';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import type { SocialV1FeedItem } from '../../../UI/SocialFeed/types';
import EmptyShellTabPage from './EmptyShellTabPage';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../UI/SocialFeed/components/SocialFeedPostShell', () => {
  const { View } = jest.requireActual('react-native');
  const { Pressable } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      post,
      onCopyTrade,
    }: {
      post: { item: SocialV1FeedItem; commentId?: string };
      onCopyTrade?: (item: SocialV1FeedItem, commentId?: string) => void;
    }) => (
      <View>
        <Pressable
          testID={`social-v1-feed-card-${post.item.id}`}
          onPress={() => onCopyTrade?.(post.item, post.commentId)}
        />
      </View>
    ),
  };
});

jest.mock('../SocialV1View/feed/components/PopularTradersCarousel', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'popular-traders-carousel-section',
      }),
  };
});

// See the view suite: the real hook needs keyring state and React Query, and
// this suite is about the shell.
jest.mock('../SocialV1View/feed/hooks/useSocialV1Feed', () => ({
  useSocialV1Feed: jest.fn(
    jest.requireActual('../SocialV1View/feed/mocks/mockComposedFeedHook')
      .mockUseSocialV1Feed,
  ),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

let mockMyProfile: { profileId: string } | null = null;
jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: mockMyProfile }),
}));

describe('EmptyShellTabPage', () => {
  beforeEach(() => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1Feed);
    mockNavigate.mockClear();
    mockMyProfile = null;
    resetPendingPosts();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetPendingPosts();
  });

  it('holds the mock feed back until the tab is opened', () => {
    const { rerender } = renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive={false}
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.queryByTestId(
        `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[0].id}`,
      ),
    ).toBeNull();

    rerender(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(
        `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[0].id}`,
      ),
    ).toBeOnTheScreen();
  });

  it('keeps the mock feed mounted once the tab has been opened', () => {
    const { rerender } = renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    rerender(
      <EmptyShellTabPage
        tab="trending"
        isActive={false}
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(
        `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[0].id}`,
      ),
    ).toBeOnTheScreen();
  });

  it('does not request QuickBuy for an open perps feed item', () => {
    const item = MOCK_SOCIAL_V1_FEED_ITEMS[0];
    const onQuickBuy = jest.fn();

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        onQuickBuy={onQuickBuy}
      />,
    );

    fireEvent.press(screen.getByTestId(`social-v1-feed-card-${item.id}`));

    expect(onQuickBuy).not.toHaveBeenCalled();
  });

  it('requests a QuickBuy target for an open spot feed item', () => {
    const item = MOCK_SOCIAL_V1_FEED_ITEMS[1];
    const onQuickBuy = jest.fn();

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        onQuickBuy={onQuickBuy}
      />,
    );

    fireEvent.press(screen.getByTestId(`social-v1-feed-card-${item.id}`));

    expect(onQuickBuy).toHaveBeenCalledWith(
      {
        tokenAddress: 'pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn',
        tokenSymbol: 'PUMP',
        tokenName: 'PUMP',
        chain: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      },
      expect.anything(),
    );
  });

  it('passes the copied post comment id as the QuickBuy copy-trade origin', () => {
    const item = MOCK_SOCIAL_V1_FEED_ITEMS[1];
    const onQuickBuy = jest.fn();

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        onQuickBuy={onQuickBuy}
      />,
    );

    fireEvent.press(screen.getByTestId(`social-v1-feed-card-${item.id}`));

    expect(onQuickBuy).toHaveBeenCalledWith(expect.any(Object), {
      commentId: `mock-comment-${item.id}`,
    });
  });

  describe('pinned posts', () => {
    const addViewerPost = () =>
      act(() => {
        addPendingPost({
          ownerProfileId: 'viewer-profile',
          post: {
            id: 'pending-comment-1',
            commentId: 'comment-1',
            authorHandle: 'Giga Whale',
            timestampMs: Date.now(),
            reactions: [],
            item: mockOpenPerpsFeedItem({
              id: 'pinned-item',
              comment: 'this is alpha',
            }),
          },
        });
      });

    beforeEach(() => {
      mockMyProfile = { profileId: 'viewer-profile' };
    });

    it('pins the viewer’s new post above the Following feed', () => {
      renderWithProvider(
        <EmptyShellTabPage
          tab="following"
          isActive
          containerTestID="following-page-content"
          scrollTestID="following-page-scroll"
        />,
      );

      addViewerPost();

      expect(
        screen.getAllByTestId(/^social-v1-feed-card-/)[0].props.testID,
      ).toBe('social-v1-feed-card-pinned-item');
    });

    it('keeps the post pinned when Following is sorted by reactions', () => {
      renderWithProvider(
        <EmptyShellTabPage
          tab="following"
          isActive
          containerTestID="following-page-content"
          scrollTestID="following-page-scroll"
        />,
      );
      addViewerPost();

      fireEvent.press(screen.getByTestId(FeedSortFilterSelectorsIDs.SELECTOR));
      fireEvent.press(
        screen.getByTestId(getFeedSortFilterOptionTestId('popular')),
      );

      expect(
        screen.getAllByTestId(/^social-v1-feed-card-/)[0].props.testID,
      ).toBe('social-v1-feed-card-pinned-item');
    });

    it('never shows the viewer’s new post on Trending', () => {
      renderWithProvider(
        <EmptyShellTabPage
          tab="trending"
          isActive
          containerTestID="trending-page-content"
          scrollTestID="trending-page-scroll"
        />,
      );

      addViewerPost();

      expect(
        screen.queryByTestId('social-v1-feed-card-pinned-item'),
      ).toBeNull();
    });

    it('does not pin another profile’s pending post', () => {
      mockMyProfile = { profileId: 'someone-else' };
      renderWithProvider(
        <EmptyShellTabPage
          tab="following"
          isActive
          containerTestID="following-page-content"
          scrollTestID="following-page-scroll"
        />,
      );

      addViewerPost();

      expect(
        screen.queryByTestId('social-v1-feed-card-pinned-item'),
      ).toBeNull();
    });
  });

  it('pads Trending 16px below the tabs', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('trending-page-scroll').props.contentContainerStyle,
      ),
    ).toEqual(expect.objectContaining({ paddingTop: 16 }));
  });

  it('pads the Following filter bar 16px below the tabs and 8px above the feed', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      StyleSheet.flatten(
        screen.getByTestId('following-page-scroll').props.contentContainerStyle,
      ),
    ).toEqual(expect.objectContaining({ paddingTop: 16 }));
    expect(
      StyleSheet.flatten(
        screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BAR).props
          .style,
      ),
    ).toEqual(expect.objectContaining({ paddingBottom: 8 }));
  });

  it('scrolls the Following filter bar with the feed', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    const scroll = within(screen.getByTestId('following-page-scroll'));

    expect(
      scroll.getByTestId(FeedSortFilterSelectorsIDs.SELECTOR),
    ).toBeOnTheScreen();
    expect(
      scroll.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
  });

  it('marks the Following filter button selected when a filter is applied', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        isFilterActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it('omits the Popular traders carousel on Following', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
  });

  it('renders full-width dividers between Following feed entries', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('social-v1-feed-entry-divider-leading-1'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-leading-2'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-leading-3'),
    ).toBeOnTheScreen();
  });

  it('hides perp posts on Following when Custom filters apply tokens', () => {
    const { DEFAULT_FILTERS } = jest.requireActual(
      './filters/filterDefaults',
    ) as typeof import('./filters/filterDefaults');

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
        appliedFilters={{ ...DEFAULT_FILTERS, type: 'tokens' }}
      />,
    );

    expect(
      screen.queryByTestId('social-v1-feed-card-v1-feed-btc-open'),
    ).toBeNull();
    expect(
      screen.getByTestId('social-v1-feed-card-v1-feed-pump-open'),
    ).toBeOnTheScreen();
  });

  it('shows the empty state when the tab feed has no posts', () => {
    jest.mocked(useSocialV1Feed).mockImplementation(() => ({
      posts: [],
      pinnedPosts: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: () => undefined,
      error: null,
      refresh: () => Promise.resolve(),
    }));

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'social_leaderboard.feed.v1_empty.following.description',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
  });

  it('keeps the empty state hidden while the feed is loading', () => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1FeedLoading);

    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  it('shows the feed error instead of the empty state when the first load fails', () => {
    jest.mocked(useSocialV1Feed).mockImplementation(() => ({
      posts: [],
      pinnedPosts: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: () => undefined,
      error: 'Network request failed',
      refresh: () => Promise.resolve(),
    }));

    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
    expect(screen.getByTestId(SOCIAL_FEED_ERROR_TEST_ID)).toBeOnTheScreen();
  });

  it('shows the empty state when Following filters match no posts', () => {
    const { DEFAULT_FILTERS } = jest.requireActual(
      './filters/filterDefaults',
    ) as typeof import('./filters/filterDefaults');

    jest.mocked(useSocialV1Feed).mockImplementation(() => ({
      posts: [
        {
          id: 'perp-only',
          authorHandle: 'ada',
          timestampMs: 1,
          reactions: [],
          item: mockOpenPerpsFeedItem({ id: 'perp-only-item' }),
        },
      ],
      pinnedPosts: [],
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: () => undefined,
      error: null,
      refresh: () => Promise.resolve(),
    }));

    const onClearFilters = jest.fn();
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        isFilterActive
        onClearFilters={onClearFilters}
        appliedFilters={{ ...DEFAULT_FILTERS, type: 'tokens' }}
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(SOCIAL_FILTER_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.filter_empty.title'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.filter_empty.description'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
    expect(
      screen.queryByTestId('social-v1-feed-card-perp-only-item'),
    ).toBeNull();

    fireEvent.press(screen.getByTestId(SOCIAL_FILTER_EMPTY_CLEAR_TEST_ID));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it('hides the empty state when the feed has posts', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  it('shows feed post skeletons and hides Popular traders during initial load', () => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1FeedLoading);

    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
  });

  it('keeps the pinned post above the skeletons while Following first loads', () => {
    jest.mocked(useSocialV1Feed).mockImplementation(() => ({
      ...mockUseSocialV1FeedLoading(),
      pinnedPosts: [
        {
          id: 'pending-comment-1',
          commentId: 'comment-1',
          authorHandle: 'Giga Whale',
          timestampMs: 1,
          reactions: [],
          isPending: true,
          item: mockOpenPerpsFeedItem({ id: 'pinned-item' }),
        },
      ],
    }));

    renderWithProvider(
      <EmptyShellTabPage
        tab="following"
        isActive
        containerTestID="following-page-content"
        scrollTestID="following-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('social-v1-feed-card-pinned-item'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });
});

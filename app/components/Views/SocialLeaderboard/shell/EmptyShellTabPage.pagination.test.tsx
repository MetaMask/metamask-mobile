import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import type { UseSocialV1FeedResult } from '../SocialV1View/feed/types';
import EmptyShellTabPage, {
  SOCIAL_V1_FEED_ERROR_TEST_ID,
  SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID,
  SOCIAL_V1_FEED_RETRY_TEST_ID,
} from './EmptyShellTabPage';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

// A flat mock, unlike the chrome suite's stand-in: these cases are about the
// pagination and error surface, and none of them touch the composer store.
jest.mock('../SocialV1View/feed/hooks/useSocialV1Feed');

jest.mock('../SocialV1View/feed/components', () => ({
  HotTokensCarousel: () => null,
}));

jest.mock('../SocialV1View/feed/components/SocialFeedPostShell', () => ({
  __esModule: true,
  default: () => null,
}));

const mockUseSocialV1Feed = jest.mocked(useSocialV1Feed);

const mockLoadMore = jest.fn();
const mockRefresh = jest.fn();

const arrangeFeed = (overrides: Partial<UseSocialV1FeedResult> = {}) => {
  mockUseSocialV1Feed.mockReturnValue({
    posts: [],
    pendingPost: null,
    pendingStartedAtMs: null,
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: mockLoadMore,
    error: null,
    refresh: mockRefresh,
    ...overrides,
  });
};

const populatedFeed = (overrides: Partial<UseSocialV1FeedResult> = {}) =>
  arrangeFeed({
    posts: [
      {
        id: 'post-1',
        authorHandle: 'aparjey',
        timestampMs: Date.now(),
        likeCount: 0,
        commentCount: 0,
        item: {} as UseSocialV1FeedResult['posts'][number]['item'],
      },
    ],
    ...overrides,
  });

const renderPage = () =>
  renderWithProvider(
    <EmptyShellTabPage
      tab="trending"
      isActive
      containerTestID="trending-page-content"
      scrollTestID="trending-page-scroll"
    />,
  );

/**
 * `RefreshControl` is a prop on the scroll view rather than a queryable node,
 * so the pull gesture is driven through its props.
 */
const refreshControl = () =>
  screen.getByTestId('trending-page-scroll').props.refreshControl;

/** A scroll event that settles `distanceFromEnd` pixels from the bottom. */
const scrollEvent = (distanceFromEnd: number) => ({
  nativeEvent: {
    contentOffset: { y: 2000 - distanceFromEnd, x: 0 },
    contentSize: { height: 2000 + 800, width: 400 },
    layoutMeasurement: { height: 800, width: 400 },
  },
});

describe('EmptyShellTabPage pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeFeed();
  });

  it('requests the next page when a scroll settles near the end', () => {
    arrangeFeed({ hasNextPage: true });

    renderPage();
    fireEvent(
      screen.getByTestId('trending-page-scroll'),
      'momentumScrollEnd',
      scrollEvent(100),
    );

    expect(mockLoadMore).toHaveBeenCalled();
  });

  // A slow drag to the bottom never fires momentum, so the drag-end handler
  // has to paginate too.
  it('requests the next page when a drag ends near the end', () => {
    arrangeFeed({ hasNextPage: true });

    renderPage();
    fireEvent(
      screen.getByTestId('trending-page-scroll'),
      'scrollEndDrag',
      scrollEvent(100),
    );

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('does not request a page while still far from the end', () => {
    arrangeFeed({ hasNextPage: true });

    renderPage();
    fireEvent(
      screen.getByTestId('trending-page-scroll'),
      'momentumScrollEnd',
      scrollEvent(1500),
    );

    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('does not request a page when none remain', () => {
    arrangeFeed({ hasNextPage: false });

    renderPage();
    fireEvent(
      screen.getByTestId('trending-page-scroll'),
      'momentumScrollEnd',
      scrollEvent(100),
    );

    expect(mockLoadMore).not.toHaveBeenCalled();
  });

  it('shows a footer spinner while the next page loads', () => {
    arrangeFeed({ isFetchingNextPage: true });

    renderPage();

    expect(
      screen.getByTestId(SOCIAL_V1_FEED_FOOTER_LOADING_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('offers a retry when the first load fails', () => {
    arrangeFeed({ error: 'Network request failed' });

    renderPage();
    fireEvent.press(screen.getByTestId(SOCIAL_V1_FEED_RETRY_TEST_ID));

    expect(mockRefresh).toHaveBeenCalled();
  });

  describe('recovery after a failed fetch behind a populated list', () => {
    // `useTraderFeed` clears `hasNextPage` on error, so paging cannot rescue
    // this state and the inline retry only renders on an empty feed. Without
    // pull-to-refresh the user is stuck on a partial feed.
    it('keeps the posts rather than replacing them with the error state', () => {
      populatedFeed({ error: 'Network request failed' });

      renderPage();

      expect(screen.queryByTestId(SOCIAL_V1_FEED_ERROR_TEST_ID)).toBeNull();
    });

    it('refetches from pull-to-refresh', async () => {
      mockRefresh.mockResolvedValue(undefined);
      populatedFeed({ error: 'Network request failed', hasNextPage: false });

      renderPage();
      await act(async () => {
        await refreshControl().props.onRefresh();
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('offers pull-to-refresh on a healthy feed too', () => {
      populatedFeed();

      renderPage();

      expect(refreshControl().props.onRefresh).toBeDefined();
    });

    // A rejected refresh must not strand the spinner on screen.
    it('clears the spinner when the refetch rejects', async () => {
      mockRefresh.mockRejectedValue(new Error('offline'));
      populatedFeed({ error: 'Network request failed' });

      renderPage();
      await act(async () => {
        await refreshControl().props.onRefresh();
      });

      await waitFor(() => {
        expect(refreshControl().props.refreshing).toBe(false);
      });
    });
  });
});

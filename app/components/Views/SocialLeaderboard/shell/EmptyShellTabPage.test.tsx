import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { getSocialFeedPositionCardTestId } from '../SocialV1View/feed/components/SocialFeedPositionCard.testIds';
import { SOCIAL_FEED_POSITION_CARD_SKELETON_TEST_ID } from '../SocialV1View/feed/components';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { mockOpenPerpsFeedItem } from '../SocialV1View/feed/mocks/socialV1Feed.mock';
import type {
  SocialV1FeedItem,
  UseSocialV1FeedResult,
} from '../SocialV1View/feed/types';
import EmptyShellTabPage from './EmptyShellTabPage';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../SocialV1View/feed/hooks/useSocialV1Feed');

const mockUseSocialV1Feed = jest.mocked(useSocialV1Feed);

const mockLoadMore = jest.fn();
const mockRefresh = jest.fn();

const FEED_ITEM = mockOpenPerpsFeedItem();

const arrangeFeed = (overrides: Partial<UseSocialV1FeedResult> = {}) => {
  mockUseSocialV1Feed.mockReturnValue({
    items: [FEED_ITEM] as SocialV1FeedItem[],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: mockLoadMore,
    error: null,
    refresh: mockRefresh,
    ...overrides,
  });
};

const renderPage = (
  props: Partial<React.ComponentProps<typeof EmptyShellTabPage>> = {},
) =>
  renderWithProvider(
    <EmptyShellTabPage
      tab="trending"
      isActive
      containerTestID="trending-page-content"
      scrollTestID="trending-page-scroll"
      {...props}
    />,
  );

describe('EmptyShellTabPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    arrangeFeed();
  });

  describe('audience', () => {
    it('reads the leaderboard scope on the trending tab', () => {
      renderPage({ tab: 'trending' });

      expect(mockUseSocialV1Feed).toHaveBeenCalledWith({
        audience: 'all',
        enabled: true,
      });
    });

    // The two tabs share this component, so a wrong mapping here would show
    // one tab's feed under both.
    it('reads the following scope on the following tab', () => {
      renderPage({ tab: 'following' });

      expect(mockUseSocialV1Feed).toHaveBeenCalledWith({
        audience: 'following',
        enabled: true,
      });
    });
  });

  describe('activation', () => {
    it('gates the query until the tab is first opened', () => {
      renderPage({ isActive: false });

      expect(mockUseSocialV1Feed).toHaveBeenCalledWith({
        audience: 'all',
        enabled: false,
      });
    });

    it('keeps the feed mounted once the tab has been opened', () => {
      const { rerender } = renderPage({ isActive: true });

      rerender(
        <EmptyShellTabPage
          tab="trending"
          isActive={false}
          containerTestID="trending-page-content"
          scrollTestID="trending-page-scroll"
        />,
      );

      expect(
        screen.getByTestId(getSocialFeedPositionCardTestId(FEED_ITEM.id)),
      ).toBeOnTheScreen();
    });
  });

  it('renders a card per feed item', () => {
    renderPage();

    expect(
      screen.getByTestId(getSocialFeedPositionCardTestId(FEED_ITEM.id)),
    ).toBeOnTheScreen();
  });

  // V1 cards are much taller than V0 rows, so the V0 skeleton would make the
  // list visibly reflow on load.
  it('shows V1 card skeletons during the initial load', () => {
    arrangeFeed({ items: [], isLoading: true });

    renderPage();

    expect(
      screen.getAllByTestId(SOCIAL_FEED_POSITION_CARD_SKELETON_TEST_ID).length,
    ).toBeGreaterThan(0);
  });

  it('shows the empty state when the feed loads no activity', () => {
    arrangeFeed({ items: [] });

    renderPage();

    expect(
      screen.getByText('social_leaderboard.feed.empty_all.title'),
    ).toBeOnTheScreen();
  });

  it('retries the fetch from the error state', () => {
    arrangeFeed({ items: [], error: 'Network request failed' });

    renderPage();
    fireEvent.press(screen.getByText('social_leaderboard.feed.error.retry'));

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('names the mock marker once the feed has items', () => {
    renderPage();

    expect(
      screen.getByText(
        'social_leaderboard.feed.position_card.mock_data_footnote',
      ),
    ).toBeOnTheScreen();
  });

  it('requests the next page when the list reaches its end', () => {
    arrangeFeed({ hasNextPage: true });

    renderPage();
    fireEvent(screen.getByTestId('trending-page-scroll'), 'endReached');

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('does not request another page when none remain', () => {
    arrangeFeed({ hasNextPage: false });

    renderPage();
    fireEvent(screen.getByTestId('trending-page-scroll'), 'endReached');

    expect(mockLoadMore).not.toHaveBeenCalled();
  });
});

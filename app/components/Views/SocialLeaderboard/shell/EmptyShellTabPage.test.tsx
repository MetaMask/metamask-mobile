import React from 'react';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import EmptyShellTabPage from './EmptyShellTabPage';
import {
  MOCK_SOCIAL_V1_FEED_ITEMS,
  mockOpenPerpsFeedItem,
} from '../SocialV1View/feed/mocks/socialV1Feed.mock';
import { SocialFeedPostingBannerSelectorsIDs } from '../SocialV1View/feed/components/SocialFeedPostingBanner.testIds';
import {
  COMPOSER_POSTING_DELAY_MS,
  resetSocialV1ComposedFeedStore,
  submitSocialV1ComposedPost,
} from '../SocialV1View/feed/store/socialV1ComposedFeedStore';

jest.mock('../SocialV1View/feed/components/SocialFeedPostShell', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: { item: { id: string } } }) => (
      <View testID={`social-v1-feed-card-${post.item.id}`} />
    ),
  };
});

// See the view suite: the real hook needs keyring state and React Query, and
// this suite is about the shell.
jest.mock('../SocialV1View/feed/hooks/useSocialV1Feed', () => ({
  useSocialV1Feed: jest.requireActual(
    '../SocialV1View/feed/mocks/mockComposedFeedHook',
  ).mockUseSocialV1Feed,
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('EmptyShellTabPage', () => {
  beforeEach(() => {
    resetSocialV1ComposedFeedStore();
  });

  afterEach(() => {
    resetSocialV1ComposedFeedStore();
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

  it('shows the posting banner then prepends the composed post on Trending', () => {
    jest.useFakeTimers();
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    act(() => {
      submitSocialV1ComposedPost({
        id: 'composed-1',
        authorHandle: 'giga-whale',
        timestampMs: Date.now(),
        likeCount: 0,
        commentCount: 0,
        item: mockOpenPerpsFeedItem({
          id: 'composed-item',
          comment: 'this is alpha',
        }),
      });
    });

    expect(
      screen.getByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(COMPOSER_POSTING_DELAY_MS);
    });

    expect(
      screen.queryByTestId(SocialFeedPostingBannerSelectorsIDs.CONTAINER),
    ).toBeNull();
    expect(
      screen.getByTestId('social-v1-feed-card-composed-item'),
    ).toBeOnTheScreen();

    jest.useRealTimers();
  });
});

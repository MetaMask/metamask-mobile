import React from 'react';
import { act, screen, within } from '@testing-library/react-native';
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
import {
  mockUseSocialV1Feed,
  mockUseSocialV1FeedLoading,
} from '../SocialV1View/feed/mocks/mockComposedFeedHook';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { getSocialFeedPostSkeletonTestId } from '../SocialV1View/feed/components/SocialFeedPostSkeleton.testIds';
import { FeedSortFilterSelectorsIDs } from '../components/Filters';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';

jest.mock('../SocialV1View/feed/components/SocialFeedPostShell', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: { item: { id: string } } }) => (
      <View testID={`social-v1-feed-card-${post.item.id}`} />
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

describe('EmptyShellTabPage', () => {
  beforeEach(() => {
    jest.mocked(useSocialV1Feed).mockImplementation(mockUseSocialV1Feed);
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
        reactions: [],
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

  it('inserts the Popular traders carousel after the first three Trending posts', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('popular-traders-carousel-section'),
    ).toBeOnTheScreen();

    const walkTestIds = (node: {
      props?: { testID?: string };
      children?: unknown[];
    }): string[] => {
      const own = node.props?.testID ? [node.props.testID] : [];
      const children = (node.children ?? []).flatMap((child) =>
        typeof child === 'object' && child !== null
          ? walkTestIds(
              child as { props?: { testID?: string }; children?: unknown[] },
            )
          : [],
      );
      return own.concat(children);
    };

    const ids = walkTestIds(
      screen.UNSAFE_root as {
        props?: { testID?: string };
        children?: unknown[];
      },
    );
    const firstThree = MOCK_SOCIAL_V1_FEED_ITEMS.slice(0, 3).map(
      (item) => `social-v1-feed-card-${item.id}`,
    );
    const fourth = `social-v1-feed-card-${MOCK_SOCIAL_V1_FEED_ITEMS[3].id}`;
    const carouselIndex = ids.indexOf('popular-traders-carousel-section');

    firstThree.forEach((id) => {
      expect(ids.indexOf(id)).toBeLessThan(carouselIndex);
    });
    expect(ids.indexOf(fourth)).toBeGreaterThan(carouselIndex);
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
      scroll.getByTestId(SocialV1ViewSelectorsIDs.FOLLOWING_FILTER_BUTTON),
    ).toBeOnTheScreen();
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

  it('frames the Popular traders rail with block dividers on Trending', () => {
    renderWithProvider(
      <EmptyShellTabPage
        tab="trending"
        isActive
        containerTestID="trending-page-content"
        scrollTestID="trending-page-scroll"
      />,
    );

    expect(
      screen.getByTestId('social-v1-feed-entry-divider-block-popular-traders'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-v1-feed-entry-divider-block-trailing'),
    ).toBeOnTheScreen();
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
});

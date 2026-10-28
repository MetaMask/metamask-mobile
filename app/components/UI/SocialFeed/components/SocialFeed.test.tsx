import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useSocialFeed, type SocialFeedState } from '../data/useSocialFeed';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialFeedQuery } from '../data/socialFeedSource';
import type { SocialV1FeedPost } from '../types';
import SocialFeed, { SOCIAL_FEED_NEXT_PAGE_TEST_ID } from './SocialFeed';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import {
  SOCIAL_FEED_EMPTY_TEST_ID,
  SOCIAL_FEED_RETRY_TEST_ID,
} from './SocialFeedStates.testIds';

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(() => true),
  }),
);

jest.mock('../data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(),
}));

jest.mock('./SocialFeedPostShell', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: SocialV1FeedPost }) => (
      <MockView testID={`post-${post.id}`} />
    ),
  };
});

jest.mock('./SocialFeedVirtualized', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => (
      <MockView testID={`virtualized-${testID}`} />
    ),
  };
});

const mockSelectEnabled = jest.mocked(selectSocialLeaderboardEnabled);
const mockUseSocialFeed = jest.mocked(useSocialFeed);

const query: SocialFeedQuery = {
  scope: 'all',
  assetIds: ['eip155:999/perp:BTC'],
};

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
  dataUpdatedAt: undefined,
  ...overrides,
});

const post = (id: string): SocialV1FeedPost => ({
  id,
  authorHandle: 'ada',
  timestampMs: 1,
  reactions: [],
  item: mockOpenPerpsFeedItem({ id }),
});

describe('SocialFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectEnabled.mockReturnValue(true);
    mockUseSocialFeed.mockReturnValue(feedState());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing while the social flag is off and does not fetch', () => {
    mockSelectEnabled.mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );

    expect(toJSON()).toBeNull();
    expect(mockUseSocialFeed).not.toHaveBeenCalled();
  });

  it('loads the given source and renders its posts', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" title="Trades" />,
    );

    expect(mockUseSocialFeed).toHaveBeenCalledWith(query, {
      filterPost: undefined,
    });
    expect(screen.getByText('Trades')).toBeOnTheScreen();
    expect(screen.getByTestId('post-one')).toBeOnTheScreen();
    expect(screen.getByTestId('post-two')).toBeOnTheScreen();
  });

  it('shows the empty state when the feed has no posts', () => {
    renderWithProvider(<SocialFeed {...query} location="token_details" />);

    expect(screen.getByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeOnTheScreen();
  });

  it('shows placeholder posts while the first page loads', () => {
    mockUseSocialFeed.mockReturnValue(feedState({ isLoading: true }));

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );

    expect(
      screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
    ).toBeOnTheScreen();
  });

  it('offers a retry when the feed fails with nothing loaded', () => {
    const refresh = jest.fn(async () => undefined);
    mockUseSocialFeed.mockReturnValue(
      feedState({ error: 'feed down', refresh }),
    );

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );
    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('offers a retry when a later page fails and posts are already showing', () => {
    const refresh = jest.fn(async () => undefined);
    mockUseSocialFeed.mockReturnValue(
      feedState({
        posts: [post('one')],
        error: 'next page down',
        hasNextPage: false,
        refresh,
      }),
    );

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );
    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));

    expect(screen.getByTestId('post-one')).toBeOnTheScreen();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner while the next page loads', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({
        posts: [post('one')],
        isFetchingNextPage: true,
        hasNextPage: true,
      }),
    );

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );

    expect(screen.getByTestId(SOCIAL_FEED_NEXT_PAGE_TEST_ID)).toBeOnTheScreen();
  });

  it('loads the next page when the footer is on screen', () => {
    const loadMore = jest.fn();
    jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((cb) => {
      cb(0, 100, 1, 1);
    });
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one')], hasNextPage: true, loadMore }),
    );

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );

    expect(loadMore).toHaveBeenCalled();
  });

  it('does not load another page when the footer is still below the screen', () => {
    const loadMore = jest.fn();
    jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((cb) => {
      cb(0, 5000, 1, 1);
    });
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one')], hasNextPage: true, loadMore }),
    );

    renderWithProvider(
      <SocialFeed {...query} location="perps_market_details" />,
    );

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('renders the host header below the title', () => {
    renderWithProvider(
      <SocialFeed
        {...query}
        location="perps_market_details"
        title="Trades"
        renderHeader={() => <Text>header</Text>}
      />,
    );

    expect(screen.getByText('header')).toBeOnTheScreen();
    expect(mockUseSocialFeed).toHaveBeenCalledTimes(1);
  });

  it('hands filterPost to the feed', () => {
    const filterPost = jest.fn(() => true);

    renderWithProvider(
      <SocialFeed
        {...query}
        location="perps_market_details"
        filterPost={filterPost}
      />,
    );

    expect(mockUseSocialFeed).toHaveBeenCalledWith(query, { filterPost });
  });

  it('renders the virtualized feed for the virtualized scroll mode', () => {
    renderWithProvider(
      <SocialFeed
        {...query}
        location="social_live"
        scrollMode="virtualized"
        testID="live"
      />,
    );

    expect(screen.getByTestId('virtualized-live')).toBeOnTheScreen();
    expect(mockUseSocialFeed).not.toHaveBeenCalled();
  });
});

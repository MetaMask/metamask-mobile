import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { selectSocialLeaderboardEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';
import { useSocialFeed, type SocialFeedState } from '../data/useSocialFeed';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import SocialFeed from './SocialFeed';
import { SOCIAL_FEED_EMPTY_TEST_ID } from './SocialFeedStates.testIds';

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
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: SocialV1FeedPost }) => (
      <View testID={`post-${post.id}`} />
    ),
  };
});

const mockSelectEnabled = jest.mocked(selectSocialLeaderboardEnabled);
const mockUseSocialFeed = jest.mocked(useSocialFeed);

const source = { kind: 'perp', symbol: 'BTC' } as const;

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

  it('renders nothing while the social flag is off and does not fetch', () => {
    mockSelectEnabled.mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <SocialFeed source={source} location="perps_market_details" />,
    );

    expect(toJSON()).toBeNull();
    expect(mockUseSocialFeed).toHaveBeenCalledWith(null);
  });

  it('loads the given source and renders its posts', () => {
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderWithProvider(
      <SocialFeed
        source={source}
        location="perps_market_details"
        title="Trades"
      />,
    );

    expect(mockUseSocialFeed).toHaveBeenCalledWith(source);
    expect(screen.getByText('Trades')).toBeOnTheScreen();
    expect(screen.getByTestId('post-one')).toBeOnTheScreen();
    expect(screen.getByTestId('post-two')).toBeOnTheScreen();
  });

  it('shows the empty state when the feed has no posts', () => {
    renderWithProvider(<SocialFeed source={source} location="token_details" />);

    expect(screen.getByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeOnTheScreen();
  });
});

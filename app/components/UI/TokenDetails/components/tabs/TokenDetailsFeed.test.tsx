import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import {
  useSocialFeed,
  type SocialFeedState,
} from '../../../SocialFeed/data/useSocialFeed';
import { mockOpenPerpsFeedItem } from '../../../SocialFeed/mocks/socialV1Feed.mock';
import { SOCIAL_FEED_EMPTY_TEST_ID } from '../../../SocialFeed/components/SocialFeedStates.testIds';
import type { SocialV1FeedPost } from '../../../SocialFeed/types';
import { TokenDetailsFeed } from './TokenDetailsFeed';

let mockHiddenPostIds = new Set<string>();
const mockOptionsProvider = jest.fn();

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(() => true),
  }),
);

jest.mock('../../../SocialFeed/data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(),
}));

jest.mock(
  '../../../SocialFeed/components/SocialEntryOptionsBottomSheet',
  () => ({
    SocialEntryOptionsProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => {
      mockOptionsProvider();
      return children;
    },
    useSocialEntryModeration: () => ({
      isEntryHidden: ({ postId }: { postId: string }) =>
        mockHiddenPostIds.has(postId),
    }),
  }),
);

const mockShellProps = jest.fn();
jest.mock('../../../SocialFeed/components/SocialFeedPostShell', () => {
  const { View: ShellView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { post: SocialV1FeedPost }) => {
      mockShellProps(props);
      return <ShellView testID={`post-${props.post.id}`} />;
    },
  };
});

const mockSelectEnabled = jest.mocked(selectSocialLeaderboardEnabled);
const mockUseSocialFeed = jest.mocked(useSocialFeed);

const source = {
  kind: 'token',
  assetId: 'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933',
} as const;

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

describe('TokenDetailsFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHiddenPostIds = new Set();
    mockSelectEnabled.mockReturnValue(true);
    mockUseSocialFeed.mockReturnValue(feedState());
  });

  it('hosts the post options so hiding a post confirms with a toast', () => {
    renderWithProvider(
      <TokenDetailsFeed source={source} location="token_details" />,
    );

    expect(mockOptionsProvider).toHaveBeenCalled();
  });

  it('passes the copy-trade handler to every post', () => {
    const onCopyTrade = jest.fn();
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderWithProvider(
      <TokenDetailsFeed
        source={source}
        location="token_details"
        onCopyTrade={onCopyTrade}
      />,
    );

    expect(mockShellProps).toHaveBeenCalledTimes(2);
    mockShellProps.mock.calls.forEach(([props]) => {
      expect(props.onCopyTrade).toBe(onCopyTrade);
    });
  });

  it('drops a hidden post from the list instead of leaving a gap', () => {
    mockHiddenPostIds = new Set(['one']);
    mockUseSocialFeed.mockReturnValue(
      feedState({ posts: [post('one'), post('two')] }),
    );

    renderWithProvider(
      <TokenDetailsFeed source={source} location="token_details" />,
    );

    expect(screen.queryByTestId('post-one')).toBeNull();
    expect(screen.getByTestId('post-two')).toBeOnTheScreen();
    expect(mockShellProps).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state once every post is hidden', () => {
    mockHiddenPostIds = new Set(['one']);
    mockUseSocialFeed.mockReturnValue(feedState({ posts: [post('one')] }));

    renderWithProvider(
      <TokenDetailsFeed source={source} location="token_details" />,
    );

    expect(screen.getByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeOnTheScreen();
  });
});

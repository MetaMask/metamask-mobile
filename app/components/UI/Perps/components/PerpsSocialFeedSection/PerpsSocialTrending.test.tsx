import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import {
  useSocialFeed,
  type SocialFeedState,
  type SocialV1FeedPost,
} from '../../../SocialFeed';
import {
  SOCIAL_FEED_EMPTY_TEST_ID,
  SOCIAL_FEED_ERROR_TEST_ID,
  SOCIAL_FEED_RETRY_TEST_ID,
} from '../../../SocialFeed/components/SocialFeedStates.testIds';
import PerpsSocialTrending from './PerpsSocialTrending';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../SocialFeed', () => {
  const ReactModule = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');
  return {
    ...jest.requireActual('../../../SocialFeed'),
    useSocialFeed: jest.fn(),
    SocialFeedPostShell: ({
      post,
      onAuthorPress,
      onPositionPress,
    }: {
      post: { id: string };
      onAuthorPress?: (post: unknown) => void;
      onPositionPress?: (post: unknown) => void;
    }) =>
      ReactModule.createElement(
        View,
        { testID: `mock-post-${post.id}` },
        ReactModule.createElement(Pressable, {
          testID: `mock-author-${post.id}`,
          onPress: () => onAuthorPress?.(post),
        }),
        onPositionPress
          ? ReactModule.createElement(Pressable, {
              testID: `mock-position-${post.id}`,
              onPress: () => onPositionPress(post),
            })
          : null,
      ),
  };
});

const mockUseSocialFeed = jest.mocked(useSocialFeed);
const mockRefresh = jest.fn();

const buildPost = (id: string, withPosition = false) =>
  ({
    id,
    authorHandle: `${id}.eth`,
    authorImageUrl: null,
    item: {
      variant: 'perpsOpen',
      comment: 'Long BTC',
      author: {
        id: `profile-${id}`,
        address: `0x${id}`,
        avatarUri: `https://example.com/${id}.png`,
      },
    },
    ...(withPosition ? { position: { positionId: `position-${id}` } } : {}),
  }) as unknown as SocialV1FeedPost;

const mockFeedResult = (overrides: Partial<SocialFeedState> = {}) => {
  mockUseSocialFeed.mockReturnValue({
    posts: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: mockRefresh,
    ...overrides,
  } as SocialFeedState);
};

describe('PerpsSocialTrending', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedResult();
  });

  it('requests a 3-post page of the perps-only global feed', () => {
    renderWithProvider(<PerpsSocialTrending />);

    expect(mockUseSocialFeed).toHaveBeenCalledWith(
      { kind: 'all', audience: 'all', assetClass: 'perps' },
      { pageSize: 3 },
    );
  });

  it('renders at most 3 posts', () => {
    mockFeedResult({
      posts: ['a', 'b', 'c', 'd'].map((id) => buildPost(id)),
    });

    renderWithProvider(<PerpsSocialTrending />);

    ['a', 'b', 'c'].forEach((id) => {
      expect(screen.getByTestId(`mock-post-${id}`)).toBeOnTheScreen();
    });
    expect(screen.queryByTestId('mock-post-d')).toBeNull();
  });

  it('renders the error state and retries on press', () => {
    mockFeedResult({ error: 'Feed unavailable' });

    renderWithProvider(<PerpsSocialTrending />);

    expect(screen.getByTestId(SOCIAL_FEED_ERROR_TEST_ID)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(SOCIAL_FEED_RETRY_TEST_ID));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders the empty state when there are no posts', () => {
    renderWithProvider(<PerpsSocialTrending />);

    expect(screen.getByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeOnTheScreen();
  });

  it('renders no posts while loading', () => {
    mockFeedResult({ isLoading: true });

    renderWithProvider(<PerpsSocialTrending />);

    expect(screen.queryByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeNull();
    expect(screen.queryByTestId(SOCIAL_FEED_ERROR_TEST_ID)).toBeNull();
  });

  it('opens the Social V1 profile when a post author is pressed', () => {
    mockFeedResult({ posts: [buildPost('a')] });

    renderWithProvider(<PerpsSocialTrending />);
    fireEvent.press(screen.getByTestId('mock-author-a'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: 'profile-a',
        traderName: 'a.eth',
        traderAddress: '0xa',
        traderAvatarUri: 'https://example.com/a.png',
        source: 'perps_home',
      },
      {},
    );
  });

  it('opens the position sheet when a post with a position is pressed', () => {
    const post = buildPost('a', true);
    mockFeedResult({ posts: [post] });

    renderWithProvider(<PerpsSocialTrending />);
    fireEvent.press(screen.getByTestId('mock-position-a'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.POSITION_SHEET, {
      positionId: 'position-a',
      position: post.position,
      author: post.item.author,
      comment: 'Long BTC',
      isClosed: false,
    });
  });

  it('does not make the trade card pressable when the post has no position', () => {
    mockFeedResult({ posts: [buildPost('a')] });

    renderWithProvider(<PerpsSocialTrending />);

    expect(screen.queryByTestId('mock-position-a')).toBeNull();
  });
});

import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { useSocialV1Feed } from '../SocialV1View/feed/hooks/useSocialV1Feed';
import { wrapMockFeedPosts } from '../../../UI/SocialFeed/mocks/wrapMockFeedPosts';
import { SocialFeedPostShellSelectorsIDs } from '../../../UI/SocialFeed/components/SocialFeedPostShell.testIds';
import EmptyShellTabPage from './EmptyShellTabPage';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../SocialV1View/feed/hooks/useSocialV1Feed');

jest.mock('../../../UI/SocialFeed/data/useSocialFeed', () => ({
  useSocialFeed: jest.fn(() => ({
    posts: [],
    rows: [],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    loadMore: jest.fn(),
    error: null,
    refresh: jest.fn(async () => undefined),
    dataUpdatedAt: undefined,
  })),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: null }),
}));

jest.mock('../SocialV1View/feed/components', () => ({
  HotTokensCarousel: () => null,
}));

jest.mock('../SocialV1View/feed/components/PopularTradersCarousel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../UI/SocialFeed/components/TraderAvatar', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
  };
});

jest.mock('../../../UI/SocialFeed/components/SocialFeedPositionCard', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ item }: { item: { id: string } }) => (
      <View testID={`social-feed-position-card-${item.id}`} />
    ),
    PositionCardBody: ({ item }: { item: { id: string } }) => (
      <View testID={`social-feed-position-card-${item.id}`} />
    ),
  };
});

const mockUseSocialV1Feed = jest.mocked(useSocialV1Feed);

describe('EmptyShellTabPage profile navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const [firstPost] = wrapMockFeedPosts();
    mockUseSocialV1Feed.mockReturnValue({
      posts: firstPost ? [firstPost] : [],
      pendingPost: null,
      pendingStartedAtMs: null,
      isLoading: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      loadMore: () => undefined,
      error: null,
      refresh: () => Promise.resolve(),
    });
  });

  it('opens the V1 profile from a feed post identity tap', () => {
    const [firstPost] = wrapMockFeedPosts();
    if (!firstPost) {
      throw new Error('expected mock feed post');
    }

    renderWithProvider(
      <QueryClientProvider client={new QueryClient()}>
        <EmptyShellTabPage
          tab="trending"
          isActive
          containerTestID="trending-page-content"
          scrollTestID="trending-page-scroll"
        />
      </QueryClientProvider>,
    );

    fireEvent.press(
      screen.getByTestId(
        `${SocialFeedPostShellSelectorsIDs.IDENTITY_PRESS}-${firstPost.id}`,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.V1_PROFILE,
      {
        traderId: firstPost.item.author.id,
        traderName: firstPost.authorHandle,
        traderAddress: firstPost.item.author.address,
        source: 'trader_feed',
      },
      {},
    );
  });
});

import React from 'react';
import { act } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { SocialFeedPostShellProps } from '../../../SocialFeed/components/SocialFeedPostShell';
import { mockOpenPerpsFeedItem } from '../../../SocialFeed/mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../../../SocialFeed/types';
import {
  SocialEventValues,
  type SocialUIInteractionProperties,
} from '../../../../Views/SocialLeaderboard/analytics';
import PerpsSocialTrending from './PerpsSocialTrending';

const mockTrackInteraction = jest.fn<void, [SocialUIInteractionProperties]>();
let mockShellProps: SocialFeedPostShellProps | undefined;

const mockPost: SocialV1FeedPost = {
  id: 'post-1',
  authorHandle: 'giga-whale',
  authorImageUrl: null,
  timestampMs: 1,
  commentId: 'comment-1',
  reactions: [],
  item: mockOpenPerpsFeedItem({ id: 'item-1' }),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../../../../Views/SocialLeaderboard/MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: undefined }),
}));

jest.mock('../../../../Views/SocialLeaderboard/analytics', () => ({
  ...jest.requireActual('../../../../Views/SocialLeaderboard/analytics'),
  useSocialV1Analytics: () => ({
    trackInteraction: mockTrackInteraction,
  }),
}));

jest.mock('../../../SocialFeed', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    SocialFeedEmpty: () => null,
    SocialFeedError: () => null,
    SocialFeedPostShell: (props: SocialFeedPostShellProps) => {
      mockShellProps = props;
      return <View testID="social-post-shell" />;
    },
    SocialFeedSkeleton: () => null,
    SocialV1FeedPostList: ({
      posts,
      renderPost,
    }: {
      posts: SocialV1FeedPost[];
      renderPost: (item: SocialV1FeedPost) => React.ReactNode;
    }) => (
      <>
        {posts.map((item) => (
          <ReactActual.Fragment key={item.id}>
            {renderPost(item)}
          </ReactActual.Fragment>
        ))}
      </>
    ),
    useSocialFeed: () => ({
      posts: [mockPost],
      isLoading: false,
      error: null,
      refresh: jest.fn(),
    }),
  };
});

describe('PerpsSocialTrending analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShellProps = undefined;
  });

  it('attributes shared feed interactions to the Perps asset screen', () => {
    renderWithProvider(
      <PerpsSocialTrending
        symbol="ETH"
        source={SocialEventValues.SOURCE.PERP_ASSET_SCREEN}
      />,
    );

    act(() => {
      mockShellProps?.onReactionInteraction?.('added', '🔥');
      mockShellProps?.onReactionPickerOpened?.();
      mockShellProps?.onCopyTradeInteraction?.('perps');
    });

    expect(mockTrackInteraction).toHaveBeenNthCalledWith(1, {
      interaction_type: SocialEventValues.INTERACTION_TYPE.REACTION_ADDED,
      screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
      source: SocialEventValues.SOURCE.PERP_ASSET_SCREEN,
      reaction_type: SocialEventValues.REACTION_TYPE.FIRE,
    });
    expect(mockTrackInteraction).toHaveBeenNthCalledWith(2, {
      interaction_type:
        SocialEventValues.INTERACTION_TYPE.REACTION_PICKER_OPENED,
      screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
      source: SocialEventValues.SOURCE.PERP_ASSET_SCREEN,
    });
    expect(mockTrackInteraction).toHaveBeenNthCalledWith(3, {
      interaction_type: SocialEventValues.INTERACTION_TYPE.COPY_TRADE_TAPPED,
      screen_name: SocialEventValues.SCREEN_NAME.TRENDING,
      source: SocialEventValues.SOURCE.PERP_ASSET_SCREEN,
      trade_type: SocialEventValues.TRADE_TYPE.PERPS,
    });
  });
});

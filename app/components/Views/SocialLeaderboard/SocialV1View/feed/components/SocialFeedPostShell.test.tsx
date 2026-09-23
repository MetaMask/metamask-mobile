import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import SocialFeedPostShell from './SocialFeedPostShell';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';

// The real avatar falls back to a Maskicon, which loads its SVG asynchronously
// and reports un-acted state updates. Capture the props the shell passes in.
jest.mock(
  '../../../../Homepage/Sections/TopTraders/components/TraderAvatar',
  () => {
    const { View: MockView } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        testID,
        imageUrl,
        address,
      }: {
        testID?: string;
        imageUrl?: string | null;
        address?: string;
      }) => <MockView testID={testID} imageUrl={imageUrl} address={address} />,
    };
  },
);

jest.mock('./SocialFeedPositionCard', () => {
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

jest.mock('../../../utils/formatters', () => ({
  formatFeedTimestamp: () => 'Just now',
}));

const basePost = (
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost => ({
  id: 'post-1',
  authorHandle: 'giga-whale',
  authorImageUrl: null,
  winRateLabel: '78% WR',
  timestampMs: Date.now(),
  commentId: 'comment-1',
  reactions: [{ emotion: '🔥', count: 12 }],
  item: mockOpenPerpsFeedItem({ id: 'item-1', comment: 'Amazing position' }),
  ...overrides,
});

describe('SocialFeedPostShell', () => {
  it('renders the author, win rate, comment, position card, and engagement row', () => {
    renderWithProvider(<SocialFeedPostShell post={basePost()} />);

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.CONTAINER}-post-1`),
    ).toBeOnTheScreen();
    expect(screen.getByText('giga-whale')).toBeOnTheScreen();
    expect(screen.getByText('78% WR')).toBeOnTheScreen();
    expect(screen.getByText('Amazing position')).toBeOnTheScreen();
    expect(screen.getByText('Just now')).toBeOnTheScreen();
    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.CHIP}-post-1-🔥`),
    ).toBeOnTheScreen();
    expect(screen.getByText('🔥')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-feed-position-card-item-1'),
    ).toBeOnTheScreen();
  });

  it('omits optional chrome when win rate, comment, or gif are absent', () => {
    renderWithProvider(
      <SocialFeedPostShell
        post={basePost({
          winRateLabel: undefined,
          gifUri: undefined,
          item: mockOpenPerpsFeedItem({ id: 'item-2', comment: '' }),
        })}
      />,
    );

    expect(screen.queryByText('78% WR')).toBeNull();
    expect(screen.queryByText('Amazing position')).toBeNull();
    expect(
      screen.queryByTestId(`${SocialFeedPostShellSelectorsIDs.GIF}-post-1`),
    ).toBeNull();
  });

  it('renders an attached gif preview', () => {
    renderWithProvider(
      <SocialFeedPostShell
        post={basePost({ gifUri: 'https://media.test/cat.gif' })}
      />,
    );

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.GIF}-post-1`),
    ).toBeOnTheScreen();
  });

  it('shows an empty heart and no zero when the Call has no reactions', () => {
    renderWithProvider(
      <SocialFeedPostShell post={basePost({ reactions: [] })} />,
    );

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`${SocialFeedPostShellSelectorsIDs.TOTAL}-post-1`),
    ).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows an empty heart when the post has no Call id', () => {
    renderWithProvider(
      <SocialFeedPostShell
        post={basePost({ commentId: undefined, reactions: [] })}
      />,
    );

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`${SocialFeedPostShellSelectorsIDs.TOTAL}-post-1`),
    ).toBeNull();
  });

  it('passes the profile id to the avatar when the author has no image', () => {
    const seeded = mockOpenPerpsFeedItem({
      id: 'item-1',
      comment: 'Amazing position',
    });
    const item = {
      ...seeded,
      author: { ...seeded.author, id: 'profile-alice' },
    };

    renderWithProvider(
      <SocialFeedPostShell post={basePost({ authorImageUrl: null, item })} />,
    );

    const avatar = screen.getByTestId(
      `${SocialFeedPostShellSelectorsIDs.AVATAR}-post-1`,
    );
    expect(avatar.props.address).toBe('profile-alice');
    expect(avatar.props.imageUrl).toBeNull();
  });

  it('passes a real author image url through to the avatar', () => {
    renderWithProvider(
      <SocialFeedPostShell
        post={basePost({
          authorImageUrl: 'https://cdn.test/alice.png',
        })}
      />,
    );

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.AVATAR}-post-1`)
        .props.imageUrl,
    ).toBe('https://cdn.test/alice.png');
  });
});

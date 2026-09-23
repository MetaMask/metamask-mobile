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

const basePost = (
  overrides: Partial<SocialV1FeedPost> = {},
): SocialV1FeedPost => ({
  id: 'post-1',
  authorHandle: 'giga-whale',
  authorImageUrl: null,
  timestampMs: Date.now(),
  likeCount: 12,
  commentCount: 3,
  item: mockOpenPerpsFeedItem({ id: 'item-1', comment: 'Amazing position' }),
  ...overrides,
});

/** An item whose author reports nothing the stat line could show. */
const itemWithoutStats = (id: string, comment: string) => {
  const item = mockOpenPerpsFeedItem({ id, comment });
  return {
    ...item,
    author: {
      ...item.author,
      winRatePercent: null,
      pnl30d: null,
      followerCount: null,
    },
  };
};

describe('SocialFeedPostShell', () => {
  it('renders the author, comment, position card, and engagement row', () => {
    renderWithProvider(<SocialFeedPostShell post={basePost()} />);

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.CONTAINER}-post-1`),
    ).toBeOnTheScreen();
    expect(screen.getByText('giga-whale')).toBeOnTheScreen();
    expect(screen.getByText('Amazing position')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(
      screen.getByTestId('social-feed-position-card-item-1'),
    ).toBeOnTheScreen();
  });

  it('leads the stat line with the trader 30-day P&L', () => {
    renderWithProvider(<SocialFeedPostShell post={basePost()} />);

    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.TRADER_STAT),
    ).toHaveTextContent('$50K P&L (30d)');
  });

  // Nothing reports verification yet, so the badge has to read as invented.
  it('marks the mocked verified badge', () => {
    renderWithProvider(<SocialFeedPostShell post={basePost()} />);

    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.VERIFIED_BADGE),
    ).toBeOnTheScreen();
    expect(screen.getByText('*')).toBeOnTheScreen();
  });

  it('badges the trader cohort from their 30-day P&L', () => {
    renderWithProvider(<SocialFeedPostShell post={basePost()} />);

    // $50K sits in the dolphin band.
    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.COHORT),
    ).toHaveTextContent('🐬');
  });

  it('omits the stat line and cohort for a trader with no stats', () => {
    renderWithProvider(
      <SocialFeedPostShell
        post={basePost({ item: itemWithoutStats('item-3', 'No stats') })}
      />,
    );

    expect(
      screen.queryByTestId(SocialFeedPostShellSelectorsIDs.TRADER_STAT),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialFeedPostShellSelectorsIDs.COHORT),
    ).toBeNull();
  });

  it('omits optional chrome when comment or gif are absent', () => {
    renderWithProvider(
      <SocialFeedPostShell
        post={basePost({
          gifUri: undefined,
          item: mockOpenPerpsFeedItem({ id: 'item-2', comment: '' }),
        })}
      />,
    );

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

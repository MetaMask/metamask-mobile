import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import SocialFeedPostShell from './SocialFeedPostShell';
import { SocialFeedPostShellSelectorsIDs } from './SocialFeedPostShell.testIds';
import { ReactionPickerBalloonSelectorsIDs } from './ReactionPickerBalloon.testIds';

jest.mock('../commentReactionApi', () => ({
  reactToComment: jest.fn().mockResolvedValue({
    reactions: [{ emotion: '🔥', count: 1 }],
    userReaction: '🔥',
  }),
  removeCommentReaction: jest.fn(),
}));

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
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ item }: { item: { id: string } }) => (
      <MockView testID={`social-feed-position-card-${item.id}`} />
    ),
    PositionCardBody: ({ item }: { item: { id: string } }) => (
      <MockView testID={`social-feed-position-card-${item.id}`} />
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
  commentId: 'comment-1',
  reactions: [{ emotion: '🔥', count: 12 }],
  item: mockOpenPerpsFeedItem({ id: 'item-1', comment: 'Amazing position' }),
  ...overrides,
});

const renderShell = (post: SocialV1FeedPost) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderWithProvider(
    <QueryClientProvider client={queryClient}>
      <SocialFeedPostShell post={post} />
    </QueryClientProvider>,
  );
};

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
  beforeEach(() => {
    jest.spyOn(View.prototype, 'measureInWindow').mockImplementation((cb) => {
      cb(20, 100, 40, 24);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the balloon and adds a reaction chip when an emoji is picked', async () => {
    renderShell(basePost({ reactions: [] }));

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    );

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(`${ReactionPickerBalloonSelectorsIDs.EMOJI}-🔥`),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.CHIP}-post-1-🔥`),
      ).toBeOnTheScreen();
    });
  });

  it('closes the balloon when the scrim is pressed', () => {
    renderShell(basePost({ reactions: [] }));

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    );
    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.SCRIM),
    );

    expect(
      screen.queryByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toBeNull();
  });

  it('renders the author, comment, position card, and engagement row', () => {
    renderShell(basePost());

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.CONTAINER}-post-1`),
    ).toBeOnTheScreen();
    expect(screen.getByText('giga-whale')).toBeOnTheScreen();
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

  it('leads the stat line with the trader 30-day P&L', () => {
    renderShell(basePost());

    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.TRADER_STAT),
    ).toHaveTextContent('$50K P&L (30d)');
  });

  // Nothing reports verification yet, so the badge has to read as invented.
  it('marks the mocked verified badge', () => {
    renderShell(basePost());

    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.VERIFIED_BADGE),
    ).toBeOnTheScreen();
    expect(screen.getByText('*')).toBeOnTheScreen();
  });

  it('badges the trader cohort from their 30-day P&L', () => {
    renderShell(basePost());

    // $50K sits in the dolphin band.
    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.COHORT),
    ).toHaveTextContent('🐬');
  });

  it('places the post age next to the cohort on the author row', () => {
    renderShell(basePost({ timestampMs: Date.now() - 7 * 60 * 1000 }));

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TIMESTAMP}-post-1`),
    ).toHaveTextContent('7 min ago');
  });

  it('omits the stat line and cohort for a trader with no stats', () => {
    renderShell(basePost({ item: itemWithoutStats('item-3', 'No stats') }));

    expect(
      screen.queryByTestId(SocialFeedPostShellSelectorsIDs.TRADER_STAT),
    ).toBeNull();
    expect(
      screen.queryByTestId(SocialFeedPostShellSelectorsIDs.COHORT),
    ).toBeNull();
  });

  it('omits optional chrome when comment or gif are absent', () => {
    renderShell(
      basePost({
        gifUri: undefined,
        item: mockOpenPerpsFeedItem({ id: 'item-2', comment: '' }),
      }),
    );

    expect(screen.queryByText('Amazing position')).toBeNull();
    expect(
      screen.queryByTestId(`${SocialFeedPostShellSelectorsIDs.GIF}-post-1`),
    ).toBeNull();
  });

  it('renders an attached gif preview', () => {
    renderShell(basePost({ gifUri: 'https://media.test/cat.gif' }));

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.GIF}-post-1`),
    ).toBeOnTheScreen();
  });

  it('shows an empty heart and no zero when the Call has no reactions', () => {
    renderShell(basePost({ reactions: [] }));

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(`${SocialFeedPostShellSelectorsIDs.TOTAL}-post-1`),
    ).toBeNull();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows an empty heart when the post has no Call id', () => {
    renderShell(basePost({ commentId: undefined, reactions: [] }));

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

    renderShell(basePost({ authorImageUrl: null, item }));

    const avatar = screen.getByTestId(
      `${SocialFeedPostShellSelectorsIDs.AVATAR}-post-1`,
    );
    expect(avatar.props.address).toBe('profile-alice');
    expect(avatar.props.imageUrl).toBeNull();
  });

  it('passes a real author image url through to the avatar', () => {
    renderShell(
      basePost({
        authorImageUrl: 'https://cdn.test/alice.png',
      }),
    );

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.AVATAR}-post-1`)
        .props.imageUrl,
    ).toBe('https://cdn.test/alice.png');
  });

  it('opens the options sheet from the more button and closes after Report', () => {
    renderShell(basePost());

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.MORE}-post-1`),
    );

    expect(
      screen.getByTestId('social-entry-options-bottom-sheet'),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('social-entry-options-report'));

    expect(
      screen.queryByTestId('social-entry-options-bottom-sheet'),
    ).toBeNull();
  });
});

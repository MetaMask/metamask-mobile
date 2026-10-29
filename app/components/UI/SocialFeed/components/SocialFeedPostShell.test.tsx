import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { View } from 'react-native';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID } from '../hooks/useCopyTradeToPerps';
import { reactToComment, removeCommentReaction } from '../commentReactionApi';
import {
  mockClosedPerpsFeedItem,
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import { SocialFeedSurfaceProvider } from '../SocialFeedSurface';
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

const mockEnsureSocialProfileOnboarding = jest.fn(() => true);

jest.mock(
  '../../../Views/SocialLeaderboard/hooks/useRequireSocialProfileOnboarding',
  () => ({
    useRequireSocialProfileOnboarding: () => ({
      ensureSocialProfileOnboarding: mockEnsureSocialProfileOnboarding,
    }),
  }),
);

// The real avatar falls back to a Maskicon, which loads its SVG asynchronously
// and reports un-acted state updates. Capture the props the shell passes in.
jest.mock('./TraderAvatar', () => {
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
});

const mockNavigate = jest.fn();
const mockGate = jest.fn((action: () => Promise<void> | void) =>
  Promise.resolve(action()),
);
const mockSelectPerpsEligibility = jest.fn(() => true);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../Compliance', () => ({
  useComplianceGate: () => ({ gate: mockGate }),
}));

jest.mock('../../Perps/selectors/perpsController', () => ({
  selectPerpsEligibility: () => mockSelectPerpsEligibility(),
}));

jest.mock('../../Perps/components/PerpsBottomSheetTooltip', () => {
  const { View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <MockView testID={testID} />,
  };
});

jest.mock('./SocialFeedPositionCard', () => {
  const { Pressable, View: MockView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ item }: { item: { id: string } }) => (
      <MockView testID={`social-feed-position-card-${item.id}`} />
    ),
    // Exposes the copy-trade handler the shell passes so the gate can be
    // exercised without rendering the real card.
    PositionCardBody: ({
      item,
      onCopyTrade,
    }: {
      item: { id: string };
      onCopyTrade?: () => void;
    }) => (
      <MockView testID={`social-feed-position-card-${item.id}`}>
        {onCopyTrade ? (
          <Pressable
            testID={`social-feed-position-card-copy-trade-${item.id}`}
            onPress={onCopyTrade}
          />
        ) : null}
      </MockView>
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

const renderShell = (
  post: SocialV1FeedPost,
  options?: {
    onAuthorPress?: (post: SocialV1FeedPost) => void;
    onCopyTrade?: (item: SocialV1FeedPost['item'], commentId?: string) => void;
    onPositionPress?: (post: SocialV1FeedPost) => void;
    /** `null` renders with no surface provider, so invented values stay hidden. */
    showMockedFields?: boolean | null;
  },
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const showMockedFields =
    options && 'showMockedFields' in options ? options.showMockedFields : true;
  const shell = (
    <SocialFeedPostShell
      post={post}
      onAuthorPress={options?.onAuthorPress}
      onPositionPress={options?.onPositionPress}
      onCopyTrade={options?.onCopyTrade}
    />
  );
  return renderWithProvider(
    <QueryClientProvider client={queryClient}>
      {showMockedFields === null ? (
        shell
      ) : (
        <SocialFeedSurfaceProvider showMockedFields={showMockedFields}>
          {shell}
        </SocialFeedSurfaceProvider>
      )}
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
    jest.clearAllMocks();
    mockEnsureSocialProfileOnboarding.mockReturnValue(true);
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

  it('navigates to profile onboarding instead of opening the picker without a linked wallet', () => {
    mockEnsureSocialProfileOnboarding.mockImplementation(() => {
      mockNavigate(Routes.SOCIAL.PROFILE_ONBOARDING);
      return false;
    });

    renderShell(basePost({ reactions: [] }));

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
    expect(
      screen.queryByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).not.toBeOnTheScreen();
  });

  it('does not change an existing reaction without a linked wallet', async () => {
    mockEnsureSocialProfileOnboarding.mockImplementation(() => {
      mockNavigate(Routes.SOCIAL.PROFILE_ONBOARDING);
      return false;
    });

    renderShell(basePost());

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.CHIP}-post-1-🔥`),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.SOCIAL.PROFILE_ONBOARDING,
      );
    });
    expect(jest.mocked(reactToComment)).not.toHaveBeenCalled();
    expect(jest.mocked(removeCommentReaction)).not.toHaveBeenCalled();
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

  it('shows the verified badge and a temporary mock marker after the timestamp', () => {
    renderShell(basePost());

    expect(
      screen.getByTestId(SocialFeedPostShellSelectorsIDs.VERIFIED_BADGE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${SocialFeedPostShellSelectorsIDs.MOCK_MARKER}-post-1`,
      ),
    ).toHaveTextContent('*');
    expect(screen.queryByText('🐬')).toBeNull();
  });

  it('places the post age on the author row', () => {
    renderShell(basePost({ timestampMs: Date.now() - 7 * 60 * 1000 }));

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.TIMESTAMP}-post-1`),
    ).toHaveTextContent('7 min ago');
  });

  it('omits the stat line for a trader with no stats', () => {
    renderShell(basePost({ item: itemWithoutStats('item-3', 'No stats') }));

    expect(
      screen.queryByTestId(SocialFeedPostShellSelectorsIDs.TRADER_STAT),
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

  it('shows the add-reaction button and no zero when the Call has no reactions', () => {
    renderShell(basePost({ reactions: [] }));

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    ).toHaveProp('accessibilityLabel', 'Add reaction');
    expect(screen.queryByText('0')).toBeNull();
  });

  it('shows the add-reaction button when the post has no Call id', () => {
    renderShell(basePost({ commentId: undefined, reactions: [] }));

    expect(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    ).toBeOnTheScreen();
  });

  it('keeps the add-reaction button next to existing chips', () => {
    renderShell(basePost());

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.REACTIONS}-post-1`),
    );

    expect(
      screen.getByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
    ).toBeOnTheScreen();
  });

  describe('reaction chips', () => {
    const chipTestId = `${SocialFeedPostShellSelectorsIDs.CHIP}-post-1-🔥`;

    it('marks the chip the reader reacted with as selected', () => {
      renderShell(basePost({ userReaction: '🔥' }));

      expect(screen.getByTestId(chipTestId)).toHaveProp('accessibilityState', {
        selected: true,
      });
    });

    it('leaves chips the reader did not pick unselected', () => {
      renderShell(basePost({ userReaction: null }));

      expect(screen.getByTestId(chipTestId)).toHaveProp('accessibilityState', {
        selected: false,
      });
    });

    it('adds the reader to a chip when it is pressed', async () => {
      renderShell(basePost({ commentId: undefined }));

      fireEvent.press(screen.getByTestId(chipTestId));

      await waitFor(() => {
        expect(screen.getByTestId(chipTestId)).toHaveTextContent('🔥13');
      });
      expect(screen.getByTestId(chipTestId)).toHaveProp('accessibilityState', {
        selected: true,
      });
    });

    it('removes the reader from their own chip when it is pressed', async () => {
      renderShell(
        basePost({
          commentId: undefined,
          reactions: [{ emotion: '🔥', count: 2 }],
          userReaction: '🔥',
        }),
      );

      fireEvent.press(screen.getByTestId(chipTestId));

      await waitFor(() => {
        expect(screen.getByTestId(chipTestId)).toHaveTextContent('🔥1');
      });
    });
  });

  describe('copies count', () => {
    const copiesTestId = `${SocialFeedPostShellSelectorsIDs.COPIES}-post-1`;

    it('shows how many readers copied the trade', () => {
      renderShell(basePost({ copyCount: 3 }));

      expect(screen.getByTestId(copiesTestId)).toHaveTextContent('3');
    });

    it('shows a reported zero', () => {
      renderShell(basePost({ copyCount: 0 }));

      expect(screen.getByTestId(copiesTestId)).toHaveTextContent('0');
    });

    it('shows the count on a closed position', () => {
      renderShell(basePost({ item: mockClosedPerpsFeedItem(), copyCount: 7 }));

      expect(screen.getByTestId(copiesTestId)).toHaveTextContent('7');
    });

    it('omits the count when the API did not send one', () => {
      renderShell(basePost());

      expect(screen.queryByTestId(copiesTestId)).toBeNull();
    });

    it('does not open the reaction picker when the count is pressed', () => {
      renderShell(basePost({ copyCount: 3 }));

      fireEvent.press(screen.getByTestId(copiesTestId));

      expect(
        screen.queryByTestId(ReactionPickerBalloonSelectorsIDs.BALLOON),
      ).toBeNull();
    });
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

  describe('author identity press', () => {
    it('calls onAuthorPress when the identity is pressed', () => {
      const onAuthorPress = jest.fn();
      const post = basePost();
      renderShell(post, { onAuthorPress });

      fireEvent.press(
        screen.getByTestId(
          `${SocialFeedPostShellSelectorsIDs.IDENTITY_PRESS}-post-1`,
        ),
      );

      expect(onAuthorPress).toHaveBeenCalledTimes(1);
      expect(onAuthorPress).toHaveBeenCalledWith(post);
    });

    it('does not wrap the identity in a pressable when onAuthorPress is omitted', () => {
      renderShell(basePost());

      expect(
        screen.queryByTestId(
          `${SocialFeedPostShellSelectorsIDs.IDENTITY_PRESS}-post-1`,
        ),
      ).toBeNull();
    });
  });

  describe('position press', () => {
    it('calls onPositionPress when the position card is pressed', () => {
      const onPositionPress = jest.fn();
      const post = basePost();
      renderShell(post, { onPositionPress });

      fireEvent.press(
        screen.getByTestId(
          `${SocialFeedPostShellSelectorsIDs.POSITION_PRESS}-post-1`,
        ),
      );

      expect(onPositionPress).toHaveBeenCalledWith(post);
    });

    it('keeps copy trade on its own press inside a pressable card', async () => {
      mockGate.mockImplementation((action: () => Promise<void> | void) =>
        Promise.resolve(action()),
      );
      mockSelectPerpsEligibility.mockReturnValue(true);
      const onPositionPress = jest.fn();
      renderShell(basePost(), { onPositionPress });

      fireEvent.press(
        screen.getByTestId('social-feed-position-card-copy-trade-item-1'),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PERPS.MODALS.ROOT,
          expect.anything(),
        );
      });
      expect(onPositionPress).not.toHaveBeenCalled();
    });

    it('does not wrap the card when onPositionPress is omitted', () => {
      renderShell(basePost());

      expect(
        screen.queryByTestId(
          `${SocialFeedPostShellSelectorsIDs.POSITION_PRESS}-post-1`,
        ),
      ).toBeNull();
    });
  });

  it('opens the report reason sheet from the post options', () => {
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
    expect(
      screen.getByTestId('social-entry-report-reason-bottom-sheet'),
    ).toBeOnTheScreen();
  });

  it('removes a post after Hide post is pressed', () => {
    renderShell(basePost());

    fireEvent.press(
      screen.getByTestId(`${SocialFeedPostShellSelectorsIDs.MORE}-post-1`),
    );
    fireEvent.press(screen.getByTestId('social-entry-options-hide-post'));

    expect(
      screen.queryByTestId(
        `${SocialFeedPostShellSelectorsIDs.CONTAINER}-post-1`,
      ),
    ).toBeNull();
  });

  describe('copy trade', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
      mockGate.mockImplementation((action: () => Promise<void> | void) =>
        Promise.resolve(action()),
      );
      mockSelectPerpsEligibility.mockReturnValue(true);
    });

    it('opens the perps order redirect as a bottom sheet for an open perp', async () => {
      renderShell(basePost());

      fireEvent.press(
        screen.getByTestId('social-feed-position-card-copy-trade-item-1'),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MODALS.ROOT, {
          screen: Routes.PERPS.ORDER_REDIRECT,
          params: {
            direction: 'short',
            asset: 'BTC',
            leverage: 40,
            source: 'trader_feed',
            useBottomSheet: true,
            stayOnCurrentScreen: true,
            copyTradeOrigin: { commentId: 'comment-1', asset: 'BTC' },
          },
        });
      });
    });

    it('opens the perps order without a copy-trade origin for a post with no comment id', async () => {
      renderShell(basePost({ commentId: undefined }));
      fireEvent.press(
        screen.getByTestId('social-feed-position-card-copy-trade-item-1'),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PERPS.MODALS.ROOT,
          expect.objectContaining({
            params: expect.not.objectContaining({
              copyTradeOrigin: expect.anything(),
            }),
          }),
        );
      });
    });

    it('forwards an open spot item and does not open the perps order', () => {
      const onCopyTrade = jest.fn();
      const item = mockOpenSpotFeedItem({ id: 'item-spot' });

      renderShell(basePost({ item }), { onCopyTrade });
      fireEvent.press(
        screen.getByTestId('social-feed-position-card-copy-trade-item-spot'),
      );

      expect(onCopyTrade).toHaveBeenCalledWith(item, 'comment-1');
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('opens the perps order instead of the spot handler for an open perp', async () => {
      const onCopyTrade = jest.fn();

      renderShell(basePost(), { onCopyTrade });
      fireEvent.press(
        screen.getByTestId('social-feed-position-card-copy-trade-item-1'),
      );

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          Routes.PERPS.MODALS.ROOT,
          expect.objectContaining({
            screen: Routes.PERPS.ORDER_REDIRECT,
          }),
        );
      });
      expect(onCopyTrade).not.toHaveBeenCalled();
    });

    it('does not wire copy trade for a closed position', () => {
      renderShell(
        basePost({ item: mockClosedPerpsFeedItem({ id: 'item-closed' }) }),
      );

      expect(
        screen.queryByTestId(
          'social-feed-position-card-copy-trade-item-closed',
        ),
      ).toBeNull();
    });

    it('shows the geo block instead of navigating when ineligible', async () => {
      mockSelectPerpsEligibility.mockReturnValue(false);
      renderShell(basePost());

      fireEvent.press(
        screen.getByTestId('social-feed-position-card-copy-trade-item-1'),
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(SOCIAL_FEED_COPY_TRADE_GEO_BLOCK_TEST_ID),
        ).toBeOnTheScreen();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});

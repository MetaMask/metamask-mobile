import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { RefreshControl, Text } from 'react-native';
import SocialFeedCanonical from './SocialFeedCanonical';
import { getSocialFeedPostSkeletonTestId } from './SocialFeedPostSkeleton.testIds';
import {
  SOCIAL_FEED_EMPTY_TEST_ID,
  SOCIAL_FEED_ERROR_TEST_ID,
} from './SocialFeedStates.testIds';
import { createSocialFeedEntrances } from '../data/socialFeedEntrances';
import { useSocialFeedCanonical } from '../data/useSocialFeedCanonical';

jest.mock('../data/useSocialFeedCanonical', () => ({
  useSocialFeedCanonical: jest.fn(),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'NONE',
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'LOW',
}));

jest.mock('./SocialEntryOptionsBottomSheet', () => ({
  useSocialEntryModeration: () => ({ isEntryHidden: () => false }),
}));

jest.mock('./SocialFeedPostShell', () => ({
  __esModule: true,
  default: ({
    post,
  }: {
    post: { id: string; item?: { pnlLabel?: string } };
  }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(
      ReactNative.Text,
      null,
      post.item?.pnlLabel ?? post.id,
    );
  },
}));

jest.mock(
  '../../../Views/SocialLeaderboard/FeedView/components/FeedItemEntryAnimation',
  () => ({
    __esModule: true,
    default: ({
      children,
      eventId,
    }: {
      children: React.ReactNode;
      eventId?: string;
    }) => {
      const ReactActual = jest.requireActual('react');
      const ReactNative = jest.requireActual('react-native');
      return ReactActual.createElement(
        ReactActual.Fragment,
        null,
        eventId
          ? ReactActual.createElement(
              ReactNative.Text,
              null,
              `entering ${eventId}`,
            )
          : null,
        children,
      );
    },
    createFeedItemEntryScheduler: () => () => 0,
  }),
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  return {
    ...Reanimated,
    useAnimatedScrollHandler: jest.fn(() => undefined),
    useComposedEventHandler: jest.fn(() => undefined),
  };
});

const mockUseSocialFeedCanonical = jest.mocked(useSocialFeedCanonical);

const post = {
  id: 'post-1',
  authorHandle: 'trader',
  timestampMs: 1,
  reactions: [],
  item: {
    id: 'post-1',
    author: { id: 'profile-1' },
  },
} as never;

const state = {
  posts: [post],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: jest.fn(),
  error: null,
  refresh: jest.fn(),
  pendingNewCount: 0,
  revealPending: jest.fn(),
};

describe('SocialFeedCanonical', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      entrances: createSocialFeedEntrances(),
    });
  });

  it('configures the all scope with realtime in virtualized mode', () => {
    render(
      <SocialFeedCanonical
        scope="all"
        scrollMode="virtualized"
        realtime
        testID="canonical-feed"
        scrollTestID="canonical-scroll"
      />,
    );

    expect(mockUseSocialFeedCanonical).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'all', realtime: true }),
    );
    expect(screen.getByTestId('canonical-feed')).toBeOnTheScreen();
    expect(screen.getByTestId('canonical-scroll')).toBeOnTheScreen();
  });

  it('renders the content mode with non-realtime scope configuration', () => {
    render(
      <SocialFeedCanonical
        scope="all"
        scrollMode="content"
        testID="canonical-content"
      />,
    );

    expect(mockUseSocialFeedCanonical).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'all', realtime: false }),
    );
    expect(screen.getByTestId('canonical-content')).toBeOnTheScreen();
    expect(screen.getByText('post-1')).toBeOnTheScreen();
  });

  it.each(['virtualized', 'content'] as const)(
    'renders the empty state in %s mode when the feed is idle',
    (scrollMode) => {
      mockUseSocialFeedCanonical.mockReturnValue({
        ...state,
        posts: [],
        entrances: createSocialFeedEntrances(),
      });

      render(<SocialFeedCanonical scope="all" scrollMode={scrollMode} />);

      expect(screen.getByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeOnTheScreen();
    },
  );

  it('caps the pending post count at 60', () => {
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      pendingNewCount: 61,
      entrances: createSocialFeedEntrances(),
    });

    render(<SocialFeedCanonical scope="all" scrollMode="content" />);

    expect(screen.getByText('60+ new posts')).toBeOnTheScreen();
  });

  it('exposes imperative scrolling through the page ref', () => {
    const pageRef = React.createRef<{
      scrollToOffset: (offset: number, animated?: boolean) => void;
    }>();

    render(
      <SocialFeedCanonical
        pageRef={pageRef}
        scope="all"
        scrollMode="content"
      />,
    );

    act(() => {
      pageRef.current?.scrollToOffset(12, true);
    });

    expect(pageRef.current).toBeDefined();
  });

  it('refreshes the virtualized feed through its refresh control', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      refresh,
      entrances: createSocialFeedEntrances(),
    });

    render(<SocialFeedCanonical scope="all" scrollMode="virtualized" />);

    await act(async () => {
      await screen.UNSAFE_getByType(RefreshControl).props.onRefresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('compares stable reaction props when a row rerenders', () => {
    const entrances = createSocialFeedEntrances();
    const postWithReaction = {
      ...(post as object),
      reactions: [{ emotion: 'heart', count: 1 }],
    } as never;
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      posts: [postWithReaction],
      entrances,
    });
    const { rerender } = render(
      <SocialFeedCanonical scope="all" scrollMode="content" />,
    );

    rerender(<SocialFeedCanonical scope="all" scrollMode="content" />);

    expect(screen.getByText('post-1')).toBeOnTheScreen();
  });

  it('rerenders a row when its mapped item changes without a timestamp change', () => {
    const createRevision = (pnlLabel: string) =>
      ({
        id: 'post-1',
        authorHandle: 'trader',
        timestampMs: 1,
        reactions: [],
        item: {
          id: 'post-1',
          author: { id: 'profile-1' },
          pnlLabel,
        },
      }) as never;
    const { rerender } = render(
      <SocialFeedCanonical scope="trending" scrollMode="content" />,
    );

    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      posts: [createRevision('updated')],
      entrances: createSocialFeedEntrances(),
    });
    rerender(<SocialFeedCanonical scope="trending" scrollMode="content" />);

    expect(screen.getByText('updated')).toBeOnTheScreen();
  });

  it.each(['virtualized', 'content'] as const)(
    'renders loading skeleton in %s mode',
    (scrollMode) => {
      mockUseSocialFeedCanonical.mockReturnValue({
        ...state,
        posts: [],
        isLoading: true,
        entrances: createSocialFeedEntrances(),
      });

      render(<SocialFeedCanonical scope="all" scrollMode={scrollMode} />);

      expect(
        screen.getByTestId(getSocialFeedPostSkeletonTestId(0)),
      ).toBeOnTheScreen();
    },
  );

  it.each(['virtualized', 'content'] as const)(
    'renders only the error state when the initial request fails in %s mode',
    (scrollMode) => {
      mockUseSocialFeedCanonical.mockReturnValue({
        ...state,
        posts: [],
        error: 'request failed',
        entrances: createSocialFeedEntrances(),
      });

      render(<SocialFeedCanonical scope="all" scrollMode={scrollMode} />);

      expect(screen.getByTestId(SOCIAL_FEED_ERROR_TEST_ID)).toBeOnTheScreen();
      expect(screen.queryByTestId(SOCIAL_FEED_EMPTY_TEST_ID)).toBeNull();
    },
  );

  it('renders a host-owned header with the pending count', () => {
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      pendingNewCount: 13,
      entrances: createSocialFeedEntrances(),
    });
    const renderHeader = jest.fn(
      ({
        pendingNewCount,
      }: {
        pendingNewCount: number;
        onRevealPending: () => void;
      }) => <Text>header {pendingNewCount}</Text>,
    );

    render(
      <SocialFeedCanonical
        scope="all"
        scrollMode="virtualized"
        renderHeader={renderHeader}
      />,
    );

    expect(screen.getByText('header 13')).toBeOnTheScreen();
    expect(renderHeader).toHaveBeenCalledWith(
      expect.objectContaining({
        pendingNewCount: 13,
        onRevealPending: expect.any(Function),
      }),
    );
  });

  it('reveals pending posts when the pending count is pressed', () => {
    const revealPending = jest.fn();
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      pendingNewCount: 2,
      revealPending,
      entrances: createSocialFeedEntrances(),
    });

    render(<SocialFeedCanonical scope="all" scrollMode="virtualized" />);

    fireEvent.press(screen.getByText('2 new posts'));

    expect(revealPending).toHaveBeenCalledTimes(1);
  });

  it('renders the initial error footer without hiding loaded posts', () => {
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      error: 'request failed',
      entrances: createSocialFeedEntrances(),
    });

    render(<SocialFeedCanonical scope="all" scrollMode="content" />);

    expect(screen.getByText('post-1')).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_FEED_ERROR_TEST_ID)).toBeNull();
  });

  it('plays a realtime row entrance until it is marked played', () => {
    const entrances = createSocialFeedEntrances();
    mockUseSocialFeedCanonical.mockReturnValue({
      ...state,
      posts: [{ ...(post as object), realtimeEventId: 'event-1' } as never],
      entrances,
    });
    render(
      <SocialFeedCanonical scope="all" scrollMode="virtualized" realtime />,
    );
    const wasEntering = screen.queryByText('entering event-1') !== null;

    act(() => entrances.markPlayed('event-1'));

    expect(wasEntering).toBe(true);
    expect(screen.queryByText('entering event-1')).toBeNull();
    expect(screen.getByText('post-1')).toBeOnTheScreen();
  });
});

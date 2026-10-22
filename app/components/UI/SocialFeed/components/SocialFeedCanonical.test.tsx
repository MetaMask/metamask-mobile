import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SocialFeedCanonical from './SocialFeedCanonical';
import { useSocialFeedCanonical } from '../data/useSocialFeedCanonical';

jest.mock('../data/useSocialFeedCanonical', () => ({
  useSocialFeedCanonical: jest.fn(),
}));

jest.mock('./SocialEntryOptionsBottomSheet', () => ({
  useSocialEntryModeration: () => ({ isEntryHidden: () => false }),
}));

jest.mock('./SocialFeedPostShell', () => ({
  __esModule: true,
  default: ({ post }: { post: { id: string } }) => {
    const ReactActual = jest.requireActual('react');
    const ReactNative = jest.requireActual('react-native');
    return ReactActual.createElement(ReactNative.Text, null, post.id);
  },
}));

jest.mock(
  '../../../Views/SocialLeaderboard/FeedView/components/FeedItemEntryAnimation',
  () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
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
  realtimeEventIds: new Map(),
  markRealtimeEventAnimated: jest.fn(),
  pendingNewCount: 0,
};

describe('SocialFeedCanonical', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSocialFeedCanonical.mockReturnValue(state);
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
        scope="trending"
        scrollMode="content"
        filters={{ profileId: 'profile-1' }}
        testID="canonical-content"
      />,
    );

    expect(mockUseSocialFeedCanonical).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'trending', realtime: false }),
    );
    expect(screen.getByTestId('canonical-content')).toBeOnTheScreen();
    expect(screen.getByText('post-1')).toBeOnTheScreen();
  });
});

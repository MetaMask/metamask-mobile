import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { SocialFeedRealtimeSelectorsIDs } from '../../../UI/SocialFeed/components/SocialFeedRealtime';
import { mockPerpFeedItem } from '../../../UI/SocialFeed/mocks/coreFeed.mock';
import {
  mockOpenPerpsFeedItem,
  mockOpenSpotFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type {
  SocialFeedPageHandle,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import { SocialEvent } from '../analytics/socialEvents';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import type { SocialShellFilters } from '../shell/filters/types';
import LiveView from './LiveView';
import { LiveViewSelectorsIDs } from './LiveView.testIds';

interface MockSocialFeedProps {
  scope: string;
  location: string;
  scrollMode: string;
  realtime?: boolean;
  paused?: boolean;
  filterPost?: (post: SocialV1FeedPost) => boolean;
  renderHeader?: () => React.ReactNode;
  pageRef?: React.Ref<SocialFeedPageHandle>;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  onPositionPress?: (post: SocialV1FeedPost) => void;
  testID?: string;
  scrollTestID?: string;
}

const mockSocialFeed = jest.fn<null, [MockSocialFeedProps]>();
const mockFeedScrollToOffset = jest.fn();
jest.mock('../../../UI/SocialFeed/components/SocialFeed', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  const { SocialFeedRealtimeContext } = jest.requireActual(
    '../../../UI/SocialFeed/components/SocialFeedRealtime/SocialFeedRealtimeContext',
  );

  const MockSocialFeed = (props: MockSocialFeedProps) => {
    mockSocialFeed(props);
    ReactActual.useImperativeHandle(props.pageRef, () => ({
      scrollToOffset: mockFeedScrollToOffset,
    }));
    return ReactActual.createElement(
      SocialFeedRealtimeContext.Provider,
      {
        value: {
          paused: props.paused ?? false,
          pendingNewCount: 0,
        },
      },
      ReactActual.createElement(
        View,
        { testID: props.testID },
        props.renderHeader?.(),
      ),
    );
  };

  return { __esModule: true, default: MockSocialFeed };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: null }),
}));

const mockNavigateToSocialV1Profile = jest.fn();
jest.mock('../navigation/navigateToSocialV1Profile', () => ({
  navigateToSocialV1Profile: (...args: unknown[]) =>
    mockNavigateToSocialV1Profile(...args),
}));

jest.mock('../../../../util/haptics', () => ({
  ImpactMoment: { PullToRefresh: 'pullToRefresh' },
  playImpact: jest.fn(() => Promise.resolve()),
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockTrackInteraction = jest.fn();
jest.mock('../analytics', () => ({
  ...jest.requireActual('../analytics/socialEvents'),
  useSocialInteraction: () => mockTrackInteraction,
}));

const { Filter, Interaction, StreamState } = SocialEvent;

const post = (
  overrides: Partial<SocialV1FeedPost> & Pick<SocialV1FeedPost, 'id' | 'item'>,
): SocialV1FeedPost => ({
  authorHandle: overrides.item.author.username,
  timestampMs: overrides.item.timestamp,
  reactions: [],
  marketCapUsd: null,
  ...overrides,
});

const author = (id: string) => ({
  id,
  username: id,
  winRatePercent: 50,
  pnl30d: 50_000,
});

const followedSpot = post({
  id: 'followed-spot',
  item: mockOpenSpotFeedItem({
    id: 'followed-spot-item',
    author: author('followed-trader'),
  }),
});
const otherPerp = post({
  id: 'other-perp',
  item: mockOpenPerpsFeedItem({
    id: 'other-perp-item',
    author: author('other-trader'),
  }),
  position: mockPerpFeedItem({ positionId: 'other-perp-position' }),
});

const state = {
  engine: {
    backgroundState: {
      SocialController: { followingProfileIds: ['followed-trader'] },
    },
  },
};

const lastFeedProps = (): MockSocialFeedProps => {
  const props = mockSocialFeed.mock.lastCall?.[0];
  if (!props) {
    throw new Error('SocialFeed was not rendered');
  }
  return props;
};

const filters = (patch: Partial<SocialShellFilters>): SocialShellFilters => ({
  ...DEFAULT_FILTERS,
  ...patch,
});

const pressStreamButton = () =>
  fireEvent.press(
    screen.getByTestId(SocialFeedRealtimeSelectorsIDs.LIVE_BUTTON),
  );

describe('LiveView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pads the Live filter bar 16px below the tabs and 8px above the feed', () => {
    renderWithProvider(<LiveView />, { state });

    expect(
      StyleSheet.flatten(
        screen.getByTestId(LiveViewSelectorsIDs.FILTER_BAR).props.style,
      ),
    ).toEqual(expect.objectContaining({ paddingTop: 16, paddingBottom: 8 }));
  });

  it('renders the all-traders feed in virtualized realtime mode', () => {
    renderWithProvider(<LiveView />, { state });

    expect(lastFeedProps()).toEqual(
      expect.objectContaining({
        scope: 'all',
        location: 'social_live',
        scrollMode: 'virtualized',
        realtime: true,
        paused: false,
        testID: LiveViewSelectorsIDs.CONTAINER,
        scrollTestID: LiveViewSelectorsIDs.SCROLL_VIEW,
      }),
    );
  });

  it('turns realtime off while the tab is inactive', () => {
    renderWithProvider(<LiveView isActive={false} />, { state });

    expect(lastFeedProps().realtime).toBe(false);
  });

  it('keeps every post with the default filters', () => {
    renderWithProvider(<LiveView />, { state });

    const { filterPost } = lastFeedProps();

    expect(filterPost?.(followedSpot)).toBe(true);
    expect(filterPost?.(otherPerp)).toBe(true);
  });

  it('keeps only followed authors for the following cohort', () => {
    renderWithProvider(
      <LiveView appliedFilters={filters({ traderCohort: 'following' })} />,
      { state },
    );

    const { filterPost } = lastFeedProps();

    expect(filterPost?.(followedSpot)).toBe(true);
    expect(filterPost?.(otherPerp)).toBe(false);
  });

  it('keeps only matching asset types for the type chip', () => {
    renderWithProvider(
      <LiveView appliedFilters={filters({ type: 'perps' })} />,
      { state },
    );

    const { filterPost } = lastFeedProps();

    expect(filterPost?.(followedSpot)).toBe(false);
    expect(filterPost?.(otherPerp)).toBe(true);
  });

  it('scrolls to the top when the applied filters change', () => {
    const { rerender } = renderWithProvider(
      <LiveView appliedFilters={DEFAULT_FILTERS} />,
      { state },
    );

    rerender(<LiveView appliedFilters={filters({ type: 'tokens' })} />);

    expect(mockFeedScrollToOffset).toHaveBeenCalledTimes(1);
    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(0, false);
  });

  it('keeps the scroll position when the filters are unchanged', () => {
    const { rerender } = renderWithProvider(
      <LiveView appliedFilters={DEFAULT_FILTERS} />,
      { state },
    );

    rerender(<LiveView appliedFilters={DEFAULT_FILTERS} isFilterActive />);

    expect(mockFeedScrollToOffset).not.toHaveBeenCalled();
  });

  it('forwards page scrolls from the shell to the feed', () => {
    const pageRef = React.createRef<SocialTabPageHandle>();
    renderWithProvider(<LiveView pageRef={pageRef} />, { state });

    act(() => {
      pageRef.current?.scrollToOffset(0, true);
    });

    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(0, true);
  });

  it('pauses the feed, then resumes it', () => {
    renderWithProvider(<LiveView />, { state });

    pressStreamButton();
    const pausedProps = lastFeedProps();
    pressStreamButton();

    expect(pausedProps.paused).toBe(true);
    expect(lastFeedProps().paused).toBe(false);
  });

  it('tracks each stream toggle with the previous state', () => {
    renderWithProvider(<LiveView />, { state });

    pressStreamButton();
    pressStreamButton();

    expect(mockTrackInteraction).toHaveBeenNthCalledWith(
      1,
      Interaction.STREAM_TOGGLED,
      {
        filter_name: Filter.STREAM_STATE,
        filter_value: StreamState.PAUSED,
        previous_filter_value: StreamState.LIVE,
      },
    );
    expect(mockTrackInteraction).toHaveBeenNthCalledWith(
      2,
      Interaction.STREAM_TOGGLED,
      {
        filter_name: Filter.STREAM_STATE,
        filter_value: StreamState.LIVE,
        previous_filter_value: StreamState.PAUSED,
      },
    );
  });

  it('opens the author profile', () => {
    renderWithProvider(<LiveView />, { state });

    act(() => {
      lastFeedProps().onAuthorPress?.(otherPerp);
    });

    expect(mockNavigateToSocialV1Profile).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        traderId: 'other-trader',
        source: 'trader_feed',
      }),
    );
  });

  it('opens the position sheet for posts with a position', () => {
    renderWithProvider(<LiveView />, { state });

    act(() => {
      lastFeedProps().onPositionPress?.(otherPerp);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL.POSITION_SHEET,
      expect.objectContaining({
        positionId: 'other-perp-position',
        isClosed: false,
      }),
    );
  });
});

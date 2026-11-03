import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import type { SocialPerformanceContext } from '../../../../util/social/socialPerformance';
import type { SocialFeedInlineRow } from '../../../UI/SocialFeed/components/SocialFeed';
import {
  mockClosedSpotFeedItem,
  mockOpenPerpsFeedItem,
} from '../../../UI/SocialFeed/mocks/socialV1Feed.mock';
import type {
  SocialFeedPageHandle,
  SocialV1FeedItem,
  SocialV1FeedPost,
} from '../../../UI/SocialFeed/types';
import { SocialEvent } from '../analytics/socialEvents';
import type { SocialTabPageHandle } from '../shared/tabPageScroll';
import { getSocialV1HotTokenChipTestId } from '../SocialV1View/feed/components/HotTokensCarousel.testIds';
import { SocialV1ViewSelectorsIDs } from '../SocialV1View/SocialV1View.testIds';
import { SOCIAL_FILTER_EMPTY_STATE_TEST_ID } from '../shared/SocialFilterEmptyState';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';
import { TRENDING_FILTER_RAIL_TEST_ID } from '../shell/filters/TrendingFilterRail';
import { SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID } from '../SocialV1View/feed/components/SocialV1FeedEmptyState.testIds';
import { mockHotToken } from '../SocialV1View/feed/mocks/socialV1HotTokens.mock';
import type { SocialV1HotToken } from '../SocialV1View/feed/types';
import { useTrendingHotTokens } from './hooks/useTrendingHotTokens';
import TrendingView, {
  TRENDING_FEED_QUERY,
  TRENDING_POPULAR_TRADERS_INSERT_AFTER,
} from './TrendingView';

interface MockSocialFeedProps {
  scope: string;
  assetIds?: readonly string[];
  realtime?: boolean;
  location: string;
  analyticsSource?: string;
  scrollMode: string;
  showMockedFields?: boolean;
  isActive?: boolean;
  renderHeader?: () => React.ReactNode;
  inlineRows?: readonly SocialFeedInlineRow[];
  emptyState?: React.ReactNode;
  onRefresh?: () => void;
  performance?: { tab: string; context: SocialPerformanceContext };
  onScroll?: unknown;
  pageRef?: React.Ref<SocialFeedPageHandle>;
  onAuthorPress?: (post: SocialV1FeedPost) => void;
  onCopyTrade?: unknown;
  onPositionPress?: (post: SocialV1FeedPost) => void;
  filterPost?: (post: SocialV1FeedPost) => boolean;
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

  const MockSocialFeed = (props: MockSocialFeedProps) => {
    mockSocialFeed(props);
    ReactActual.useImperativeHandle(props.pageRef, () => ({
      scrollToOffset: mockFeedScrollToOffset,
    }));
    return ReactActual.createElement(
      View,
      { testID: props.testID },
      props.renderHeader?.(),
      props.emptyState,
      props.inlineRows?.map((row) =>
        ReactActual.createElement(
          ReactActual.Fragment,
          { key: row.key },
          row.render(),
        ),
      ),
    );
  };

  return { __esModule: true, default: MockSocialFeed };
});

jest.mock('./hooks/useTrendingHotTokens', () => ({
  useTrendingHotTokens: jest.fn(),
}));

// The marquee is covered in HotTokensCarousel.test. This stand-in exposes the
// chips so the view can prove a press filters the feed.
jest.mock('../SocialV1View/feed/components', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const { Pressable } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  const { getSocialV1HotTokenChipTestId: chipTestId } = jest.requireActual(
    '../SocialV1View/feed/components/HotTokensCarousel.testIds',
  );
  return {
    HotTokensCarousel: ({
      tokens = [],
      selectedTokenId = null,
      onTokenPress,
    }: {
      tokens?: SocialV1HotToken[];
      selectedTokenId?: string | null;
      onTokenPress?: (token: SocialV1HotToken) => void;
    }) =>
      ReactActual.createElement(
        ReactActual.Fragment,
        null,
        tokens.map((token) =>
          ReactActual.createElement(Pressable, {
            key: token.id,
            testID: chipTestId(token.id),
            accessibilityState: { selected: token.id === selectedTokenId },
            onPress: () => onTokenPress?.(token),
          }),
        ),
      ),
  };
});

jest.mock('../SocialV1View/feed/components/PopularTradersCarousel', () => {
  const ReactActual = jest.requireActual('react') as typeof React;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'popular-traders-carousel-section',
      }),
  };
});

const mockTrackInteraction = jest.fn();
const mockUseSocialInteraction = jest.fn(
  (..._args: unknown[]) => mockTrackInteraction,
);
jest.mock('../analytics', () => ({
  ...jest.requireActual('../analytics/socialEvents'),
  useSocialInteraction: (...args: unknown[]) =>
    mockUseSocialInteraction(...args),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../MyProfileView/hooks', () => ({
  useMyProfile: () => ({ profile: null }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const { Interaction, Screen, Source, Tab } = SocialEvent;

const mockUseTrendingHotTokens = jest.mocked(useTrendingHotTokens);

const BTC = mockHotToken({
  id: 'asset:BTC',
  symbol: 'BTC',
  assetIds: [
    'eip155:999/perp:BTC',
    'eip155:1/erc20:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  ],
});
const ETH = mockHotToken({ id: 'asset:ETH', symbol: 'ETH' });

const performanceContext: SocialPerformanceContext = {
  enabled: true,
  hardwareTier: null,
  isActive: true,
  isFocused: true,
  networkTier: null,
};

const lastFeedProps = (): MockSocialFeedProps => {
  const props = mockSocialFeed.mock.lastCall?.[0];
  if (!props) {
    throw new Error('SocialFeed was not rendered');
  }
  return props;
};

const pressChip = (token: SocialV1HotToken) =>
  fireEvent.press(screen.getByTestId(getSocialV1HotTokenChipTestId(token.id)));

describe('TrendingView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrendingHotTokens.mockReturnValue({
      tokens: [BTC, ETH],
      isLoading: false,
    });
  });

  it('renders the leaderboard feed in virtualized mode with mocked fields', () => {
    const onCopyTrade = jest.fn();

    renderWithProvider(
      <TrendingView
        source={Source.NAV_TAB}
        onCopyTrade={onCopyTrade}
        testID="trending-content"
        scrollTestID="trending-scroll"
      />,
    );

    expect(lastFeedProps()).toEqual(
      expect.objectContaining({
        scope: 'trending',
        assetIds: undefined,
        realtime: true,
        location: 'social_trending',
        analyticsSource: Source.NAV_TAB,
        scrollMode: 'virtualized',
        showMockedFields: true,
        isActive: true,
        onCopyTrade,
        testID: 'trending-content',
        scrollTestID: 'trending-scroll',
      }),
    );
  });

  it('ranks the rail from the same query the feed renders', () => {
    renderWithProvider(<TrendingView />);

    expect(mockUseTrendingHotTokens.mock.lastCall?.[0]).toBe(
      TRENDING_FEED_QUERY,
    );
    expect(lastFeedProps()).toEqual(
      expect.objectContaining(TRENDING_FEED_QUERY),
    );
  });

  it('streams the feed only while the tab is active', () => {
    const { rerender } = renderWithProvider(<TrendingView isActive />);
    const realtimeWhileActive = lastFeedProps().realtime;

    rerender(<TrendingView isActive={false} />);

    expect(realtimeWhileActive).toBe(true);
    expect(lastFeedProps().realtime).toBe(false);
  });

  it('passes the Trending performance context to the feed', () => {
    renderWithProvider(<TrendingView performance={performanceContext} />);

    expect(lastFeedProps().performance).toEqual({
      tab: 'trending',
      context: performanceContext,
    });
  });

  it('omits performance without a context', () => {
    renderWithProvider(<TrendingView />);

    expect(lastFeedProps().performance).toBeUndefined();
  });

  it('waits for the tab to be opened before mounting the feed', () => {
    const { rerender } = renderWithProvider(<TrendingView isActive={false} />);
    const mountedWhileClosed = mockSocialFeed.mock.calls.length;
    const railGateWhileClosed =
      mockUseTrendingHotTokens.mock.lastCall?.[1].hasBeenActive;

    rerender(<TrendingView isActive />);

    expect(mountedWhileClosed).toBe(0);
    expect(railGateWhileClosed).toBe(false);
    expect(lastFeedProps().isActive).toBe(true);
    expect(mockUseTrendingHotTokens.mock.lastCall?.[1].hasBeenActive).toBe(
      true,
    );
  });

  it('keeps the feed mounted after the tab is left', () => {
    const { rerender } = renderWithProvider(<TrendingView isActive />);

    rerender(<TrendingView isActive={false} />);

    expect(lastFeedProps().isActive).toBe(false);
    expect(mockUseTrendingHotTokens.mock.lastCall?.[1].hasBeenActive).toBe(
      true,
    );
  });

  it('inserts Popular traders after the third post', () => {
    renderWithProvider(<TrendingView />);

    expect(TRENDING_POPULAR_TRADERS_INSERT_AFTER).toBe(3);
    expect(lastFeedProps().inlineRows).toEqual([
      expect.objectContaining({
        key: 'popular-traders',
        afterIndex: TRENDING_POPULAR_TRADERS_INSERT_AFTER,
      }),
    ]);
    expect(
      screen.getByTestId('popular-traders-carousel-section'),
    ).toBeOnTheScreen();
  });

  it('shows the Trending empty state when the feed is empty', () => {
    renderWithProvider(<TrendingView />);

    expect(
      screen.getByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.feed.v1_empty.trending.description'),
    ).toBeOnTheScreen();
  });

  it('filters the feed to every asset of the pressed chip and scrolls to the top', () => {
    renderWithProvider(<TrendingView />);

    pressChip(BTC);

    expect(lastFeedProps().assetIds).toBe(BTC.assetIds);
    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(0, true);
    expect(mockUseTrendingHotTokens.mock.lastCall?.[1].selectedTokenId).toBe(
      BTC.id,
    );
    expect(
      screen.getByTestId(getSocialV1HotTokenChipTestId(BTC.id)).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('clears the filter when the selected chip is pressed again', () => {
    renderWithProvider(<TrendingView />);

    pressChip(BTC);
    pressChip(BTC);

    expect(lastFeedProps().assetIds).toBeUndefined();
    expect(mockFeedScrollToOffset).toHaveBeenCalledTimes(2);
    expect(lastFeedProps().inlineRows).toHaveLength(1);
  });

  it('drops Popular traders and the Trending empty state while a chip is selected', () => {
    renderWithProvider(<TrendingView />);

    pressChip(BTC);

    expect(lastFeedProps().inlineRows).toBeUndefined();
    expect(lastFeedProps().emptyState).toBeUndefined();
    expect(screen.queryByTestId('popular-traders-carousel-section')).toBeNull();
    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  it('tracks a pull-to-refresh on the Trending screen', () => {
    renderWithProvider(<TrendingView source={Source.NAV_TAB} />);

    act(() => {
      lastFeedProps().onRefresh?.();
    });

    expect(mockUseSocialInteraction).toHaveBeenLastCalledWith(
      Screen.TRENDING,
      { tab_name: Tab.TRENDING, source: Source.NAV_TAB },
      true,
    );
    expect(mockTrackInteraction).toHaveBeenCalledWith(Interaction.REFRESH);
  });

  it('opens Custom filters from the button over the pills', () => {
    const onOpenFilters = jest.fn();
    renderWithProvider(<TrendingView onOpenFilters={onOpenFilters} />);

    fireEvent.press(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_FILTER_BUTTON),
    );

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_FILTER_BUTTON).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
    expect(
      StyleSheet.flatten(
        screen.getByTestId(TRENDING_FILTER_RAIL_TEST_ID).props.style,
      ),
    ).toEqual(expect.objectContaining({ marginBottom: -16 }));
  });

  it('marks the filter button selected when a filter is applied', () => {
    renderWithProvider(<TrendingView isFilterActive />);

    expect(
      screen.getByTestId(SocialV1ViewSelectorsIDs.TRENDING_FILTER_BUTTON).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      screen.getByTestId(SOCIAL_FILTER_EMPTY_STATE_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(SOCIAL_V1_FEED_EMPTY_STATE_TEST_ID)).toBeNull();
  });

  it('keeps closed posts when Custom filters apply closed positions', () => {
    renderWithProvider(
      <TrendingView
        appliedFilters={{ ...DEFAULT_FILTERS, positionStatus: 'closed' }}
      />,
    );

    const toPost = (item: SocialV1FeedItem): SocialV1FeedPost => ({
      id: item.id,
      authorHandle: item.author.username,
      timestampMs: item.timestamp,
      reactions: [],
      item,
    });
    const filterPost = lastFeedProps().filterPost;
    expect(filterPost?.(toPost(mockOpenPerpsFeedItem()))).toBe(false);
    expect(filterPost?.(toPost(mockClosedSpotFeedItem()))).toBe(true);
  });

  it('stacks Custom filters on the selected pill feed', () => {
    renderWithProvider(
      <TrendingView
        appliedFilters={{ ...DEFAULT_FILTERS, positionStatus: 'closed' }}
      />,
    );

    pressChip(BTC);

    expect(lastFeedProps().assetIds).toBe(BTC.assetIds);
    expect(lastFeedProps().filterPost).toEqual(expect.any(Function));
  });

  it('forwards page scrolls from the shell to the feed', () => {
    const pageRef = React.createRef<SocialTabPageHandle>();
    renderWithProvider(<TrendingView pageRef={pageRef} />);

    act(() => {
      pageRef.current?.scrollToOffset(24, true);
    });

    expect(mockFeedScrollToOffset).toHaveBeenCalledWith(24, true);
  });
});

import React from 'react';
import { act, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import LeaderboardShellTabPage from './LeaderboardShellTabPage';
import { DEFAULT_FILTERS } from './filters';
import { TopTradersViewSelectorsIDs } from '../TopTradersView/TopTradersView.testIds';

const LEADERBOARD_TEST_ID = 'social-leaderboard-mock';

const mockLeaderboardProps = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockTrack = jest.fn();
let mockIsPerpsEnabled = true;
let mockHardwareTier: 'LOW' | 'HIGH' | null = null;
let mockNetworkTier: 'WIFI' | 'NONE' | 'SLOW_CELLULAR' | null = null;

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockHardwareTier,
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

jest.mock('../../../UI/SocialLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SocialLeaderboard: ({
      ref,
      scrollTestID,
      refreshControl,
      listHeader,
      visible = true,
      ...props
    }: Record<string, unknown> & {
      ref?: React.Ref<unknown>;
      scrollTestID?: string;
      refreshControl?: React.ReactElement;
      listHeader?: React.ReactElement | null;
      visible?: boolean;
    }) => {
      mockLeaderboardProps(props);
      ReactActual.useImperativeHandle(ref, () => ({
        refresh: mockRefresh,
        scrollToOffset: () => undefined,
      }));
      if (!visible) {
        return null;
      }
      return ReactActual.createElement(
        View,
        { testID: scrollTestID, refreshControl },
        listHeader,
        ReactActual.createElement(View, { testID: 'social-leaderboard-mock' }),
      );
    },
  };
});

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    ...jest.requireActual(
      '../../../../selectors/featureFlagController/socialLeaderboard',
    ),
    selectSocialLeaderboardPerpsEnabled: () => mockIsPerpsEnabled,
  }),
);

jest.mock('../analytics', () => ({
  ...jest.requireActual('../analytics'),
  useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({ params: { source: 'home_banner' } }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const lastLeaderboardProps = () =>
  mockLeaderboardProps.mock.calls[
    mockLeaderboardProps.mock.calls.length - 1
  ][0];

describe('LeaderboardShellTabPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPerpsEnabled = true;
    mockHardwareTier = null;
    mockNetworkTier = null;
  });

  it('renders the combined ranking with the viewer card by default', () => {
    renderWithProvider(
      <LeaderboardShellTabPage containerTestID="leaderboard-page" />,
    );

    expect(lastLeaderboardProps()).toEqual(
      expect.objectContaining({
        source: { kind: 'all', assetClass: 'all' },
        location: 'social_leaderboard',
        showViewerRow: true,
        virtualized: true,
        filters: { timeframe: '7d', ranking: 'pnl', cohort: 'all' },
      }),
    );
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.RANKING_SELECTOR),
    ).toBeOnTheScreen();
  });

  it('maps the applied shell filters onto the leaderboard', () => {
    renderWithProvider(
      <LeaderboardShellTabPage
        containerTestID="leaderboard-page"
        appliedFilters={{
          ...DEFAULT_FILTERS,
          type: 'perps',
          timeframe: '30d',
          traderCohort: 'whale',
        }}
      />,
    );

    expect(lastLeaderboardProps()).toEqual(
      expect.objectContaining({
        source: { kind: 'all', assetClass: 'perps' },
        filters: { timeframe: '30d', ranking: 'pnl', cohort: 'whale' },
      }),
    );
  });

  it('stays on the combined ranking when perps are off', () => {
    mockIsPerpsEnabled = false;

    renderWithProvider(
      <LeaderboardShellTabPage
        containerTestID="leaderboard-page"
        appliedFilters={{ ...DEFAULT_FILTERS, type: 'perps' }}
      />,
    );

    expect(lastLeaderboardProps().source).toEqual({
      kind: 'all',
      assetClass: 'all',
    });
  });

  it('holds the list back until the tab is opened', () => {
    const { rerender } = renderWithProvider(
      <LeaderboardShellTabPage
        isActive={false}
        containerTestID="leaderboard-page"
      />,
    );

    expect(screen.queryByTestId(LEADERBOARD_TEST_ID)).toBeNull();
    expect(mockTrack).not.toHaveBeenCalled();

    rerender(
      <LeaderboardShellTabPage isActive containerTestID="leaderboard-page" />,
    );

    expect(screen.getByTestId(LEADERBOARD_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps the list mounted once the tab has been opened', () => {
    const { rerender } = renderWithProvider(
      <LeaderboardShellTabPage isActive containerTestID="leaderboard-page" />,
    );

    rerender(
      <LeaderboardShellTabPage
        isActive={false}
        containerTestID="leaderboard-page"
      />,
    );

    expect(screen.getByTestId(LEADERBOARD_TEST_ID)).toBeOnTheScreen();
  });

  it('keeps prepared rows mounted if capability later degrades', () => {
    const { rerender } = renderWithProvider(
      <LeaderboardShellTabPage
        isActive={false}
        prepare
        containerTestID="leaderboard-page"
      />,
    );

    mockHardwareTier = 'LOW';
    rerender(
      <LeaderboardShellTabPage
        isActive={false}
        prepare
        containerTestID="leaderboard-page"
      />,
    );

    expect(screen.getByTestId(LEADERBOARD_TEST_ID)).toBeOnTheScreen();
  });

  it('tracks the screen view once, with the route source', () => {
    const { rerender } = renderWithProvider(
      <LeaderboardShellTabPage containerTestID="leaderboard-page" />,
    );
    rerender(
      <LeaderboardShellTabPage
        containerTestID="leaderboard-page"
        appliedFilters={{ ...DEFAULT_FILTERS, type: 'tokens' }}
      />,
    );

    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_TRADER_LEADERBOARD_SCREEN_VIEWED,
      { source: 'home_banner', chain_filter: 'all' },
    );
  });

  it('refreshes the leaderboard on pull to refresh', async () => {
    jest.useFakeTimers();
    renderWithProvider(
      <LeaderboardShellTabPage containerTestID="leaderboard-page" />,
    );
    const scroll = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);

    await act(async () => {
      const pending = scroll.props.refreshControl.props.onRefresh();
      jest.advanceTimersByTime(1000);
      await pending;
    });

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

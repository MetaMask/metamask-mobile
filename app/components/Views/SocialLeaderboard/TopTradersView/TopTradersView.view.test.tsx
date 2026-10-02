/**
 * Component-view tests for TopTradersView (leaderboard page).
 *
 * These tests drive the full data pipeline – Engine.controllerMessenger →
 * React Query (useTopTraders) → Redux state → rendered UI – without mocking
 * hooks or selectors. All external I/O is intercepted at the Engine messenger
 * layer (see tests/component-view/api-mocking/socialLeaderboard.ts).
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/TopTradersView/TopTradersView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { PERP_CHAINS, SPOT_CHAINS } from '../../shared/top-traders-constants';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  mockLeaderboardTraders,
  setupLeaderboardApiMock,
} from '../../../../../tests/component-view/api-mocking/socialLeaderboard';
import {
  renderTopTradersView,
  renderTopTradersViewWithProps,
  renderTopTradersViewWithRoutes,
} from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { TopTradersViewSelectorsIDs } from './TopTradersView.testIds';
import {
  getRankingFilterOptionTestId,
  getSortFilterOptionTestId,
  getTimeframeFilterOptionTestId,
  getTypeFilterOptionTestId,
} from '../components/Filters';
import {
  getLocalSocialProfileSnapshot,
  restoreDefaultLocalSocialProfile,
  saveLocalSocialProfile,
} from '../MyProfileView/hooks/localSocialProfileStore';
import { DEFAULT_FILTERS } from '../shell/filters/filterDefaults';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const selectTypeFilter = (type: 'all' | 'tokens' | 'perps') => {
  fireEvent.press(screen.getByTestId(TopTradersViewSelectorsIDs.TYPE_SELECTOR));
  fireEvent.press(screen.getByTestId(getTypeFilterOptionTestId(type)));
};

const selectSort = (sort: 'pnl' | 'roi' | 'winRate') => {
  fireEvent.press(screen.getByTestId(TopTradersViewSelectorsIDs.SORT_SELECTOR));
  fireEvent.press(screen.getByTestId(getSortFilterOptionTestId(sort)));
};

const selectTimeframe = (tf: '7d' | '30d') => {
  fireEvent.press(
    screen.getByTestId(TopTradersViewSelectorsIDs.TIMEFRAME_SELECTOR),
  );
  fireEvent.press(screen.getByTestId(getTimeframeFilterOptionTestId(tf)));
};

const triggerPullToRefresh = async () => {
  const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);
  await act(async () => {
    await list.props.refreshControl.props.onRefresh();
  });
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TopTradersView', () => {
  beforeEach(() => {
    setupLeaderboardApiMock();
  });

  afterEach(() => {
    clearLeaderboardApiMock();
  });

  // -------------------------------------------------------------------------
  // 1. Data completeness
  // -------------------------------------------------------------------------

  it('renders complete trader data for every row after the leaderboard API resolves', async () => {
    renderTopTradersView();

    // The tokens tab lands first; alpha.eth and beta.eth are spot traders.
    const [alpha1, alpha2] = mockLeaderboardTraders;
    const alphaName = await screen.findByText(alpha1.name);
    expect(alphaName).toBeOnTheScreen();

    // Validate all significant fields for alpha.eth (rank 1 – gold medal).
    const alphaRow = await screen.findByTestId(
      `trader-row-${alpha1.profileId}`,
    );
    const alphaWithin = within(alphaRow);
    expect(
      alphaWithin.getByTestId(`rank-medal-${alpha1.rank}`),
    ).toBeOnTheScreen();
    expect(alphaWithin.getByText('+$963,146.80')).toBeOnTheScreen();
    expect(
      alphaWithin.getByText(strings('social_leaderboard.follow')),
    ).toBeOnTheScreen();

    // Validate all significant fields for beta.eth (rank 2 – silver medal).
    const betaRow = await screen.findByTestId(`trader-row-${alpha2.profileId}`);
    const betaWithin = within(betaRow);
    expect(
      betaWithin.getByTestId(`rank-medal-${alpha2.rank}`),
    ).toBeOnTheScreen();
    expect(betaWithin.getByText('+$474,751.45')).toBeOnTheScreen();
    expect(
      betaWithin.getByText(strings('social_leaderboard.follow')),
    ).toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // 2. Sort interaction: ROI reorders rows and changes metric labels
  // -------------------------------------------------------------------------

  it('reorders rows by ROI and replaces PnL labels with percentage values when sort switches to ROI', async () => {
    renderTopTradersView();

    // Wait for the default PnL sort to settle.
    expect(await screen.findByText('+$963,146.80')).toBeOnTheScreen();

    // alpha.eth PnL is shown; ROI percentage is not yet visible.
    expect(screen.queryByText('+43.00%')).not.toBeOnTheScreen();

    // Switch to ROI sort – beta.eth (359 %) leads; alpha.eth (43 %) is second.
    selectSort('roi');

    // Metric labels update to ROI percentages; PnL labels disappear.
    expect(await screen.findByText('+359.00%')).toBeOnTheScreen();
    expect(screen.getByText('+43.00%')).toBeOnTheScreen();
    expect(screen.queryByText('+$963,146.80')).not.toBeOnTheScreen();
    expect(screen.queryByText('+$474,751.45')).not.toBeOnTheScreen();

    // The rows are re-ranked: beta.eth now appears before alpha.eth.
    const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);
    const listed = list.props.data as { username: string }[];
    expect(listed[0].username).toBe('beta.eth');
    expect(listed[1].username).toBe('alpha.eth');
  });

  // -------------------------------------------------------------------------
  // 3. Type filter: Perps tab shows hyperliquid traders; Tokens tab hides them
  // -------------------------------------------------------------------------

  it('shows gamma.eth on the Perps tab and hides spot traders; restores spot traders on Tokens tab', async () => {
    renderTopTradersView();

    // Tokens tab (default): spot traders visible, perps trader absent.
    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.queryByText('gamma.eth')).not.toBeOnTheScreen();

    // Switch to Perps tab.
    selectTypeFilter('perps');

    // gamma.eth (hyperliquid) now appears; spot traders disappear.
    expect(await screen.findByText('gamma.eth')).toBeOnTheScreen();
    expect(screen.queryByText('alpha.eth')).not.toBeOnTheScreen();
    expect(screen.queryByText('beta.eth')).not.toBeOnTheScreen();

    // Switch back to Tokens tab.
    selectTypeFilter('tokens');

    // Spot traders return; perps trader is gone again.
    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.queryByText('gamma.eth')).not.toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // 4. Follow press calls Engine with correct profile id
  // -------------------------------------------------------------------------

  it('calls Engine followTrader with the trader profile id when Follow is pressed', async () => {
    renderTopTradersView();

    // Wait for data to load before tapping.
    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();

    const followButtons = screen.getAllByText(
      strings('social_leaderboard.follow'),
    );
    await act(async () => {
      fireEvent.press(followButtons[0]);
    });

    // The spy includes all messenger calls; check the follow call specifically.
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialController:followTrader',
      {
        targets: [mockLeaderboardTraders[0].profileId],
      },
    );
  });

  // -------------------------------------------------------------------------
  // 5. Unfollow: already-following trader shows "Following" then calls Engine
  // -------------------------------------------------------------------------

  it('calls Engine unfollowTrader when Following is pressed on an already-followed trader', async () => {
    renderTopTradersView({
      // trader-1 is seeded as followed in Redux state.
      presetOptions: { followingProfileIds: ['trader-1'] },
    });

    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(
        screen.getByText(strings('social_leaderboard.following')),
      );
    });

    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialController:unfollowTrader',
      {
        targets: ['trader-1'],
      },
    );
  });

  // -------------------------------------------------------------------------
  // 6. Trading signals intercept navigates to setup sheet when channels are off
  // -------------------------------------------------------------------------

  it('navigates to the trading signals setup sheet when Follow is pressed with both notification channels disabled', async () => {
    // Reconfigure the mock before rendering so the component receives
    // channels-disabled prefs on its first AUS:getNotificationPreferences fetch.
    clearLeaderboardApiMock();
    setupLeaderboardApiMock({
      notificationPrefs: { pushEnabled: false, inAppEnabled: false },
    });

    renderTopTradersViewWithRoutes([
      { name: Routes.SOCIAL.TRADING_SIGNALS_SETUP },
    ]);

    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(
        screen.getAllByText(strings('social_leaderboard.follow'))[0],
      );
    });

    // The trading signals setup sheet route should have been pushed.
    await screen.findByTestId(
      getRouteProbeTestId(Routes.SOCIAL.TRADING_SIGNALS_SETUP),
    );
  });

  // -------------------------------------------------------------------------
  // 7. Pull-to-refresh triggers a leaderboard refetch
  // -------------------------------------------------------------------------

  it('refetches the leaderboard via the Engine when the list is pulled to refresh', async () => {
    renderTopTradersView();

    expect(
      await screen.findByText(mockLeaderboardTraders[0].name),
    ).toBeOnTheScreen();

    // Clear accumulated calls (initial fetch + any idle prefetches) so only the
    // refresh-triggered call is counted. Without this, idle tab prefetches that
    // land in the same window would make a before/after comparison unreliable.
    getLeaderboardMessengerSpy().mockClear();

    await triggerPullToRefresh();

    // The active (tokens) tab must have issued exactly one new fetch with the
    // spot chains parameter.
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialService:fetchLeaderboard',
      expect.objectContaining({ chains: SPOT_CHAINS }),
    );
  });

  // -------------------------------------------------------------------------
  // 8. Timeframe selector switches the displayed 30-day PnL values
  // -------------------------------------------------------------------------

  it('displays 30-day PnL values after the 30d timeframe is selected', async () => {
    renderTopTradersView();

    // Default 7-day PnL for alpha.eth.
    expect(await screen.findByText('+$963,146.80')).toBeOnTheScreen();

    // Switch to 30-day window.
    selectTimeframe('30d');

    // alpha.eth 30d PnL = 1_200_000 → formatted "+$1,200,000.00".
    expect(await screen.findByText('+$1,200,000.00')).toBeOnTheScreen();
    expect(screen.queryByText('+$963,146.80')).not.toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // 9. Tapping a trader row navigates to the profile screen with correct params
  // -------------------------------------------------------------------------

  it('navigates to the trader profile screen with the correct trader id and rank when a row is tapped', async () => {
    renderTopTradersViewWithRoutes([{ name: Routes.SOCIAL.PROFILE }]);

    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('alpha.eth'));

    await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.PROFILE));
  });

  // -------------------------------------------------------------------------
  // 10. Mute chip for a followed trader calls Engine to toggle notifications
  // -------------------------------------------------------------------------

  it('calls Engine to update mute state when the mute chip of a followed trader is pressed', async () => {
    renderTopTradersView({
      presetOptions: { followingProfileIds: ['trader-1'] },
    });

    const [alpha] = mockLeaderboardTraders;
    expect(await screen.findByText(alpha.name)).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`trader-row-mute-chip-${alpha.profileId}`),
      );
    });

    // Muting writes through to the AUS putNotificationPreferences action.
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'AuthenticatedUserStorageService:putNotificationPreferences',
      expect.anything(),
      expect.anything(),
    );
  });

  // -------------------------------------------------------------------------
  // 11. Win-rate sort reorders and shows win-rate labels
  // -------------------------------------------------------------------------

  it('shows win-rate metric labels and reorders rows when win-rate sort is selected', async () => {
    renderTopTradersView();

    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();

    selectSort('winRate');

    // alpha.eth has 92 % win rate (highest spot trader) → shows "92%" first.
    expect(await screen.findByText('92%')).toBeOnTheScreen();
    // PnL labels should be gone.
    expect(screen.queryByText('+$963,146.80')).not.toBeOnTheScreen();

    // beta.eth has 61 % win rate.
    expect(screen.getByText('61%')).toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // 12. All-tab query includes all fixture traders (spot + perps)
  // -------------------------------------------------------------------------

  it('shows all traders including gamma.eth when the All tab is selected', async () => {
    renderTopTradersView();

    // Switch to All tab (includes hyperliquid).
    selectTypeFilter('all');

    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.getByText('beta.eth')).toBeOnTheScreen();
    expect(screen.getByText('gamma.eth')).toBeOnTheScreen();
  });

  // -------------------------------------------------------------------------
  // 13. Perps flag off: no type pill, and the perps chain is never queried
  // -------------------------------------------------------------------------

  it('hides the type pill and never queries the perps chain when the perps flag is off', async () => {
    renderTopTradersView({ presetOptions: { perpsEnabled: false } });

    expect(await screen.findByText('alpha.eth')).toBeOnTheScreen();
    expect(screen.getByText('beta.eth')).toBeOnTheScreen();

    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TYPE_SELECTOR),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.TIMEFRAME_SELECTOR),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TopTradersViewSelectorsIDs.SORT_SELECTOR),
    ).toBeOnTheScreen();
    // Idle prefetches for the other tabs must not sneak the perps chain in.
    const fetchedChains = getLeaderboardMessengerSpy()
      .mock.calls.filter(
        ([action]) => action === 'SocialService:fetchLeaderboard',
      )
      .flatMap(([, opts]) => (opts as { chains?: string[] }).chains ?? []);
    expect(fetchedChains).not.toContain(PERP_CHAINS[0]);
  });

  // -------------------------------------------------------------------------
  // 14. Pinned type: host owns the type axis, list is perps-only
  // -------------------------------------------------------------------------

  it('lists only perps traders and hides the type pill when the host pins the perps type', async () => {
    renderTopTradersViewWithProps({ pinnedTypeFilter: 'perps' });

    expect(await screen.findByText('gamma.eth')).toBeOnTheScreen();

    expect(screen.queryByText('alpha.eth')).not.toBeOnTheScreen();
    expect(screen.queryByText('beta.eth')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(TopTradersViewSelectorsIDs.TYPE_SELECTOR),
    ).not.toBeOnTheScreen();
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialService:fetchLeaderboard',
      expect.objectContaining({ chains: PERP_CHAINS }),
    );
  });

  // -------------------------------------------------------------------------
  // 15. Social V1 chrome: ranking chip replaces the legacy filter row
  // -------------------------------------------------------------------------

  describe('Social V1 chrome', () => {
    const [alpha, beta, gamma] = mockLeaderboardTraders;

    beforeEach(() => {
      restoreDefaultLocalSocialProfile();
    });

    afterEach(() => {
      restoreDefaultLocalSocialProfile();
    });

    it('lands on every trader with the ranking chip and no legacy filter pills, and switches the ranking label to Volume', async () => {
      renderTopTradersViewWithProps({ useV1Filters: true });

      expect(await screen.findByText(alpha.name)).toBeOnTheScreen();
      expect(screen.getByText(beta.name)).toBeOnTheScreen();
      expect(screen.getByText(gamma.name)).toBeOnTheScreen();

      const rankingSelector = screen.getByTestId(
        TopTradersViewSelectorsIDs.RANKING_SELECTOR,
      );
      expect(rankingSelector).toHaveTextContent(
        strings('social_leaderboard.sort_filter.profit'),
      );
      expect(
        screen.queryByTestId(TopTradersViewSelectorsIDs.TYPE_SELECTOR),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(TopTradersViewSelectorsIDs.SORT_SELECTOR),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(TopTradersViewSelectorsIDs.TIMEFRAME_SELECTOR),
      ).not.toBeOnTheScreen();

      fireEvent.press(rankingSelector);
      fireEvent.press(
        screen.getByTestId(getRankingFilterOptionTestId('volume')),
      );

      await waitFor(() =>
        expect(
          screen.getByTestId(TopTradersViewSelectorsIDs.RANKING_SELECTOR),
        ).toHaveTextContent(strings('social_leaderboard.sort_filter.volume')),
      );
    });

    it('pins the viewer above the list and drops their duplicate row when their profile is on the leaderboard', async () => {
      const localProfile = getLocalSocialProfileSnapshot().profile;
      if (!localProfile) {
        throw new Error('Expected a default local social profile');
      }
      saveLocalSocialProfile({
        ...localProfile,
        profileId: beta.profileId,
        handle: beta.name,
        displayName: beta.name,
        linkedAccountAddress: beta.addresses[0],
      });
      renderTopTradersViewWithProps({ useV1Filters: true });

      // The viewer card renders synthetically while the page loads, so wait
      // for the ranked list before asserting the matched row.
      expect(await screen.findByText(alpha.name)).toBeOnTheScreen();
      const viewerCard = screen.getByTestId(
        TopTradersViewSelectorsIDs.VIEWER_CARD,
      );

      expect(within(viewerCard).getByText(beta.name)).toBeOnTheScreen();
      expect(
        within(viewerCard).getByTestId(`rank-medal-${beta.rank}`),
      ).toBeOnTheScreen();
      const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);
      const listedIds = (list.props.data as { id: string }[]).map(
        (trader) => trader.id,
      );
      expect(listedIds).toEqual([alpha.profileId, gamma.profileId]);
    });

    it('shows the viewer as an unranked card when their profile is not on the leaderboard', async () => {
      const localProfile = getLocalSocialProfileSnapshot().profile;
      if (!localProfile) {
        throw new Error('Expected a default local social profile');
      }
      saveLocalSocialProfile({
        ...localProfile,
        profileId: 'viewer-off-board',
        handle: 'viewer.eth',
        displayName: 'viewer.eth',
        linkedAccountAddress: '0x00000000000000000000000000000000000000ff',
      });
      renderTopTradersViewWithProps({ useV1Filters: true });

      expect(await screen.findByText(alpha.name)).toBeOnTheScreen();
      const viewerCard = screen.getByTestId(
        TopTradersViewSelectorsIDs.VIEWER_CARD,
      );

      expect(within(viewerCard).getByText('viewer.eth')).toBeOnTheScreen();
      expect(
        within(viewerCard).queryByTestId(/^rank-medal-/u),
      ).not.toBeOnTheScreen();
      const list = screen.getByTestId(TopTradersViewSelectorsIDs.TRADER_LIST);
      expect(list.props.data).toHaveLength(mockLeaderboardTraders.length);
    });

    it('narrows the list to perps traders when the shell applies a perps type filter', async () => {
      renderTopTradersViewWithProps({
        useV1Filters: true,
        v1AppliedFilters: { ...DEFAULT_FILTERS, type: 'perps' },
      });

      expect(await screen.findByText(gamma.name)).toBeOnTheScreen();

      expect(screen.queryByText(alpha.name)).not.toBeOnTheScreen();
      expect(screen.queryByText(beta.name)).not.toBeOnTheScreen();
    });
  });
});

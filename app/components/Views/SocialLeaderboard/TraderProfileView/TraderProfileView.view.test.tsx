/**
 * Component-view tests for TraderProfileView.
 *
 * Drives Engine.controllerMessenger → React Query → rendered profile. The
 * sibling unit file mocks `useTraderProfile` / `useTraderPositions`, so these
 * cases cover the load, follow, error, and position-open paths that mock
 * never reaches.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/TraderProfileView/TraderProfileView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import type {
  Position,
  TraderProfileResponse,
} from '@metamask/social-controllers';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { resetFollowToggleSharedStateForTests } from '../../../hooks/useFollowToggle';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  setupLeaderboardApiMock,
} from '../../../../../tests/component-view/api-mocking/socialLeaderboard';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  CV_TRADER_PROFILE_PARAMS,
  renderTraderProfileView,
} from '../../../../../tests/component-view/renderers/socialLeaderboard';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { TraderProfileViewSelectorsIDs } from './TraderProfileView.testIds';
import {
  getPositionRowFlagLabelTestId,
  getPositionRowSubtitleTestId,
  getPositionRowTestId,
} from './components/PositionRow.testIds';

const TRADER_ID = CV_TRADER_PROFILE_PARAMS.traderId;
const STARKBOT_SYMBOL = 'STARKBOT';
const PEPE_SYMBOL = 'PEPE';
const BLOCKED_SYMBOL = 'SCAM';

const traderProfile: TraderProfileResponse = {
  profile: {
    profileId: TRADER_ID,
    address: CV_TRADER_PROFILE_PARAMS.traderAddress,
    allAddresses: [CV_TRADER_PROFILE_PARAMS.traderAddress],
    name: 'alpha.eth',
    imageUrl: 'https://example.com/avatar1.png',
  },
  stats: {
    pnl30d: 40_000,
    winRate30d: 0.8,
    roiPercent30d: 2,
    tradeCount30d: 20,
    pnl7d: 20_610,
    winRate7d: 0.92,
    roiPercent7d: 1.5,
    tradeCount7d: 12,
    medianHoldMinutes: 90,
  },
  perChainBreakdown: {
    perChainPnl: {},
    perChainRoi: {},
    perChainVolume: {},
    perChainPnl7d: {},
    perChainRoi7d: {},
    perChainVolume7d: {},
  },
  socialHandles: {},
  followerCount: 48_707,
  followingCount: 12,
  copytradedAllTime: {
    count: 0,
    volumeUSD: 0,
    distinctActors: 0,
  },
};

const openPosition = (
  tokenSymbol: string,
  currentValueUSD: number,
  pnlPercent: number,
  flags?: Position['flags'],
): Position =>
  ({
    positionId: `${tokenSymbol}-base`,
    tokenSymbol,
    tokenName: tokenSymbol,
    tokenAddress: '0x123',
    chain: 'base',
    positionAmount: 1000,
    boughtUsd: 100,
    soldUsd: 0,
    realizedPnl: 0,
    costBasis: 100,
    trades: [],
    lastTradeAt: 1_700_000_000_000,
    currentValueUSD,
    pnlValueUsd: 10,
    pnlPercent,
    flags,
  }) as Position;

const starkbotPosition = openPosition(STARKBOT_SYMBOL, 2259.96, 182);
const pepePosition = openPosition(PEPE_SYMBOL, 110, 5);
const blockedPosition = openPosition(BLOCKED_SYMBOL, 50, -12, ['blocked']);

const waitForLoadedProfile = async () => {
  expect(
    await screen.findByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
  ).toBeOnTheScreen();
  expect(
    within(
      screen.getByTestId(TraderProfileViewSelectorsIDs.PROFILE_HEADER),
    ).getByText(traderProfile.profile.name),
  ).toBeOnTheScreen();
};

const renderProfile = (
  positions: Position[] = [starkbotPosition, pepePosition],
  options: Parameters<typeof renderTraderProfileView>[1] = {},
) => {
  setupLeaderboardApiMock({
    traderProfile,
    openPositions: positions,
    following: [],
  });
  return renderTraderProfileView([{ name: Routes.SOCIAL.POSITION }], options);
};

describeForPlatforms('TraderProfileView', () => {
  beforeEach(() => {
    resetFollowToggleSharedStateForTests();
  });

  afterEach(() => {
    clearLeaderboardApiMock();
    resetFollowToggleSharedStateForTests();
  });

  it('shows the loaded profile, headline stats, and every open position', async () => {
    renderProfile();

    await waitForLoadedProfile();
    expect(
      await screen.findByTestId(getPositionRowTestId(STARKBOT_SYMBOL)),
    ).toBeOnTheScreen();
    expect(
      await screen.findByTestId(getPositionRowTestId(PEPE_SYMBOL)),
    ).toBeOnTheScreen();

    const stats = screen.getByTestId(TraderProfileViewSelectorsIDs.STATS_ROW);
    expect(within(stats).getByText('92%')).toBeOnTheScreen();
    expect(within(stats).getByText('+$20,610')).toBeOnTheScreen();
    expect(
      within(stats).getByText(
        strings('social_leaderboard.trader_profile.hold_time_hours', {
          count: 1.5,
        }),
      ),
    ).toBeOnTheScreen();

    const starkbot = screen.getByTestId(getPositionRowTestId(STARKBOT_SYMBOL));
    expect(within(starkbot).getByText(STARKBOT_SYMBOL)).toBeOnTheScreen();
    expect(within(starkbot).getByText('$2,259.96')).toBeOnTheScreen();
    expect(within(starkbot).getByText('+182.00%')).toBeOnTheScreen();
    expect(
      within(starkbot).getByTestId(
        getPositionRowSubtitleTestId(STARKBOT_SYMBOL),
      ),
    ).toBeOnTheScreen();

    const pepe = screen.getByTestId(getPositionRowTestId(PEPE_SYMBOL));
    expect(within(pepe).getByText(PEPE_SYMBOL)).toBeOnTheScreen();
    expect(within(pepe).getByText('$110.00')).toBeOnTheScreen();
    expect(within(pepe).getByText('+5.00%')).toBeOnTheScreen();
  });

  it('follows the trader and flips the button to Following', async () => {
    renderProfile();

    await waitForLoadedProfile();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
      );
    });

    expect(
      within(
        screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
      ).getByText(strings('social_leaderboard.following')),
    ).toBeOnTheScreen();
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialController:followTrader',
      { targets: [TRADER_ID] },
    );
  });

  it('unfollows a trader the viewer already follows', async () => {
    renderProfile([starkbotPosition], {
      presetOptions: { followingProfileIds: [TRADER_ID] },
    });

    await waitForLoadedProfile();
    expect(
      within(
        screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
      ).getByText(strings('social_leaderboard.following')),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
      );
    });

    expect(
      within(
        screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
      ).getByText(strings('social_leaderboard.follow')),
    ).toBeOnTheScreen();
    expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
      'SocialController:unfollowTrader',
      { targets: [TRADER_ID] },
    );
  });

  it('shows the profile error and loads the trader after retry', async () => {
    setupLeaderboardApiMock({
      traderProfile,
      openPositions: [starkbotPosition],
      following: [],
      traderProfileFailuresBeforeSuccess: 1,
    });
    renderTraderProfileView();

    expect(
      await screen.findByText(
        strings('social_leaderboard.trader_profile.error_loading_profile'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText(strings('homepage.error.retry')));

    await waitForLoadedProfile();
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.trader_profile.error_loading_profile'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('opens the position screen when an open position row is pressed', async () => {
    renderProfile([starkbotPosition]);

    await waitForLoadedProfile();
    expect(
      await screen.findByTestId(getPositionRowTestId(STARKBOT_SYMBOL)),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(getPositionRowTestId(STARKBOT_SYMBOL)));

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.POSITION)),
    ).toBeOnTheScreen();
  });

  it('keeps a flagged position on the profile when its row is pressed', async () => {
    renderProfile([blockedPosition]);

    await waitForLoadedProfile();
    expect(
      await screen.findByTestId(getPositionRowFlagLabelTestId(BLOCKED_SYMBOL)),
    ).toBeOnTheScreen();
    const flaggedRow = screen.getByTestId(getPositionRowTestId(BLOCKED_SYMBOL));
    expect(
      within(flaggedRow).getByText(
        strings('social_leaderboard.position_flags.excluded'),
      ),
    ).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId(getPositionRowTestId(BLOCKED_SYMBOL)));
    });

    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.SOCIAL.POSITION)),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderProfileViewSelectorsIDs.FOLLOW_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(getPositionRowTestId(BLOCKED_SYMBOL)).props
        .accessibilityRole,
    ).toBeUndefined();
  });
});

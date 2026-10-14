/**
 * Component view tests for PerpsHomeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import type { ComponentType } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import {
  createEthMarketForViews,
  createFundedAccountForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsHomeView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
} from '../../Perps.testIds';
import { PerpsHomeSectionTestIds } from '../../components/PerpsHomeSection/PerpsHomeSection.testIds';
import { PerpsOutreachBannerSelectorsIDs } from '../../components/PerpsOutreachBanner';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import {
  clearPerpsOutreachApiMocks,
  setupPerpsOutreachApiMock,
} from '../../../../../../tests/component-view/api-mocking/perpsOutreach';
import {
  clearLeaderboardApiMock,
  getLeaderboardMessengerSpy,
  mockLeaderboardTraders,
  setupLeaderboardApiMock,
  type MockLeaderboardEntry,
} from '../../../../../../tests/component-view/api-mocking/socialLeaderboard';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import Routes from '../../../../../constants/navigation/Routes';
import { getTraderRowTestId } from '../../../../Views/Homepage/Sections/TopTraders/components/TraderRow.testIds';
import { mockPerpFeedItem } from '../../../SocialFeed/mocks/coreFeed.mock';
import { SocialFeedPostShellSelectorsIDs } from '../../../SocialFeed/components/SocialFeedPostShell.testIds';

const TIMEOUT_MS = 5000;

const eligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};

const ineligibleOverrides = {
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: false,
        isFirstTimeUser: { mainnet: false, testnet: false },
      },
    },
  },
};

describe('PerpsHomeView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupPerpsOutreachApiMock();
  });

  afterEach(() => {
    cleanup();
    clearPerpsOutreachApiMocks();
  });

  it('shows and dismisses an eligible Terminal outreach campaign', async () => {
    renderPerpsHomeView({
      overrides: eligibleOverrides,
    });

    expect(
      await screen.findByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PerpsOutreachBannerSelectorsIDs.CLOSE_BUTTON),
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsOutreachBannerSelectorsIDs.BANNER),
      ).not.toBeOnTheScreen();
    });
  });

  it('shows Add funds as the next action for a no-funds trader', async () => {
    const depositWithConfirmation = Engine.context.PerpsController
      .depositWithConfirmation as jest.Mock;

    renderPerpsHomeView({
      overrides: eligibleOverrides,
      streamOverrides: {
        account: createFundedAccountForViews('0'),
        positions: [],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    const addFundsButton = await screen.findByTestId(
      PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      {},
      { timeout: TIMEOUT_MS },
    );

    expect(
      screen.getByTestId(PerpsMarketBalanceActionsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(addFundsButton).toBeOnTheScreen();

    fireEvent.press(addFundsButton);

    await waitFor(() => {
      expect(depositWithConfirmation).toHaveBeenCalledWith({
        amount: undefined,
        placeOrder: false,
      });
    });
  });

  it('retries an order authentication failure and accepts an empty snapshot', async () => {
    const { stream } = renderPerpsHomeView({ overrides: eligibleOverrides });
    await screen.findByTestId(PerpsHomeViewSelectorsIDs.HOME_HEADING);

    act(() => {
      stream.emitOrdersError(new Error('Trading key unavailable'));
    });

    expect(
      await screen.findByTestId(PerpsHomeViewSelectorsIDs.ORDERS_ERROR),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(PerpsHomeViewSelectorsIDs.ORDERS_RETRY));
    expect(stream.getOrdersReconnectCount()).toBe(1);
    expect(stream.getFillsReconnectCount()).toBe(1);
    act(() => {
      stream.emitOrders([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.ORDERS_ERROR),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.ORDERS_RETRY),
      ).not.toBeOnTheScreen();
    });
  });

  it('retries an activity authentication failure and accepts an empty snapshot', async () => {
    const { stream } = renderPerpsHomeView({ overrides: eligibleOverrides });
    await screen.findByTestId(PerpsHomeViewSelectorsIDs.HOME_HEADING);

    act(() => {
      stream.emitFillsError(new Error('Trading key unavailable'));
    });

    const activityError = await screen.findByTestId(
      PerpsHomeViewSelectorsIDs.ACTIVITY_ERROR,
    );
    expect(
      screen.getByText(strings('perps.home.recent_activity')),
    ).toBeOnTheScreen();
    expect(
      within(activityError).getByText(
        strings('perps.home.activity_load_error'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(activityError).getByTestId(
        PerpsHomeViewSelectorsIDs.ACTIVITY_RETRY,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PerpsHomeViewSelectorsIDs.ACTIVITY_RETRY),
    );
    expect(stream.getFillsReconnectCount()).toBe(1);
    expect(stream.getOrdersReconnectCount()).toBe(1);
    act(() => {
      stream.emitFills([]);
    });

    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.ACTIVITY_ERROR),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.ACTIVITY_RETRY),
      ).not.toBeOnTheScreen();
    });
  });

  it('deposits from Add funds and reflects the updated Perps balance from the account stream', async () => {
    const depositWithConfirmation = Engine.context.PerpsController
      .depositWithConfirmation as jest.Mock;

    const { stream } = renderPerpsHomeView({
      overrides: eligibleOverrides,
      streamOverrides: {
        account: createFundedAccountForViews('100'),
        positions: [],
        orders: [],
        marketData: [createEthMarketForViews()],
      },
    });

    expect(
      await screen.findByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
        {},
        { timeout: TIMEOUT_MS },
      ),
    ).toHaveTextContent('$100');

    fireEvent.press(
      screen.getByTestId(
        PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(depositWithConfirmation).toHaveBeenCalledWith({
        amount: undefined,
        placeOrder: false,
      });
    });

    act(() => {
      stream.emitAccount(createFundedAccountForViews('180'));
    });

    await waitFor(() => {
      expect(
        screen.getByTestId(PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE),
      ).toHaveTextContent('$180');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Geo-block: ineligible user flows
  // ─────────────────────────────────────────────────────────────────────────

  describe('Geo-block: ineligible user flows', () => {
    let originalShowHeaderActionButtons: boolean;

    beforeEach(() => {
      originalShowHeaderActionButtons =
        HOME_SCREEN_CONFIG.ShowHeaderActionButtons;
      Object.assign(HOME_SCREEN_CONFIG, { ShowHeaderActionButtons: false });
    });

    afterEach(() => {
      Object.assign(HOME_SCREEN_CONFIG, {
        ShowHeaderActionButtons: originalShowHeaderActionButtons,
      });
    });

    it('geo-blocked user sees eligibility tooltip when pressing Add Funds on empty balance', async () => {
      // Arrange
      const depositWithConfirmation = Engine.context.PerpsController
        .depositWithConfirmation as jest.Mock;

      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('0'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Act – press Add Funds from the balance-actions card (empty-balance entry point)
      fireEvent.press(
        await screen.findByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.ADD_FUNDS_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // Assert – balance-actions geo-block tooltip appears; deposit never starts
      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsMarketBalanceActionsSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
          ),
        ).toBeOnTheScreen();
      });
      expect(depositWithConfirmation).not.toHaveBeenCalled();
    });

    it('geo-blocked funded-account user sees home-view eligibility tooltip when pressing footer Add Funds', async () => {
      // Arrange
      const depositWithConfirmation = Engine.context.PerpsController
        .depositWithConfirmation as jest.Mock;

      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Act – non-empty balance exposes the fixed footer; press its Add Funds button
      fireEvent.press(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.ADD_FUNDS_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // Assert – home-view eligibility modal appears (separate from the balance-actions one)
      await waitFor(() => {
        expect(
          screen.getByTestId(PerpsHomeViewSelectorsIDs.GEO_BLOCK_TOOLTIP),
        ).toBeOnTheScreen();
      });
      expect(depositWithConfirmation).not.toHaveBeenCalled();
    });

    it('withdraw is NOT geo-blocked for restricted users — withdrawal must never trigger the eligibility tooltip (TAT-2337)', async () => {
      // Arrange – restricted user with funds; withdraw should bypass the geo-block check
      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Act – press the footer Withdraw button (visible because balance is non-empty)
      fireEvent.press(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.WITHDRAW_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      // Assert – neither geo-block tooltip path may appear; withdrawal proceeds unblocked
      await waitFor(() => {
        expect(
          screen.queryByTestId(PerpsHomeViewSelectorsIDs.GEO_BLOCK_TOOLTIP),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByTestId(
            PerpsMarketBalanceActionsSelectorsIDs.GEO_BLOCK_BOTTOM_SHEET_TOOLTIP,
          ),
        ).not.toBeOnTheScreen();
      });
    });

    it('geo-blocked Close All triggers the close-all tooltip and NOT the add-funds eligibility modal', async () => {
      // Arrange – restricted user who has an open position
      renderPerpsHomeView({
        overrides: ineligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [createLongPositionForViews()],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Wait for the position card to confirm the positions section rendered
      await screen.findByTestId(
        `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`,
        {},
        { timeout: TIMEOUT_MS },
      );

      // Act – press the positions-section "⋯" action button (Close All entry point)
      fireEvent.press(
        screen.getByTestId(PerpsHomeSectionTestIds.ACTION_BUTTON),
      );

      // Assert – the close-all geo-block tooltip appears
      await waitFor(() => {
        expect(
          screen.getByTestId(
            PerpsHomeViewSelectorsIDs.CLOSE_ALL_GEO_BLOCK_TOOLTIP,
          ),
        ).toBeOnTheScreen();
      });

      // The add-funds eligibility tooltip must stay hidden — two distinct geo-block paths
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.GEO_BLOCK_TOOLTIP),
      ).not.toBeOnTheScreen();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Live stream updates
  // ─────────────────────────────────────────────────────────────────────────

  describe('Live stream updates', () => {
    let originalShowHeaderActionButtons: boolean;

    beforeEach(() => {
      originalShowHeaderActionButtons =
        HOME_SCREEN_CONFIG.ShowHeaderActionButtons;
      Object.assign(HOME_SCREEN_CONFIG, { ShowHeaderActionButtons: false });
    });

    afterEach(() => {
      Object.assign(HOME_SCREEN_CONFIG, {
        ShowHeaderActionButtons: originalShowHeaderActionButtons,
      });
    });

    it('position section appears when stream delivers first positions to an empty account', async () => {
      // Arrange – start with no positions (section is hidden)
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Position card must not be present yet
      expect(
        screen.queryByTestId(`${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`),
      ).not.toBeOnTheScreen();

      // Act – stream delivers the first position
      act(() => {
        stream.emitPositions([createLongPositionForViews()]);
      });

      // Assert – position card appears
      expect(
        await screen.findByTestId(
          `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
    });

    it('positions section PnL subtitle flips sign when account stream delivers negative unrealizedPnl', async () => {
      // Arrange – start with a position and a positive account P&L so the subtitle is visible
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: {
            ...createFundedAccountForViews('100'),
            unrealizedPnl: '50',
          },
          positions: [createLongPositionForViews()],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Wait for the position card, then verify the subtitle is shown with a positive value
      await screen.findByTestId(
        `${PerpsHomeViewSelectorsIDs.POSITION_CARD}-0`,
        {},
        { timeout: TIMEOUT_MS },
      );
      const pnlLabel = screen.getByTestId(
        PerpsHomeViewSelectorsIDs.POSITIONS_PNL_VALUE,
      );
      expect(pnlLabel).toHaveTextContent(/^\+/);

      // Act – account stream delivers an updated unrealizedPnl that is now negative
      act(() => {
        stream.emitAccount({
          ...createFundedAccountForViews('100'),
          unrealizedPnl: '-200',
        });
      });

      // Assert – the subtitle updates to reflect the loss
      await waitFor(
        () => {
          expect(
            screen.getByTestId(PerpsHomeViewSelectorsIDs.POSITIONS_PNL_VALUE),
          ).toHaveTextContent(/^-/);
        },
        { timeout: TIMEOUT_MS },
      );
    });

    it('balance display updates in real time when the account stream delivers a new total balance', async () => {
      // Arrange
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      // Wait for initial balance
      expect(
        await screen.findByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toHaveTextContent('$100');

      // Act – stream delivers updated account with a different balance
      act(() => {
        stream.emitAccount(createFundedAccountForViews('350'));
      });

      // Assert – balance display reflects the new value
      await waitFor(
        () => {
          expect(
            screen.getByTestId(
              PerpsMarketBalanceActionsSelectorsIDs.BALANCE_VALUE,
            ),
          ).toHaveTextContent('$350');
        },
        { timeout: TIMEOUT_MS },
      );
    });

    it('fixed footer disappears and re-appears as balance crosses zero threshold', async () => {
      // Arrange – start funded so the fixed footer (Withdraw / Add Funds) is visible
      const { stream } = renderPerpsHomeView({
        overrides: eligibleOverrides,
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: [createEthMarketForViews()],
        },
      });

      expect(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.FIXED_FOOTER,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      // Act – account balance drops to zero (all funds withdrawn)
      act(() => {
        stream.emitAccount(createFundedAccountForViews('0'));
      });

      // Assert – fixed footer is hidden because balance is empty
      await waitFor(
        () => {
          expect(
            screen.queryByTestId(PerpsHomeViewSelectorsIDs.FIXED_FOOTER),
          ).not.toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );

      // Act – funds arrive again
      act(() => {
        stream.emitAccount(createFundedAccountForViews('75'));
      });

      // Assert – fixed footer re-appears
      await waitFor(
        () => {
          expect(
            screen.getByTestId(PerpsHomeViewSelectorsIDs.FIXED_FOOTER),
          ).toBeOnTheScreen();
        },
        { timeout: TIMEOUT_MS },
      );
    });
  });

  describe('Social feed section', () => {
    const socialOverrides = {
      engine: {
        backgroundState: {
          ...eligibleOverrides.engine.backgroundState,
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              aiSocialLeaderboardEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
              aiSocialLeaderboardPerpsEnabled: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    };
    const buildPerpsTrader = (
      index: number,
      pnl7d: number,
    ): MockLeaderboardEntry => ({
      ...mockLeaderboardTraders[2],
      profileId: `trader-${index}`,
      addresses: [`0x${String(index).padStart(40, '0')}`],
      rank: index,
      name: `trader${index}.eth`,
      pnl7d,
    });
    const perpsTraders = [
      ...mockLeaderboardTraders,
      buildPerpsTrader(4, 300_000),
      buildPerpsTrader(5, 200_000),
      buildPerpsTrader(6, 1_000),
    ];
    const topFiveIds = [
      'trader-1',
      'trader-2',
      'trader-3',
      'trader-4',
      'trader-5',
    ];
    const feedItems = ['a', 'b', 'c', 'd'].map((id, index) =>
      mockPerpFeedItem({
        positionId: `perp-post-${id}`,
        timestamp: 1_700_000_500 - index,
        lastTradeAt: 1_700_000_500 - index,
      }),
    );

    const trendingPostIds = feedItems.map(
      (item) => `${item.positionId}-${item.timestamp}`,
    );

    const findSection = () =>
      screen.findByTestId(
        PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SECTION,
        {},
        { timeout: TIMEOUT_MS },
      );

    const openTopTraders = async () => {
      await findSection();
      fireEvent.press(
        screen.getByTestId(
          PerpsHomeViewSelectorsIDs.SOCIAL_FEED_TOP_TRADERS_PILL,
        ),
      );
    };

    afterEach(() => {
      clearLeaderboardApiMock();
    });

    it('shows 3 perps Trending posts by default when Perps social is on', async () => {
      setupLeaderboardApiMock({ perpsTraders, feedItems });

      renderPerpsHomeView({
        overrides: socialOverrides,
        socialEnabled: true,
      });

      await findSection();
      for (const id of trendingPostIds.slice(0, 3)) {
        expect(
          await screen.findByTestId(
            `${SocialFeedPostShellSelectorsIDs.CONTAINER}-${id}`,
            {},
            { timeout: TIMEOUT_MS },
          ),
        ).toBeOnTheScreen();
      }
      expect(
        screen.queryByTestId(
          `${SocialFeedPostShellSelectorsIDs.CONTAINER}-${trendingPostIds[3]}`,
        ),
      ).not.toBeOnTheScreen();
      expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
        'SocialService:fetchFeed',
        expect.objectContaining({ chains: ['eip155:999'], limit: 3 }),
      );
      expect(getLeaderboardMessengerSpy()).not.toHaveBeenCalledWith(
        'SocialService:fetchLeaderboard',
        expect.anything(),
      );
    });

    it('shows the top 5 perps traders after switching to Top traders', async () => {
      setupLeaderboardApiMock({ perpsTraders, feedItems });

      renderPerpsHomeView({
        overrides: socialOverrides,
        socialEnabled: true,
      });
      await openTopTraders();

      for (const id of topFiveIds) {
        expect(
          await screen.findByTestId(getTraderRowTestId(id)),
        ).toBeOnTheScreen();
      }
      expect(
        screen.queryByTestId(getTraderRowTestId('trader-6')),
      ).not.toBeOnTheScreen();
      expect(getLeaderboardMessengerSpy()).toHaveBeenCalledWith(
        'SocialService:fetchLeaderboard',
        { limit: 50, chains: ['hyperliquid'], sort: 'pnl' },
      );
    });

    it('does not fetch or show the Social feed when Perps social is off', async () => {
      setupLeaderboardApiMock({ perpsTraders, feedItems });

      renderPerpsHomeView({
        overrides: eligibleOverrides,
        socialEnabled: false,
      });

      expect(
        await screen.findByTestId(
          PerpsMarketBalanceActionsSelectorsIDs.CONTAINER,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.SOCIAL_FEED_SECTION),
      ).not.toBeOnTheScreen();
      expect(getLeaderboardMessengerSpy()).not.toHaveBeenCalledWith(
        'SocialService:fetchFeed',
        expect.anything(),
      );
    });

    it('shows the Top traders error state and recovers on retry', async () => {
      setupLeaderboardApiMock({
        perpsTraders,
        feedItems,
        leaderboardFailuresBeforeSuccess: 1,
      });

      renderPerpsHomeView({
        overrides: socialOverrides,
        socialEnabled: true,
      });
      await openTopTraders();

      fireEvent.press(
        await screen.findByText('Retry', {}, { timeout: TIMEOUT_MS }),
      );

      expect(
        await screen.findByTestId(getTraderRowTestId(topFiveIds[0])),
      ).toBeOnTheScreen();
    });

    it('opens the Social V1 trader profile when a trader row is pressed', async () => {
      setupLeaderboardApiMock({ perpsTraders, feedItems });

      renderPerpsHomeView({
        overrides: socialOverrides,
        socialEnabled: true,
        extraRoutes: [
          {
            name: Routes.SOCIAL.V1_PROFILE,
            Component: createRouteParamsProbe(
              Routes.SOCIAL.V1_PROFILE,
            ) as ComponentType<unknown>,
          },
        ],
      });
      await openTopTraders();

      const [alpha] = mockLeaderboardTraders;
      fireEvent.press(
        await screen.findByTestId(getTraderRowTestId(alpha.profileId)),
      );

      const probe = await screen.findByTestId(
        getRouteParamsProbeTestId(Routes.SOCIAL.V1_PROFILE),
      );
      expect(JSON.parse(probe.props.children as string)).toEqual({
        traderId: alpha.profileId,
        traderName: alpha.name,
        traderAddress: alpha.addresses[0],
        traderAvatarUri: alpha.imageUrl,
        source: 'perps_home',
        traderRank: 1,
      });
    });
  });
});

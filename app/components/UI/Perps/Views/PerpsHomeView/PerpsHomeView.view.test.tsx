/**
 * Component view tests for PerpsHomeView.
 * State-driven via Redux and stream overrides; no hook mocks.
 */
import '../../../../../../tests/component-view/mocks';

import React from 'react';
import { Text, View } from 'react-native';
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
import {
  MarketCategory,
  PERPS_EVENT_VALUE,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import {
  createBtcMarketForViews,
  createEthMarketForViews,
  createFundedAccountForViews,
  createHomeExploreAssignmentForViews,
  createLongPositionForViews,
} from '../../../../../../tests/component-view/fixtures/perpsViewFixtures';
import { renderPerpsHomeView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  getPerpsMarketRowItemSelector,
  PerpsHomeViewSelectorsIDs,
  PerpsMarketBalanceActionsSelectorsIDs,
  PerpsWatchlistSelectorsIDs,
} from '../../Perps.testIds';
import { clearExploreSessionTab } from '../../components/PerpsExploreSection/exploreSessionTab';
import { EXPLORE_WATCHLIST_TAB_ID } from '../../components/PerpsExploreSection/PerpsExploreSection.types';
import {
  PERPS_HOME_EXPLORE_AB_TEST_KEY,
  PerpsHomeExploreVariant,
} from '../../abTestConfig';
import { PerpsHomeSectionTestIds } from '../../components/PerpsHomeSection/PerpsHomeSection.testIds';
import { PerpsOutreachBannerSelectorsIDs } from '../../components/PerpsOutreachBanner';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import {
  clearPerpsOutreachApiMocks,
  setupPerpsOutreachApiMock,
} from '../../../../../../tests/component-view/api-mocking/perpsOutreach';

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
    clearExploreSessionTab();
    setupPerpsOutreachApiMock();
  });

  afterEach(() => {
    cleanup();
    clearExploreSessionTab();
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

  describe('home Explore table experiment', () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const WATCHLIST_ONLY_LABEL = 'showWatchlistOnly';
    const CRYPTO_TAB_ID = 'crypto';
    const STOCK_TAB_ID = 'stock';
    const PRE_IPO_TAB_ID = 'pre-ipo';
    const NEW_TAB_ID = 'new';

    const transactionActiveAbTests = [
      createActiveABTestAssignment(
        PERPS_HOME_EXPLORE_AB_TEST_KEY,
        PerpsHomeExploreVariant.Treatment,
      ),
    ];

    const btcMarket = createBtcMarketForViews();
    const appleMarket = createEthMarketForViews({
      symbol: 'AAPL',
      name: 'Apple',
      isHip3: true,
      marketType: MarketCategory.Stock,
      volume: '$1B',
      price: '$180.00',
    });
    const goldMarket = createEthMarketForViews({
      symbol: 'GOLD',
      name: 'Gold',
      isHip3: true,
      marketType: MarketCategory.Commodity,
      volume: '$800M',
      price: '$2,300.00',
    });
    const euroMarket = createEthMarketForViews({
      symbol: 'EUR',
      name: 'Euro',
      isHip3: true,
      marketType: MarketCategory.Forex,
      volume: '$600M',
      price: '$1.08',
    });
    const preIpoMarket = createEthMarketForViews({
      symbol: 'PRE',
      name: 'Pre IPO',
      isHip3: true,
      marketType: MarketCategory.PreIpo,
      volume: '$50M',
      price: '$20.00',
    });
    const stackedMarkets = [btcMarket, appleMarket, goldMarket, euroMarket];

    const exploreTab = (tabId: string) =>
      `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-tab-${tabId}`;
    const exploreListEmpty = `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-list-empty`;
    const stackedSectionIds = [
      PerpsHomeViewSelectorsIDs.EXPLORE_CRYPTO_SECTION,
      PerpsHomeViewSelectorsIDs.EXPLORE_STOCKS_SECTION,
      PerpsHomeViewSelectorsIDs.EXPLORE_COMMODITIES_SECTION,
      PerpsHomeViewSelectorsIDs.EXPLORE_FOREX_SECTION,
      PerpsWatchlistSelectorsIDs.SECTION,
      PerpsHomeViewSelectorsIDs.PRODUCTS_SECTION,
    ];

    const enabledFlag = (enabled: boolean) => ({
      enabled,
      minimumVersion: '0.0.0',
    });

    interface ExploreListRouteParams {
      defaultMarketTypeFilter?: string;
      showWatchlistOnly?: boolean;
      source?: string;
      transactionActiveAbTests?: { key: string; value: string }[];
    }

    interface ExploreDetailsRouteParams {
      market?: { symbol?: string };
      source?: string;
      source_section?: string;
      transactionActiveAbTests?: { key: string; value: string }[];
    }

    const ExploreMarketListProbe = (props: unknown) => {
      const params = (props as { route?: { params?: ExploreListRouteParams } })
        .route?.params;

      return (
        <View>
          <Text testID={`route-${Routes.PERPS.MARKET_LIST}`}>
            {params?.defaultMarketTypeFilter ?? ''}
          </Text>
          <Text>
            {params?.showWatchlistOnly ? WATCHLIST_ONLY_LABEL : 'browse-all'}
          </Text>
          <Text>{params?.source ?? ''}</Text>
          <Text>{JSON.stringify(params?.transactionActiveAbTests ?? [])}</Text>
        </View>
      );
    };

    const ExploreMarketDetailsProbe = (props: unknown) => {
      const params = (
        props as { route?: { params?: ExploreDetailsRouteParams } }
      ).route?.params;

      return (
        <View>
          <Text testID={`route-${Routes.PERPS.MARKET_DETAILS}`}>
            {params?.market?.symbol ?? ''}
          </Text>
          <Text>{params?.source ?? ''}</Text>
          <Text>{params?.source_section ?? ''}</Text>
          <Text>{JSON.stringify(params?.transactionActiveAbTests ?? [])}</Text>
        </View>
      );
    };

    const renderExploreHome = ({
      variant,
      markets,
      watchlistSymbols = [],
      productsEnabled = false,
      watchlistEnabled = true,
      terminalEnabled = false,
      deferMarkets = false,
      withRoutes = false,
      forwardAbTests = false,
    }: {
      variant: PerpsHomeExploreVariant;
      markets: PerpsMarketData[];
      watchlistSymbols?: string[];
      productsEnabled?: boolean;
      watchlistEnabled?: boolean;
      terminalEnabled?: boolean;
      deferMarkets?: boolean;
      withRoutes?: boolean;
      forwardAbTests?: boolean;
    }) =>
      renderPerpsHomeView({
        initialParams: forwardAbTests
          ? { transactionActiveAbTests }
          : undefined,
        overrides: {
          engine: {
            backgroundState: {
              ...eligibleOverrides.engine.backgroundState,
              PerpsController: {
                ...eligibleOverrides.engine.backgroundState.PerpsController,
                watchlistMarkets: { testnet: [], mainnet: watchlistSymbols },
              },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  ...createHomeExploreAssignmentForViews(variant).engine
                    .backgroundState.RemoteFeatureFlagController
                    .remoteFeatureFlags,
                  perpsProductsEnabled: enabledFlag(productsEnabled),
                  perpsWatchlistV2Enabled: enabledFlag(watchlistEnabled),
                  perpsTerminalBackendEnabled: enabledFlag(terminalEnabled),
                },
              },
            },
          },
        },
        streamOverrides: {
          account: createFundedAccountForViews('100'),
          positions: [],
          orders: [],
          marketData: deferMarkets ? null : markets,
        },
        extraRoutes: withRoutes
          ? [
              {
                name: Routes.PERPS.MARKET_LIST,
                Component: ExploreMarketListProbe,
                mount: 'perps-root' as const,
              },
              {
                name: Routes.PERPS.MARKET_DETAILS,
                Component: ExploreMarketDetailsProbe,
                mount: 'perps-root' as const,
              },
            ]
          : undefined,
      });

    const expectTabSelected = (tabId: string, selected: boolean) => {
      expect(
        screen.getByTestId(exploreTab(tabId)).props.accessibilityState,
      ).toMatchObject({ selected });
    };

    it('keeps the stacked sections when the assignment is control', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Control,
        markets: stackedMarkets,
        watchlistSymbols: [btcMarket.symbol],
        productsEnabled: true,
      });

      expect(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.EXPLORE_CRYPTO_SECTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      stackedSectionIds.forEach((sectionId) => {
        expect(screen.getByTestId(sectionId)).toBeOnTheScreen();
      });
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.EXPLORE_SECTION),
      ).toBeNull();
    });

    it('replaces the stacked sections with Explore in treatment', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: stackedMarkets,
        watchlistSymbols: [btcMarket.symbol],
        productsEnabled: true,
      });

      expect(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.EXPLORE_SECTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      stackedSectionIds.forEach((sectionId) => {
        expect(screen.queryByTestId(sectionId)).toBeNull();
      });
    });

    it('shows a skeleton and does not select Crypto while markets are loading', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: stackedMarkets,
        watchlistSymbols: [btcMarket.symbol],
        deferMarkets: true,
      });

      expect(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.EXPLORE_SECTION,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId(exploreTab(CRYPTO_TAB_ID))).toBeNull();
      expect(
        screen.queryByTestId(exploreTab(EXPLORE_WATCHLIST_TAB_ID)),
      ).toBeNull();
      expect(
        screen.queryByTestId(
          `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-see-more`,
        ),
      ).toBeNull();
    });

    it('selects Watchlist after load when the watchlist has a market', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, appleMarket],
        watchlistSymbols: [btcMarket.symbol],
      });

      expect(
        await screen.findByTestId(
          exploreTab(EXPLORE_WATCHLIST_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      expectTabSelected(EXPLORE_WATCHLIST_TAB_ID, true);
      expectTabSelected(CRYPTO_TAB_ID, false);
      expect(
        screen.getByTestId(
          getPerpsMarketRowItemSelector.rowItem(btcMarket.symbol),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getPerpsMarketRowItemSelector.rowItem(appleMarket.symbol),
        ),
      ).toBeNull();
    });

    it('selects Crypto when the watchlist is empty', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, appleMarket],
      });

      expect(
        await screen.findByTestId(
          exploreTab(CRYPTO_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      expectTabSelected(CRYPTO_TAB_ID, true);
      expect(
        screen.getByTestId(
          getPerpsMarketRowItemSelector.rowItem(btcMarket.symbol),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getPerpsMarketRowItemSelector.rowItem(appleMarket.symbol),
        ),
      ).toBeNull();
    });

    it('shows only the volume leaders when Crypto has more markets than the preview cap', async () => {
      const previewLimit = HOME_SCREEN_CONFIG.TrendingMarketsLimit;
      const markets = Array.from({ length: previewLimit + 1 }, (_, index) =>
        createEthMarketForViews({
          symbol: `C${index}`,
          name: `Crypto ${index}`,
          volume: `$${previewLimit + 1 - index}B`,
          price: '$1.00',
        }),
      );
      const hiddenMarket = markets[markets.length - 1];

      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets,
      });

      expect(
        await screen.findByTestId(
          getPerpsMarketRowItemSelector.rowItem(markets[0].symbol),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      markets.slice(0, previewLimit).forEach((market) => {
        expect(
          screen.getByTestId(
            getPerpsMarketRowItemSelector.rowItem(market.symbol),
          ),
        ).toBeOnTheScreen();
      });
      expect(
        screen.queryByTestId(
          getPerpsMarketRowItemSelector.rowItem(hiddenMarket.symbol),
        ),
      ).toBeNull();
    });

    it('hides the Watchlist tab and defaults to Crypto when watchlist is disabled', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket],
        watchlistSymbols: [btcMarket.symbol],
        watchlistEnabled: false,
      });

      expect(
        await screen.findByTestId(
          exploreTab(CRYPTO_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      expect(
        screen.queryByTestId(exploreTab(EXPLORE_WATCHLIST_TAB_ID)),
      ).toBeNull();
      expectTabSelected(CRYPTO_TAB_ID, true);
    });

    it('hides product-only categories when the products flag is off', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, appleMarket, preIpoMarket],
        productsEnabled: false,
      });

      expect(
        await screen.findByTestId(
          exploreTab(CRYPTO_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      expect(screen.getByTestId(exploreTab(STOCK_TAB_ID))).toBeOnTheScreen();
      expect(screen.queryByTestId(exploreTab(PRE_IPO_TAB_ID))).toBeNull();
    });

    it('keeps an explicit tab for the rest of the session', async () => {
      const first = renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, appleMarket],
      });

      await userEvent.press(
        await screen.findByTestId(
          exploreTab(STOCK_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        screen.getByTestId(
          getPerpsMarketRowItemSelector.rowItem(appleMarket.symbol),
        ),
      ).toBeOnTheScreen();

      first.unmount();

      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, appleMarket],
      });

      expect(
        await screen.findByTestId(
          exploreTab(STOCK_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expectTabSelected(STOCK_TAB_ID, true);
      expectTabSelected(CRYPTO_TAB_ID, false);

      clearExploreSessionTab();
      cleanup();

      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, appleMarket],
      });

      expect(
        await screen.findByTestId(
          exploreTab(CRYPTO_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expectTabSelected(CRYPTO_TAB_ID, true);
    });

    it('opens the market list for the selected category from the header and See more', async () => {
      const headerVisit = renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket],
        withRoutes: true,
      });

      await userEvent.press(
        await screen.findByTestId(
          `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-header`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        await screen.findByTestId(
          `route-${Routes.PERPS.MARKET_LIST}`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(CRYPTO_TAB_ID)).toBeOnTheScreen();
      expect(screen.getByText('browse-all')).toBeOnTheScreen();
      expect(
        screen.getByText(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME),
      ).toBeOnTheScreen();
      expect(screen.getByText('[]')).toBeOnTheScreen();

      headerVisit.unmount();

      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket],
        withRoutes: true,
      });

      await userEvent.press(
        await screen.findByTestId(
          `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-see-more`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        await screen.findByTestId(
          `route-${Routes.PERPS.MARKET_LIST}`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(CRYPTO_TAB_ID)).toBeOnTheScreen();
      expect(
        screen.getByText(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME),
      ).toBeOnTheScreen();
    });

    it('opens the watchlist market list from See more', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket],
        watchlistSymbols: [btcMarket.symbol],
        withRoutes: true,
      });

      await userEvent.press(
        await screen.findByTestId(
          `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-see-more`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        await screen.findByTestId(
          `route-${Routes.PERPS.MARKET_LIST}`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(WATCHLIST_ONLY_LABEL)).toBeOnTheScreen();
      expect(screen.queryByText(CRYPTO_TAB_ID)).toBeNull();
      expect(
        screen.getByText(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME),
      ).toBeOnTheScreen();
    });

    it('forwards transactionActiveAbTests and opens market details', async () => {
      const headerVisit = renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket],
        withRoutes: true,
        forwardAbTests: true,
      });

      await userEvent.press(
        await screen.findByTestId(
          `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-header`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        await screen.findByText(
          JSON.stringify(transactionActiveAbTests),
          {},
          {
            timeout: TIMEOUT_MS,
          },
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(CRYPTO_TAB_ID)).toBeOnTheScreen();

      headerVisit.unmount();

      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket],
        withRoutes: true,
        forwardAbTests: true,
      });

      await userEvent.press(
        await screen.findByTestId(
          getPerpsMarketRowItemSelector.rowItem(btcMarket.symbol),
          {},
          { timeout: TIMEOUT_MS },
        ),
      );

      expect(
        await screen.findByTestId(
          `route-${Routes.PERPS.MARKET_DETAILS}`,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText(btcMarket.symbol)).toBeOnTheScreen();
      expect(
        screen.getByText(PERPS_EVENT_VALUE.SOURCE.PERPS_HOME),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(PERPS_EVENT_VALUE.SOURCE_SECTION.CRYPTO),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(JSON.stringify(transactionActiveAbTests)),
      ).toBeOnTheScreen();
    });

    it('renders nothing when there are no tabs after markets load', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [],
        watchlistEnabled: false,
      });

      expect(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.EXPLORE_SECTION),
      ).toBeNull();
    });

    it('shows the empty Watchlist when it is the only tab', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [],
        watchlistEnabled: true,
      });

      expect(
        await screen.findByTestId(
          exploreTab(EXPLORE_WATCHLIST_TAB_ID),
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();

      expectTabSelected(EXPLORE_WATCHLIST_TAB_ID, true);
      expect(screen.getByTestId(exploreListEmpty)).toBeOnTheScreen();
      expect(
        screen.getByText(strings('perps.no_favorites_found')),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(
          `${PerpsHomeViewSelectorsIDs.EXPLORE_SECTION}-see-more`,
        ),
      ).toBeOnTheScreen();
    });

    it('lists New rows by listedAt, not isNewMarket', async () => {
      const now = Date.now();
      const recentUnflagged = createEthMarketForViews({
        symbol: 'NEW1',
        name: 'Recent',
        isHip3: true,
        isNewMarket: false,
        marketType: MarketCategory.Stock,
        listedAt: now - 5 * DAY_MS,
        volume: '$10M',
        price: '$10.00',
      });
      const flaggedButOld = createEthMarketForViews({
        symbol: 'OLD1',
        name: 'Old flag',
        isHip3: true,
        isNewMarket: true,
        marketType: MarketCategory.Stock,
        listedAt: now - 40 * DAY_MS,
        volume: '$9B',
        price: '$9.00',
      });

      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [btcMarket, recentUnflagged, flaggedButOld],
        productsEnabled: true,
        terminalEnabled: true,
      });

      await userEvent.press(
        await screen.findByTestId(
          exploreTab(NEW_TAB_ID),
          {},
          {
            timeout: TIMEOUT_MS,
          },
        ),
      );

      expect(
        screen.getByTestId(
          getPerpsMarketRowItemSelector.rowItem(recentUnflagged.symbol),
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(
          getPerpsMarketRowItemSelector.rowItem(flaggedButOld.symbol),
        ),
      ).toBeNull();
      expect(
        screen.queryByTestId(
          getPerpsMarketRowItemSelector.rowItem(btcMarket.symbol),
        ),
      ).toBeNull();
    });

    it('hides Explore in treatment when every market is in a gated category', async () => {
      renderExploreHome({
        variant: PerpsHomeExploreVariant.Treatment,
        markets: [preIpoMarket],
        productsEnabled: false,
        watchlistEnabled: false,
      });

      expect(
        await screen.findByTestId(
          PerpsHomeViewSelectorsIDs.BACK_HOME_BUTTON,
          {},
          { timeout: TIMEOUT_MS },
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.EXPLORE_SECTION),
      ).toBeNull();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.EXPLORE_CRYPTO_SECTION),
      ).toBeNull();
      expect(
        screen.queryByTestId(PerpsHomeViewSelectorsIDs.EXPLORE_STOCKS_SECTION),
      ).toBeNull();
    });
  });
});

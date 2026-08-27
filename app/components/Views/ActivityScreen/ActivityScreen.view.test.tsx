import '../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { updateBgState } from '../../../core/redux/slices/engine';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderActivityScreenView,
  renderActivityScreenViewWithRoutes,
  ActivityDetailsWithProviders,
} from '../../../../tests/component-view/renderers/activity';
import {
  ACTIVITY_CV_ACCOUNT,
  ACTIVITY_CV_NFT_COLLECTION_NAME,
  ACTIVITY_CV_NFT_CONTRACT,
  ACTIVITY_CV_PREDICT_MARKET_TITLE,
  ACTIVITY_CV_RAMP_BUY_TX_HASH,
  ACTIVITY_CV_RAMP_SELL_TX_HASH,
  ACTIVITY_CV_RECIPIENT,
  ACTIVITY_CV_PERPS_DEPOSIT_HASH,
  ACTIVITY_CV_PERPS_WITHDRAWAL_HASH,
  LINEA_ACTIVITY_HASH,
  MAINNET_ACTIVITY_HASH,
  activityCvBridgeHistoryEntry,
  activityCvBridgeMonToBaseHistoryEntry,
  activityCvCrossChainSwapBridgeHistoryEntry,
  activityCvPendingBridgeMonToBaseHistoryEntry,
  activityCvPerpsCanceledTakeProfitRowHash,
  activityCvPerpsFundingRowHash,
  activityCvPerpsTradeRowHash,
  activityLineaNetworkOverride,
  activityMonToBaseTokenRatesOverride,
  activityMonadBaseNetworkOverride,
  activityPerpsTradingEnabledFlag,
  activityPredictTradingEnabledFlag,
  buildActivityCvPerpsOverviewEngineSeed,
  buildActivityCvRampBuyMusdOrder,
  buildActivityCvRampSellEthOrder,
  buildConfirmedLocalBridgeMonToBaseTransaction,
  buildConfirmedLocalBridgeTransaction,
  buildConfirmedLocalContractInteractionTransaction,
  buildConfirmedLocalCrossChainSwapTransaction,
  buildConfirmedLocalPredictDepositTransaction,
  buildConfirmedLocalPredictWithdrawTransaction,
  buildConfirmedLocalSendTransaction,
  buildConfirmedLocalUsdcApproveTransaction,
  buildConfirmedLocalUsdcIncreaseAllowanceTransaction,
  buildConfirmedLocalUsdcRevokeTransaction,
  buildConfirmedLocalUsdcSendTransaction,
  buildConfirmedLocalUsdcUnlimitedApproveTransaction,
  buildPendingLocalBridgeMonToBaseTransaction,
  buildPredictBuyActivity,
  buildPredictClaimActivity,
  buildPredictSellActivity,
  initialStateActivityWithAccountsApi,
  initialStateActivityWithLocalTransactions,
  initialStateActivityWithPerpsDetails,
  initialStateActivityWithRampOrders,
} from '../../../../tests/component-view/presets/activity';
import {
  clearAccountsTransactionsApiMocks,
  setupAccountsTransactionsApiMock,
} from '../../../../tests/component-view/api-mocking/accounts-transactions';
import { strings } from '../../../../locales/i18n';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import { ACTIVITY_TYPE_FILTER_LABEL_KEY } from './components/ActivityTypeFilterSheet';
import { PERPS_ACTIVITY_FILTER_LABEL_KEY } from './components/PerpsActivityFilterSheet';
import { ActivityTypeFilter, PerpsActivityFilter } from './types';

// Details testIDs mirrored locally so this route suite does not import from the
// sibling ActivityDetails route (ADR 0020).
const ACTIVITY_DETAILS_SCREEN = 'activity-details-screen';
const ACTIVITY_DETAILS_AMOUNT_HEADER = 'activity-details-amount-header';
const ACTIVITY_DETAILS_STATUS_PILL = 'activity-details-status-pill';
const ACTIVITY_DETAILS_NETWORK_ROW = 'activity-details-network-row';
const ACTIVITY_DETAILS_FEE_ROW = 'activity-details-fee-row';
const ACTIVITY_DETAILS_TOTAL_ROW = 'activity-details-total-row';

const monToBaseBridgeState = (
  transaction: ReturnType<typeof buildPendingLocalBridgeMonToBaseTransaction>,
  historyEntry:
    | typeof activityCvPendingBridgeMonToBaseHistoryEntry
    | typeof activityCvBridgeMonToBaseHistoryEntry,
) =>
  initialStateActivityWithLocalTransactions([transaction])
    .withRemoteFeatureFlags({
      // List redesign + details redesign (both required for list → ActivityDetails nav).
      tmcuActivityRedesignEnabled: true,
      tmcuTransactionsRedesignEnabled: true,
    })
    .withOverrides(activityMonadBaseNetworkOverride)
    .withOverrides(activityMonToBaseTokenRatesOverride)
    .withOverrides({
      engine: {
        backgroundState: {
          PreferencesController: {
            privacyMode: false,
          },
          BridgeStatusController: {
            txHistory: {
              [transaction.id]: historyEntry,
            },
          },
        },
      },
    } as never)
    .build();

// Row testIDs mirror ActivityListItemRow markup. Defined locally so this route
// suite does not import from the sibling ActivityList route (ADR 0020).
const activityListRowItemTestId = (index: number): string =>
  `transaction-item-${index}`;
const activityListRowTitleTestId = (hash: string): string =>
  `activity-title-${hash}`;
const activityListRowSubtitleTestId = (hash: string): string =>
  `activity-subtitle-${hash}`;
const activityListRowPrimaryAmountTestId = (hash: string): string =>
  `activity-primary-amount-${hash}`;
const activityListRowSecondaryAmountTestId = (hash: string): string =>
  `activity-secondary-amount-${hash}`;
const activityListRowAvatarSingleTestId = (hash: string): string =>
  `activity-row-avatar-single-${hash}`;
const activityListRowAvatarStackTestId = (hash: string): string =>
  `activity-row-avatar-stack-${hash}`;
// Container wraps the a11y-hidden spinner (PendingActivityListItemRow).
const activityListRowPendingSpinnerTestId = (hash: string): string =>
  `activity-pending-spinner-container-${hash}`;

/** Patch Engine.state then UPDATE_BG_STATE so Redux selectors see live controller updates. */
const syncEngineControllerState = (
  store: ReturnType<typeof renderActivityScreenViewWithRoutes>['store'],
  key: 'TransactionController' | 'BridgeStatusController',
  patch: Record<string, unknown>,
) => {
  const engineWithState = Engine as unknown as {
    state?: Record<string, unknown>;
  };
  const backgroundState = store.getState().engine.backgroundState as Record<
    string,
    unknown
  >;
  const existing =
    (backgroundState[key] as Record<string, unknown> | undefined) ?? {};
  const existingEngine =
    (engineWithState.state?.[key] as Record<string, unknown> | undefined) ?? {};

  engineWithState.state = {
    ...(engineWithState.state ?? {}),
    [key]: {
      ...existing,
      ...existingEngine,
      ...patch,
    },
  };

  store.dispatch(updateBgState({ key }));
};

/** Trade fills append `-${index}` in transformFillsToTransactions. */
const activityListRowTitleTestIdPattern = (hashPrefix: string): RegExp =>
  new RegExp(`^activity-title-${hashPrefix}-\\d+$`);
const activityListRowSubtitleTestIdPattern = (hashPrefix: string): RegExp =>
  new RegExp(`^activity-subtitle-${hashPrefix}-\\d+$`);
const activityListRowPrimaryAmountTestIdPattern = (
  hashPrefix: string,
): RegExp => new RegExp(`^activity-primary-amount-${hashPrefix}-\\d+$`);
const activityListRowSecondaryAmountTestIdPattern = (
  hashPrefix: string,
): RegExp => new RegExp(`^activity-secondary-amount-${hashPrefix}-\\d+$`);

const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const optionTestId = (filter: ActivityTypeFilter) =>
  `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`;

const perpsOptionTestId = (filter: PerpsActivityFilter) =>
  `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`;

const networkOptionTestId = (caipChainId: string) =>
  `${ActivityScreenSelectorsIDs.NETWORK_FILTER_OPTION_PREFIX}${caipChainId}`;

// Chips now show plain value labels (no "Types:"/"Network:" prefix).
const selectedTypeFilterLabel = (filter: ActivityTypeFilter) =>
  strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter]);

const perpsFilterLabel = (filter: PerpsActivityFilter) =>
  strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter]);

const emptyActivityStateWithGeo = () =>
  initialStateActivityWithAccountsApi().withOverrides({
    engine: {
      backgroundState: {
        GeolocationController: {
          location: 'us-ca',
        },
      },
    },
  } as never);

const emptyActivityStateFunded = () =>
  initialStateActivityWithAccountsApi().withOverrides({
    engine: {
      backgroundState: {
        TokenBalancesController: {
          tokenBalances: {
            [ACTIVITY_CV_ACCOUNT]: {
              '0x1': {
                [USDC_MAINNET]: '0x5f5e100', // 100 USDC
              },
            },
          },
        },
      },
    },
  } as never);

describeForPlatforms('ActivityScreen', () => {
  it('updates the selected type filter through the real screen controls', async () => {
    const { getByTestId, getAllByText, findByTestId } =
      renderActivityScreenView();

    // The search input is temporarily commented out — TODO(activity-redesign):
    // restore the search-typing assertion with the unified list + filtering.
    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByTestId(optionTestId(ActivityTypeFilter.MetamaskCard)),
    );

    // The label renders on both the in-list chip and its pinned copy.
    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.MetamaskCard))
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it('pre-selects the Type filter from the initialTypeFilter route param', async () => {
    const { getAllByText } = renderActivityScreenView({
      params: { initialTypeFilter: ActivityTypeFilter.Perps },
    });

    // The Perps chip label renders (in-list chip + its pinned copy) without any
    // user interaction, proving the route param drove the initial filter.
    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Perps)).length,
      ).toBeGreaterThan(0);
    });
  });

  it('pre-selects the Perps sub-filter from the initialPerpsFilter route param', async () => {
    const { getAllByText } = renderActivityScreenView({
      params: {
        initialTypeFilter: ActivityTypeFilter.Perps,
        initialPerpsFilter: PerpsActivityFilter.Deposits,
      },
    });

    // Both the Perps type chip and the Deposits sub-filter chip render without
    // any user interaction, proving the route params drove the initial filters.
    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Perps)).length,
      ).toBeGreaterThan(0);
      expect(
        getAllByText(perpsFilterLabel(PerpsActivityFilter.Deposits)).length,
      ).toBeGreaterThan(0);
    });
  });

  it('does not clobber a manual filter change after consuming the route param', async () => {
    const { getByTestId, getAllByText, findByTestId } =
      renderActivityScreenView({
        params: { initialTypeFilter: ActivityTypeFilter.Perps },
      });

    // Starts on Perps (from the param).
    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Perps)).length,
      ).toBeGreaterThan(0);
    });

    // User manually switches to MetaMask Card.
    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(
      await findByTestId(optionTestId(ActivityTypeFilter.MetamaskCard)),
    );

    // The re-apply effect is keyed on the param value (which didn't change), so
    // the manual selection sticks instead of snapping back to Perps.
    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.MetamaskCard))
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it('maps the legacy redirectToPerpsTransactions param to the Perps filter', async () => {
    const { getAllByText } = renderActivityScreenView({
      params: { redirectToPerpsTransactions: true },
    });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Perps)).length,
      ).toBeGreaterThan(0);
    });
  });

  it('updates the selected network filter through the real network sheet', async () => {
    const { getByTestId, getAllByText, findByText } = renderActivityScreenView({
      overrides: activityLineaNetworkOverride,
    });

    fireEvent.press(
      getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
    );
    fireEvent.press(await findByText('Linea'));

    // The label renders on both the in-list chip and its pinned copy.
    await waitFor(() => {
      expect(getAllByText('Linea').length).toBeGreaterThan(0);
    });
  });

  it('filters activity rows when switching between Ethereum and Linea networks', async () => {
    setupAccountsTransactionsApiMock([]);

    try {
      const mainnetTx = buildConfirmedLocalSendTransaction({
        id: 'activity-cv-mainnet-filter-send',
        hash: MAINNET_ACTIVITY_HASH,
      });
      const lineaTx = buildConfirmedLocalSendTransaction({
        id: 'activity-cv-linea-filter-send',
        hash: LINEA_ACTIVITY_HASH,
        chainId: '0xe708',
      });
      const state = initialStateActivityWithLocalTransactions([
        mainnetTx,
        lineaTx,
      ])
        .withOverrides(activityLineaNetworkOverride)
        .build();

      const { getByTestId, findByTestId, queryByTestId } =
        renderActivityScreenView({ state });

      fireEvent.press(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      );
      fireEvent.press(await findByTestId(networkOptionTestId('eip155:1')));

      await waitFor(() => {
        expect(
          getByTestId(activityListRowTitleTestId(MAINNET_ACTIVITY_HASH)),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(activityListRowTitleTestId(LINEA_ACTIVITY_HASH)),
        ).not.toBeOnTheScreen();
      });

      fireEvent.press(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      );
      fireEvent.press(await findByTestId(networkOptionTestId('eip155:59144')));

      await waitFor(() => {
        expect(
          getByTestId(activityListRowTitleTestId(LINEA_ACTIVITY_HASH)),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(activityListRowTitleTestId(MAINNET_ACTIVITY_HASH)),
        ).not.toBeOnTheScreen();
      });

      fireEvent.press(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      );
      fireEvent.press(await findByTestId(networkOptionTestId('eip155:1')));

      await waitFor(() => {
        expect(
          getByTestId(activityListRowTitleTestId(MAINNET_ACTIVITY_HASH)),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(activityListRowTitleTestId(LINEA_ACTIVITY_HASH)),
        ).not.toBeOnTheScreen();
      });
    } finally {
      clearAccountsTransactionsApiMocks();
    }
  });

  it('removes the network chip and shows the Perps sub-filter when Perps is selected', async () => {
    const { getByTestId, queryByTestId, findByTestId } =
      renderActivityScreenView();

    // Network chip is present by default (type filter is Transactions); the
    // Perps sub-filter chip is not.
    expect(
      getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP),
    ).toBeNull();

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(await findByTestId(optionTestId(ActivityTypeFilter.Perps)));

    // The network chip is removed (not disabled) and the Perps sub-filter
    // chip takes its place, defaulting to "Trades".
    await waitFor(() => {
      expect(
        queryByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      ).toBeNull();
    });
    expect(
      getByTestId(ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP),
    ).toBeOnTheScreen();
  });

  it('updates the Perps sub-filter label through the perps sheet', async () => {
    const { getByTestId, getAllByText, findByTestId } =
      renderActivityScreenView();

    // Switch to Perps so the sub-filter chip appears (default "Trades").
    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(await findByTestId(optionTestId(ActivityTypeFilter.Perps)));

    const perpsChip = await findByTestId(
      ActivityScreenSelectorsIDs.PERPS_FILTER_CHIP,
    );
    fireEvent.press(perpsChip);

    fireEvent.press(
      await findByTestId(perpsOptionTestId(PerpsActivityFilter.Deposits)),
    );

    await waitFor(() => {
      expect(
        getAllByText(perpsFilterLabel(PerpsActivityFilter.Deposits)).length,
      ).toBeGreaterThan(0);
    });
  });

  it('navigates back to home tabs when opened as the root activity route', async () => {
    const { getByTestId, findByTestId } = renderActivityScreenViewWithRoutes({
      extraRoutes: [{ name: Routes.HOME_TABS }],
    });

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.BACK_BUTTON));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — empty state', () => {
  beforeEach(() => {
    setupAccountsTransactionsApiMock([]);
  });

  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('shows unfunded Transactions empty state and Add funds opens ramp token selection', async () => {
    const unfundedDescription = strings(
      'activity_view.empty_state.transactions_unfunded.description',
    );
    const addFundsLabel = strings(
      'activity_view.empty_state.transactions_unfunded.action',
    );

    const { getAllByText, findByTestId, findByText } =
      renderActivityScreenViewWithRoutes({
        state: emptyActivityStateWithGeo().build(),
        extraRoutes: [{ name: Routes.RAMP.TOKEN_SELECTION }],
      });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(await findByText(unfundedDescription)).toBeOnTheScreen();

    fireEvent.press(await findByText(addFundsLabel));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.RAMP.TOKEN_SELECTION)),
    ).toBeOnTheScreen();
  });

  it('shows funded Transactions empty state and Swap tokens opens bridge', async () => {
    const fundedDescription = strings(
      'activity_view.empty_state.transactions_funded.description',
    );
    const swapTokensLabel = strings(
      'activity_view.empty_state.transactions_funded.action',
    );

    const { findByTestId, findByText } = renderActivityScreenViewWithRoutes({
      state: emptyActivityStateFunded().build(),
      extraRoutes: [{ name: Routes.BRIDGE.ROOT }],
    });

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(await findByText(fundedDescription)).toBeOnTheScreen();

    fireEvent.press(await findByText(swapTokensLabel));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.BRIDGE.ROOT)),
    ).toBeOnTheScreen();
  });

  it('shows unfunded Buy/Sell empty state and Add funds opens ramp token selection', async () => {
    const buySellDescription = strings(
      'activity_view.empty_state.buy_sell.description',
    );
    const addFundsLabel = strings('activity_view.empty_state.buy_sell.action');

    const { getByTestId, getAllByText, findByTestId, findByText } =
      renderActivityScreenViewWithRoutes({
        state: emptyActivityStateWithGeo().build(),
        extraRoutes: [{ name: Routes.RAMP.TOKEN_SELECTION }],
      });

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(
      await findByTestId(optionTestId(ActivityTypeFilter.BuySell)),
    );

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.BuySell))
          .length,
      ).toBeGreaterThan(0);
    });

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(await findByText(buySellDescription)).toBeOnTheScreen();

    fireEvent.press(await findByText(addFundsLabel));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.RAMP.TOKEN_SELECTION)),
    ).toBeOnTheScreen();
  });

  it('shows Make a prediction CTA on the Predictions empty state', async () => {
    const makePredictionLabel = strings(
      'activity_view.empty_state.predictions.action',
    );
    const state = initialStateActivityWithAccountsApi()
      .withRemoteFeatureFlags({
        predictTradingEnabled: {
          enabled: true,
          minimumVersion: '0.0.0',
        },
      })
      .build();

    const { getByTestId, findByTestId, findByText } = renderActivityScreenView({
      state,
    });

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(
      await findByTestId(optionTestId(ActivityTypeFilter.Predictions)),
    );

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(await findByText(makePredictionLabel)).toBeOnTheScreen();
  });

  it('shows Perps empty state and Browse markets opens perps market list', async () => {
    const browseMarketsLabel = strings(
      'activity_view.empty_state.perps.action',
    );
    const perpsDescription = strings(
      'activity_view.empty_state.perps.description',
    );
    // Keep Perps disabled so the list does not mount PerpsActivitySource /
    // connection providers (which can stay loading). Empty CTA still resolves
    // from typeFilter alone.
    const state = initialStateActivityWithAccountsApi()
      .withRemoteFeatureFlags({
        perpsPerpTradingEnabled: {
          enabled: false,
          minimumVersion: '0.0.0',
        },
      })
      .build();

    const { getByTestId, findByTestId, findByText } =
      renderActivityScreenViewWithRoutes({
        state,
        extraRoutes: [{ name: Routes.PERPS.ROOT }],
      });

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(await findByTestId(optionTestId(ActivityTypeFilter.Perps)));

    // Wait for Perps-specific copy — EMPTY_STATE may still be the prior
    // Transactions empty until the filter re-render settles.
    expect(await findByText(perpsDescription)).toBeOnTheScreen();
    expect(await findByText(browseMarketsLabel)).toBeOnTheScreen();

    fireEvent.press(await findByText(browseMarketsLabel));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.PERPS.ROOT)),
    ).toBeOnTheScreen();
  });

  it('shows Card empty state and Open MetaMask Card opens card home', async () => {
    const openCardLabel = strings(
      'activity_view.empty_state.metamask_card.action',
    );

    const { getByTestId, findByTestId, findByText } =
      renderActivityScreenViewWithRoutes({
        state: initialStateActivityWithAccountsApi().build(),
        extraRoutes: [{ name: Routes.CARD.ROOT }],
      });

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(
      await findByTestId(optionTestId(ActivityTypeFilter.MetamaskCard)),
    );

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
    expect(await findByText(openCardLabel)).toBeOnTheScreen();

    fireEvent.press(await findByText(openCardLabel));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.CARD.ROOT)),
    ).toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — transaction rows', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  // Default type filter is Transactions (`All` is off the sheet for now).
  it('shows send, receive, swap, bridge, approval, contract, and NFT rows under Transactions after load', async () => {
    const sendEth = buildConfirmedLocalSendTransaction();
    const sendUsdc = buildConfirmedLocalUsdcSendTransaction();
    const bridge = buildConfirmedLocalBridgeTransaction();
    const crossChainSwap = buildConfirmedLocalCrossChainSwapTransaction();
    const approve = buildConfirmedLocalUsdcApproveTransaction();
    const increase = buildConfirmedLocalUsdcIncreaseAllowanceTransaction();
    const unlimitedApprove =
      buildConfirmedLocalUsdcUnlimitedApproveTransaction();
    const revoke = buildConfirmedLocalUsdcRevokeTransaction();
    const contract = buildConfirmedLocalContractInteractionTransaction();

    const sendEthHash = sendEth.hash as string;
    const sendUsdcHash = sendUsdc.hash as string;
    const bridgeHash = bridge.hash as string;
    const crossChainSwapHash = crossChainSwap.hash as string;
    const approveHash = approve.hash as string;
    const increaseHash = increase.hash as string;
    const unlimitedApproveHash = unlimitedApprove.hash as string;
    const revokeHash = revoke.hash as string;
    const contractHash = contract.hash as string;
    const receiveEthHash = '0xactivitycvreceiveeth';
    const receiveUsdcHash = '0xactivitycvreceiveusdc';
    const apiSwapHash = '0xactivitycvswapethusdc';
    const mintHash = '0xactivitycvnftmint';
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    setupAccountsTransactionsApiMock([
      {
        hash: receiveEthHash,
        timestamp: new Date(1_716_367_800_000).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_RECIPIENT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '1000000000000000000',
        valueTransfers: [
          {
            from: ACTIVITY_CV_RECIPIENT,
            to: ACTIVITY_CV_ACCOUNT,
            amount: '1000000000000000000',
            symbol: 'ETH',
            decimal: 18,
          },
        ],
        isError: false,
        transactionCategory: 'STANDARD',
      },
      {
        hash: receiveUsdcHash,
        timestamp: new Date(1_716_367_801_000).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_RECIPIENT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0',
        valueTransfers: [
          {
            from: ACTIVITY_CV_RECIPIENT,
            to: ACTIVITY_CV_ACCOUNT,
            amount: '1000000',
            symbol: 'USDC',
            decimal: 6,
            name: 'USD Coin',
            transferType: 'ERC20',
          },
        ],
        isError: false,
        transactionCategory: 'TRANSFER',
      },
      {
        hash: apiSwapHash,
        timestamp: new Date(1_716_367_802_000).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0',
        valueTransfers: [
          {
            from: ACTIVITY_CV_ACCOUNT,
            to: ACTIVITY_CV_RECIPIENT,
            amount: '1000000000000000000',
            decimal: 18,
            symbol: 'ETH',
            name: 'Ether',
            transferType: 'normal',
          },
          {
            from: ACTIVITY_CV_RECIPIENT,
            to: ACTIVITY_CV_ACCOUNT,
            amount: '1000000',
            decimal: 6,
            contractAddress: USDC_MAINNET,
            symbol: 'USDC',
            name: 'USD Coin',
            transferType: 'erc20',
          },
        ],
        isError: false,
        transactionCategory: 'EXCHANGE',
      },
      {
        hash: mintHash,
        timestamp: new Date(1_716_367_803_000).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_NFT_CONTRACT,
        value: '0',
        valueTransfers: [
          {
            from: zeroAddress,
            to: ACTIVITY_CV_ACCOUNT,
            contractAddress: ACTIVITY_CV_NFT_CONTRACT,
            tokenId: '1',
            name: ACTIVITY_CV_NFT_COLLECTION_NAME,
            symbol: 'PUNK',
            transferType: 'erc721',
          },
        ],
        isError: false,
        transactionCategory: 'TRANSFER',
      },
    ]);

    const state = initialStateActivityWithLocalTransactions([
      sendEth,
      sendUsdc,
      bridge,
      crossChainSwap,
      approve,
      increase,
      unlimitedApprove,
      revoke,
      contract,
    ])
      .withOverrides({
        engine: {
          backgroundState: {
            PreferencesController: {
              privacyMode: false,
            },
            BridgeStatusController: {
              txHistory: {
                [bridge.id]: activityCvBridgeHistoryEntry,
                [crossChainSwap.id]: activityCvCrossChainSwapBridgeHistoryEntry,
              },
            },
          },
        },
      } as never)
      .build();

    const { findByTestId, queryByTestId, getAllByText } =
      renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const sendEthTitle = await waitFor(
      () => findByTestId(activityListRowTitleTestId(sendEthHash)),
      { timeout: 10000 },
    );
    expect(sendEthTitle).toHaveTextContent('Sent ETH');
    expect(
      await findByTestId(activityListRowSubtitleTestId(sendEthHash)),
    ).toHaveTextContent('To: 0x80181...229cC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(sendEthHash)),
    ).toHaveTextContent(/^-.*ETH/);
    expect(
      await findByTestId(activityListRowSecondaryAmountTestId(sendEthHash)),
    ).toHaveTextContent(/^-\$2,500\.00/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(sendEthHash)),
    ).toBeOnTheScreen();

    const receiveEthTitle = await findByTestId(
      activityListRowTitleTestId(receiveEthHash),
    );
    expect(receiveEthTitle).toHaveTextContent('Received ETH');
    expect(
      await findByTestId(activityListRowSubtitleTestId(receiveEthHash)),
    ).toHaveTextContent('From: 0x80181...229cC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(receiveEthHash)),
    ).toHaveTextContent(/^\+.*ETH/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(receiveEthHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(sendUsdcHash)),
    ).toHaveTextContent('Sent USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(sendUsdcHash)),
    ).toHaveTextContent(/^-.*USDC/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(sendUsdcHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(receiveUsdcHash)),
    ).toHaveTextContent('Received USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(receiveUsdcHash)),
    ).toHaveTextContent(/^\+.*USDC/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(receiveUsdcHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(apiSwapHash)),
    ).toHaveTextContent('Swapped');
    expect(
      await findByTestId(activityListRowSubtitleTestId(apiSwapHash)),
    ).toHaveTextContent('ETH → USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(apiSwapHash)),
    ).toHaveTextContent(/^\+.*USDC/);
    expect(
      await findByTestId(activityListRowSecondaryAmountTestId(apiSwapHash)),
    ).toHaveTextContent(/^-.*ETH/);
    expect(
      await findByTestId(activityListRowAvatarStackTestId(apiSwapHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(bridgeHash)),
    ).toHaveTextContent('Bridged USDC');
    expect(
      await findByTestId(activityListRowSubtitleTestId(bridgeHash)),
    ).toHaveTextContent('Ethereum → Linea');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(bridgeHash)),
    ).toHaveTextContent(/^\+.*USDC/);
    expect(
      await findByTestId(activityListRowSecondaryAmountTestId(bridgeHash)),
    ).toHaveTextContent(/^-.*ETH/);
    expect(
      await findByTestId(activityListRowAvatarStackTestId(bridgeHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(crossChainSwapHash)),
    ).toHaveTextContent('Swapped');
    expect(
      await findByTestId(activityListRowSubtitleTestId(crossChainSwapHash)),
    ).toHaveTextContent('ETH → USDC');
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(crossChainSwapHash),
      ),
    ).toHaveTextContent(/^\+.*USDC/);
    expect(
      await findByTestId(
        activityListRowSecondaryAmountTestId(crossChainSwapHash),
      ),
    ).toHaveTextContent(/^-.*ETH/);
    expect(
      await findByTestId(activityListRowAvatarStackTestId(crossChainSwapHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(approveHash)),
    ).toHaveTextContent('Approved spending cap');
    expect(
      await findByTestId(activityListRowSubtitleTestId(approveHash)),
    ).toHaveTextContent('USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(approveHash)),
    ).toHaveTextContent('100 USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(approveHash)),
    ).not.toHaveTextContent(/^[+-]/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(approveHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(increaseHash)),
    ).toHaveTextContent('Increased spending cap');
    expect(
      await findByTestId(activityListRowSubtitleTestId(increaseHash)),
    ).toHaveTextContent('USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(increaseHash)),
    ).toHaveTextContent('100 USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(increaseHash)),
    ).not.toHaveTextContent(/^[+-]/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(increaseHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(contractHash)),
    ).toHaveTextContent(strings('transactions.smart_contract_interaction'));
    expect(
      queryByTestId(activityListRowPrimaryAmountTestId(contractHash)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(contractHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(unlimitedApproveHash)),
    ).toHaveTextContent('Approved spending cap');
    expect(
      await findByTestId(activityListRowSubtitleTestId(unlimitedApproveHash)),
    ).toHaveTextContent('USDC');
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(unlimitedApproveHash),
      ),
    ).toHaveTextContent(`${strings('confirm.unlimited')} USDC`);
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(unlimitedApproveHash),
      ),
    ).not.toHaveTextContent(/^[+-]/);
    expect(
      await findByTestId(
        activityListRowAvatarSingleTestId(unlimitedApproveHash),
      ),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(revokeHash)),
    ).toHaveTextContent(strings('transactions.activity_revoke_spending_cap'));
    expect(
      await findByTestId(activityListRowSubtitleTestId(revokeHash)),
    ).toHaveTextContent('USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(revokeHash)),
    ).toHaveTextContent('0 USDC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(revokeHash)),
    ).not.toHaveTextContent(/^[+-]/);
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(revokeHash)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(mintHash)),
    ).toHaveTextContent(
      `${strings('transactions.activity_nft_mint')} ${ACTIVITY_CV_NFT_COLLECTION_NAME}`,
    );
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(mintHash)),
    ).toBeOnTheScreen();
  });

  it('shows Swapped when Accounts API returns the same hash as Smart contract interaction', async () => {
    const swapTransaction = buildConfirmedLocalCrossChainSwapTransaction();
    const swapHash = swapTransaction.hash as string;
    const aggregator = '0x1111111254eeb25477b68fb85ed929f73a960582';

    setupAccountsTransactionsApiMock([
      {
        hash: swapHash,
        timestamp: new Date(swapTransaction.time).toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_ACCOUNT,
        to: aggregator,
        value: '0',
        valueTransfers: [],
        isError: false,
        transactionCategory: 'CONTRACT_CALL',
      },
    ]);

    const state = initialStateActivityWithLocalTransactions([swapTransaction])
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeStatusController: {
              txHistory: {
                [swapTransaction.id]:
                  activityCvCrossChainSwapBridgeHistoryEntry,
              },
            },
          },
        },
      } as never)
      .build();

    const { findByTestId, getAllByTestId, getAllByText, queryByText } =
      renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(swapHash)),
      { timeout: 10000 },
    );

    expect(getAllByTestId(activityListRowTitleTestId(swapHash))).toHaveLength(
      1,
    );
    expect(title).toHaveTextContent('Swapped');
    expect(title).not.toHaveTextContent(
      strings('transactions.smart_contract_interaction'),
    );
    expect(
      queryByText(strings('transactions.smart_contract_interaction')),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowSubtitleTestId(swapHash)),
    ).toHaveTextContent('ETH → USDC');
  });
});

describeForPlatforms('ActivityScreen — prediction rows', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
    (
      Engine.context.PredictController.getActivity as jest.Mock
    ).mockResolvedValue([]);
  });

  it('shows deposit, withdrawal, claim, cash-out, and placed rows under Predictions after load', async () => {
    const deposit = buildConfirmedLocalPredictDepositTransaction();
    const withdraw = buildConfirmedLocalPredictWithdrawTransaction();
    const claim = buildPredictClaimActivity();
    const sell = buildPredictSellActivity();
    const buy = buildPredictBuyActivity();
    const depositHash = deposit.hash as string;
    const withdrawHash = withdraw.hash as string;

    setupAccountsTransactionsApiMock([]);
    (
      Engine.context.PredictController.getActivity as jest.Mock
    ).mockResolvedValue([claim, sell, buy]);

    const state = initialStateActivityWithLocalTransactions([deposit, withdraw])
      .withRemoteFeatureFlags(activityPredictTradingEnabledFlag)
      .build();

    const { findByTestId, getAllByText, queryByTestId } =
      renderActivityScreenView({
        state,
        params: { initialTypeFilter: ActivityTypeFilter.Predictions },
      });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Predictions))
          .length,
      ).toBeGreaterThan(0);
    });

    expect(
      await findByTestId(activityListRowTitleTestId(depositHash)),
    ).toHaveTextContent(
      strings('transactions.activity_prediction_account_funded'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestId(depositHash)),
    ).toHaveTextContent(strings('transactions.activity_predictions_balance'));

    const depositPrimary = await findByTestId(
      activityListRowPrimaryAmountTestId(depositHash),
    );
    expect(depositPrimary).toHaveTextContent(/^\+/);
    expect(depositPrimary).toHaveTextContent(/USD|\$/);

    const depositSecondary = await findByTestId(
      activityListRowSecondaryAmountTestId(depositHash),
    );
    expect(depositSecondary).toHaveTextContent(/4,?000 USDC/);
    expect(depositSecondary).not.toHaveTextContent(/^\+/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(depositHash)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(activityListRowAvatarStackTestId(depositHash)),
    ).toBeNull();

    expect(
      await findByTestId(activityListRowTitleTestId(withdrawHash)),
    ).toHaveTextContent(strings('transactions.activity_prediction_withdrawal'));
    expect(
      await findByTestId(activityListRowSubtitleTestId(withdrawHash)),
    ).toHaveTextContent(strings('transactions.activity_predictions_balance'));

    const withdrawPrimary = await findByTestId(
      activityListRowPrimaryAmountTestId(withdrawHash),
    );
    expect(withdrawPrimary).toHaveTextContent(/^-/);
    expect(withdrawPrimary).toHaveTextContent(/USD|\$/);

    const withdrawSecondary = await findByTestId(
      activityListRowSecondaryAmountTestId(withdrawHash),
    );
    expect(withdrawSecondary).toHaveTextContent(/^-.*4,?000 USDC/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(withdrawHash)),
    ).toBeOnTheScreen();

    const claimTitle = await waitFor(
      () => findByTestId(activityListRowTitleTestId(claim.id)),
      { timeout: 10000 },
    );
    expect(claimTitle).toHaveTextContent(
      strings('predict.transactions.claim_title'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestId(claim.id)),
    ).toHaveTextContent(ACTIVITY_CV_PREDICT_MARKET_TITLE);

    const claimPrimary = await findByTestId(
      activityListRowPrimaryAmountTestId(claim.id),
    );
    expect(claimPrimary).toHaveTextContent(/^\+/);
    expect(claimPrimary).toHaveTextContent(/\$/);

    expect(
      queryByTestId(activityListRowSecondaryAmountTestId(claim.id)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(claim.id)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(sell.id)),
    ).toHaveTextContent(strings('predict.transactions.sell_title'));
    expect(
      await findByTestId(activityListRowSubtitleTestId(sell.id)),
    ).toHaveTextContent(ACTIVITY_CV_PREDICT_MARKET_TITLE);

    const sellPrimary = await findByTestId(
      activityListRowPrimaryAmountTestId(sell.id),
    );
    expect(sellPrimary).toHaveTextContent(/^\+/);
    expect(sellPrimary).toHaveTextContent(/\$/);

    expect(
      queryByTestId(activityListRowSecondaryAmountTestId(sell.id)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(sell.id)),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(activityListRowTitleTestId(buy.id)),
    ).toHaveTextContent(strings('transactions.activity_prediction_placed'));
    expect(
      await findByTestId(activityListRowSubtitleTestId(buy.id)),
    ).toHaveTextContent(ACTIVITY_CV_PREDICT_MARKET_TITLE);

    const buyPrimary = await findByTestId(
      activityListRowPrimaryAmountTestId(buy.id),
    );
    expect(buyPrimary).toHaveTextContent(/^-/);
    expect(buyPrimary).toHaveTextContent(/\$/);

    expect(
      queryByTestId(activityListRowSecondaryAmountTestId(buy.id)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(buy.id)),
    ).toBeOnTheScreen();
  });
});

interface PerpsControllerOverviewStubs {
  getActiveProvider: jest.Mock;
  getActiveProviderOrNull: jest.Mock;
  getOrderFills: jest.Mock;
  getOrders: jest.Mock;
  getFunding: jest.Mock;
}

const stubPerpsOverviewEngine = () => {
  const seed = buildActivityCvPerpsOverviewEngineSeed();
  const perpsController = Engine.context
    .PerpsController as unknown as PerpsControllerOverviewStubs;
  const provider = {
    ping: jest.fn().mockResolvedValue(true),
    getUserHistory: jest.fn().mockResolvedValue(seed.userHistory),
    getFunding: jest.fn().mockResolvedValue(seed.funding),
    getOrderFills: jest.fn().mockResolvedValue(seed.fills),
  };

  perpsController.getActiveProvider.mockReturnValue(provider);
  perpsController.getActiveProviderOrNull.mockReturnValue(provider);
  perpsController.getOrderFills.mockResolvedValue(seed.fills);
  perpsController.getOrders.mockResolvedValue(seed.orders);
  perpsController.getFunding.mockResolvedValue(seed.funding);

  return { perpsController, seed };
};

const restorePerpsOverviewEngine = (
  perpsController: PerpsControllerOverviewStubs,
) => {
  perpsController.getActiveProviderOrNull.mockReturnValue(null);
  perpsController.getOrderFills.mockResolvedValue([]);
  perpsController.getOrders.mockResolvedValue([]);
  perpsController.getFunding.mockResolvedValue([]);
};

const renderPerpsOverview = (initialPerpsFilter?: PerpsActivityFilter) => {
  const state = initialStateActivityWithPerpsDetails()
    .withRemoteFeatureFlags(activityPerpsTradingEnabledFlag)
    .build();

  return renderActivityScreenView({
    state,
    params: {
      initialTypeFilter: ActivityTypeFilter.Perps,
      ...(initialPerpsFilter ? { initialPerpsFilter } : {}),
    },
  });
};

describeForPlatforms('ActivityScreen — buy/sell rows', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  it('shows Bought mUSD and Sold ETH under Buy/Sell after load, and hides a Transactions send', async () => {
    const sendTransaction = buildConfirmedLocalSendTransaction();
    const sendHash = sendTransaction.hash as string;
    setupAccountsTransactionsApiMock([]);
    const state = initialStateActivityWithRampOrders([
      buildActivityCvRampBuyMusdOrder(),
      buildActivityCvRampSellEthOrder(),
    ])
      .withOverrides({
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [sendTransaction],
              swapsTransactions: {},
            },
          },
        },
      } as never)
      .build();

    const { findByTestId, getAllByText, queryByTestId } =
      renderActivityScreenView({
        state,
        params: { initialTypeFilter: ActivityTypeFilter.BuySell },
      });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.BuySell))
          .length,
      ).toBeGreaterThan(0);
    });

    const buyTitle = await findByTestId(
      activityListRowTitleTestId(ACTIVITY_CV_RAMP_BUY_TX_HASH),
    );
    expect(buyTitle).toHaveTextContent('Bought mUSD');
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(ACTIVITY_CV_RAMP_BUY_TX_HASH),
      ),
    ).toHaveTextContent(/^\+5\.01 mUSD/);
    expect(
      await findByTestId(
        activityListRowAvatarSingleTestId(ACTIVITY_CV_RAMP_BUY_TX_HASH),
      ),
    ).toBeOnTheScreen();

    const sellTitle = await findByTestId(
      activityListRowTitleTestId(ACTIVITY_CV_RAMP_SELL_TX_HASH),
    );
    expect(sellTitle).toHaveTextContent('Sold ETH');
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(ACTIVITY_CV_RAMP_SELL_TX_HASH),
      ),
    ).toHaveTextContent(/^-0\.085 ETH/);
    expect(
      await findByTestId(
        activityListRowAvatarSingleTestId(ACTIVITY_CV_RAMP_SELL_TX_HASH),
      ),
    ).toBeOnTheScreen();

    expect(
      queryByTestId(activityListRowTitleTestId(sendHash)),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — perps funds', () => {
  let perpsController: PerpsControllerOverviewStubs;

  beforeEach(() => {
    ({ perpsController } = stubPerpsOverviewEngine());
    setupAccountsTransactionsApiMock([]);
  });

  afterEach(() => {
    restorePerpsOverviewEngine(perpsController);
    clearAccountsTransactionsApiMocks();
  });

  it('shows Account funded and Perps withdrawal under Perps Deposits after load, and hides a Perps trade', async () => {
    const { findByTestId, getAllByText, queryByTestId } = renderPerpsOverview(
      PerpsActivityFilter.Deposits,
    );

    await waitFor(() => {
      expect(
        getAllByText(perpsFilterLabel(PerpsActivityFilter.Deposits)).length,
      ).toBeGreaterThan(0);
    });

    const depositTitle = await waitFor(
      () =>
        findByTestId(
          activityListRowTitleTestId(ACTIVITY_CV_PERPS_DEPOSIT_HASH),
        ),
      { timeout: 10000 },
    );
    expect(depositTitle).toHaveTextContent(
      strings('transactions.activity_perps_account_funded'),
    );
    expect(
      await findByTestId(
        activityListRowSubtitleTestId(ACTIVITY_CV_PERPS_DEPOSIT_HASH),
      ),
    ).toHaveTextContent(strings('transactions.activity_perps_balance'));
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(ACTIVITY_CV_PERPS_DEPOSIT_HASH),
      ),
    ).toHaveTextContent(/^\+/);
    expect(
      await findByTestId(
        activityListRowSecondaryAmountTestId(ACTIVITY_CV_PERPS_DEPOSIT_HASH),
      ),
    ).toHaveTextContent(/1,?000 USDC/);
    expect(
      await findByTestId(
        activityListRowAvatarSingleTestId(ACTIVITY_CV_PERPS_DEPOSIT_HASH),
      ),
    ).toBeOnTheScreen();

    expect(
      await findByTestId(
        activityListRowTitleTestId(ACTIVITY_CV_PERPS_WITHDRAWAL_HASH),
      ),
    ).toHaveTextContent(strings('transactions.activity_perps_withdrawal'));
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestId(ACTIVITY_CV_PERPS_WITHDRAWAL_HASH),
      ),
    ).toHaveTextContent(/^-/);
    expect(
      await findByTestId(
        activityListRowSecondaryAmountTestId(ACTIVITY_CV_PERPS_WITHDRAWAL_HASH),
      ),
    ).toHaveTextContent(/^-.*1,?000 USDC/);

    expect(
      queryByTestId(
        activityListRowTitleTestIdPattern(
          activityCvPerpsTradeRowHash('openLong'),
        ),
      ),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — perps trades', () => {
  let perpsController: PerpsControllerOverviewStubs;

  beforeEach(() => {
    ({ perpsController } = stubPerpsOverviewEngine());
    setupAccountsTransactionsApiMock([]);
  });

  afterEach(() => {
    restorePerpsOverviewEngine(perpsController);
    clearAccountsTransactionsApiMocks();
  });

  it('shows open and close long and short under Perps Trades after load, and hides a Perps order', async () => {
    const openLongHash = activityCvPerpsTradeRowHash('openLong');
    const openShortHash = activityCvPerpsTradeRowHash('openShort');
    const closeLongHash = activityCvPerpsTradeRowHash('closeLong');
    const closeShortHash = activityCvPerpsTradeRowHash('closeShort');
    const orderHash = activityCvPerpsCanceledTakeProfitRowHash();

    const { findByTestId, getAllByText, queryByTestId } = renderPerpsOverview();

    await waitFor(() => {
      expect(
        getAllByText(perpsFilterLabel(PerpsActivityFilter.Trades)).length,
      ).toBeGreaterThan(0);
    });

    const openLongTitle = await waitFor(
      () => findByTestId(activityListRowTitleTestIdPattern(openLongHash)),
      { timeout: 10000 },
    );
    expect(openLongTitle).toHaveTextContent(
      strings('transactions.activity_perps_open_long'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestIdPattern(openLongHash)),
    ).toHaveTextContent('0.0001 BTC');
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestIdPattern(openLongHash),
      ),
    ).toHaveTextContent(/^-\$0\.50/);
    expect(
      queryByTestId(activityListRowSecondaryAmountTestIdPattern(openLongHash)),
    ).toBeNull();

    expect(
      await findByTestId(activityListRowTitleTestIdPattern(openShortHash)),
    ).toHaveTextContent(strings('transactions.activity_perps_open_short'));
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestIdPattern(openShortHash),
      ),
    ).toHaveTextContent(/^-\$0\.50/);

    expect(
      await findByTestId(activityListRowTitleTestIdPattern(closeLongHash)),
    ).toHaveTextContent(strings('transactions.activity_perps_close_long'));
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestIdPattern(closeLongHash),
      ),
    ).toHaveTextContent(/^\+\$45\.67/);

    expect(
      await findByTestId(activityListRowTitleTestIdPattern(closeShortHash)),
    ).toHaveTextContent(strings('transactions.activity_perps_close_short'));
    expect(
      await findByTestId(
        activityListRowPrimaryAmountTestIdPattern(closeShortHash),
      ),
    ).toHaveTextContent(/^-\$12\.34/);

    expect(
      queryByTestId(activityListRowTitleTestId(orderHash)),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — perps orders', () => {
  let perpsController: PerpsControllerOverviewStubs;

  beforeEach(() => {
    ({ perpsController } = stubPerpsOverviewEngine());
    setupAccountsTransactionsApiMock([]);
  });

  afterEach(() => {
    restorePerpsOverviewEngine(perpsController);
    clearAccountsTransactionsApiMocks();
  });

  it('shows canceled take-profit close short under Perps Orders after load, and hides a Perps trade', async () => {
    const orderHash = activityCvPerpsCanceledTakeProfitRowHash();
    const tradeHash = activityCvPerpsTradeRowHash('openLong');

    const { findByTestId, getAllByText, queryByTestId } = renderPerpsOverview(
      PerpsActivityFilter.Orders,
    );

    await waitFor(() => {
      expect(
        getAllByText(perpsFilterLabel(PerpsActivityFilter.Orders)).length,
      ).toBeGreaterThan(0);
    });

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(orderHash)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent(
      strings('transactions.activity_limit_close_short'),
    );
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(orderHash)),
    ).toHaveTextContent(strings('transactions.activity_order_status_canceled'));

    expect(
      queryByTestId(activityListRowTitleTestIdPattern(tradeHash)),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — perps funding', () => {
  let perpsController: PerpsControllerOverviewStubs;

  beforeEach(() => {
    ({ perpsController } = stubPerpsOverviewEngine());
    setupAccountsTransactionsApiMock([]);
  });

  afterEach(() => {
    restorePerpsOverviewEngine(perpsController);
    clearAccountsTransactionsApiMocks();
  });

  it('shows Paid and Received funding fees under Perps Fundings after load, and hides a Perps trade', async () => {
    const paidHash = activityCvPerpsFundingRowHash('paid');
    const receivedHash = activityCvPerpsFundingRowHash('received');
    const tradeHash = activityCvPerpsTradeRowHash('openLong');

    const { findByTestId, getAllByText, queryByTestId } = renderPerpsOverview(
      PerpsActivityFilter.Fundings,
    );

    await waitFor(() => {
      expect(
        getAllByText(perpsFilterLabel(PerpsActivityFilter.Fundings)).length,
      ).toBeGreaterThan(0);
    });

    const paidTitle = await waitFor(
      () => findByTestId(activityListRowTitleTestId(paidHash)),
      { timeout: 10000 },
    );
    expect(paidTitle).toHaveTextContent(
      strings('transactions.activity_perps_paid_funding_fees'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestId(paidHash)),
    ).toHaveTextContent('BTC');
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(paidHash)),
    ).toHaveTextContent(/^-/);

    expect(
      await findByTestId(activityListRowTitleTestId(receivedHash)),
    ).toHaveTextContent(
      strings('transactions.activity_perps_received_funding_fees'),
    );
    expect(
      await findByTestId(activityListRowPrimaryAmountTestId(receivedHash)),
    ).toHaveTextContent(/^\+/);

    expect(
      queryByTestId(activityListRowTitleTestIdPattern(tradeHash)),
    ).not.toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — Monad bridge status', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
  });

  const assertPendingList = async (
    screen: ReturnType<typeof renderActivityScreenViewWithRoutes>,
    bridgeHash: string,
  ) => {
    expect(
      await screen.findByTestId(activityListRowTitleTestId(bridgeHash)),
    ).toHaveTextContent('Bridging USDC');
    expect(
      await screen.findByTestId(activityListRowSubtitleTestId(bridgeHash)),
    ).toHaveTextContent('Monad → Base');
    expect(
      await screen.findByTestId(
        activityListRowPendingSpinnerTestId(bridgeHash),
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Swapping')).toBeNull();
    expect(screen.queryByText('Swapped')).toBeNull();
  };

  const assertBridgedList = async (
    screen: ReturnType<typeof renderActivityScreenViewWithRoutes>,
    bridgeHash: string,
  ) => {
    expect(
      await screen.findByTestId(activityListRowTitleTestId(bridgeHash)),
    ).toHaveTextContent('Bridged USDC');
    expect(
      await screen.findByTestId(activityListRowSubtitleTestId(bridgeHash)),
    ).toHaveTextContent('Monad → Base');
    expect(
      screen.queryByTestId(activityListRowPendingSpinnerTestId(bridgeHash)),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Swapping')).toBeNull();
    expect(screen.queryByText('Swapped')).toBeNull();
  };

  const assertDetailsAmountFeeTotal = async (
    screen: ReturnType<typeof renderActivityScreenViewWithRoutes>,
  ) => {
    expect(
      await screen.findByTestId(ACTIVITY_DETAILS_SCREEN),
    ).toBeOnTheScreen();
    expect(await screen.findByText('Bridged USDC')).toBeOnTheScreen();

    const amountHeader = await screen.findByTestId(
      ACTIVITY_DETAILS_AMOUNT_HEADER,
    );
    expect(
      screen.getByText(strings('activity_details.you_sent')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('activity_details.you_received')),
    ).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^-.*MON/)).toBeOnTheScreen();
    expect(within(amountHeader).getByText(/^\+.*USDC/)).toBeOnTheScreen();

    expect(
      await screen.findByTestId(ACTIVITY_DETAILS_STATUS_PILL),
    ).toHaveTextContent(strings('transaction.confirmed'));

    const networkRow = screen.getByTestId(ACTIVITY_DETAILS_NETWORK_ROW);
    expect(networkRow).toHaveTextContent('Monad', { exact: false });
    expect(networkRow).toHaveTextContent('Base', { exact: false });

    await waitFor(() => {
      expect(screen.getByTestId(ACTIVITY_DETAILS_FEE_ROW)).toHaveTextContent(
        /\$/,
      );
    });
    expect(screen.getByTestId(ACTIVITY_DETAILS_TOTAL_ROW)).toHaveTextContent(
      /\$/,
    );
  };

  // One tree: pending list → live controller update → Bridged → press → Details
  // (requires both tmcuActivityRedesignEnabled + tmcuTransactionsRedesignEnabled).
  it('shows Bridging then Bridged after dest completes, not Swap, with Amount Fee Total via details nav', async () => {
    setupAccountsTransactionsApiMock([]);

    const pendingBridge = buildPendingLocalBridgeMonToBaseTransaction();
    const confirmedBridge = buildConfirmedLocalBridgeMonToBaseTransaction();
    const bridgeHash = pendingBridge.hash as string;

    const screen = renderActivityScreenViewWithRoutes({
      state: monToBaseBridgeState(
        pendingBridge,
        activityCvPendingBridgeMonToBaseHistoryEntry,
      ),
      extraRoutes: [
        {
          name: Routes.ACTIVITY_DETAILS,
          Component: ActivityDetailsWithProviders,
        },
      ],
    });

    await assertPendingList(screen, bridgeHash);

    act(() => {
      syncEngineControllerState(screen.store, 'TransactionController', {
        transactions: [confirmedBridge],
        swapsTransactions: {},
      });
      syncEngineControllerState(screen.store, 'BridgeStatusController', {
        txHistory: {
          [confirmedBridge.id]: activityCvBridgeMonToBaseHistoryEntry,
        },
      });
    });

    await assertBridgedList(screen, bridgeHash);

    fireEvent.press(screen.getByTestId(activityListRowItemTestId(1)));

    await assertDetailsAmountFeeTotal(screen);
  });
});

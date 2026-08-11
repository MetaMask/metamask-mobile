import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';

import Routes from '../../../constants/navigation/Routes';
import Engine from '../../../core/Engine';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderActivityScreenView,
  renderActivityScreenViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import {
  ACTIVITY_CV_ACCOUNT,
  ACTIVITY_CV_NFT_COLLECTION_NAME,
  ACTIVITY_CV_NFT_CONTRACT,
  ACTIVITY_CV_PREDICT_MARKET_TITLE,
  ACTIVITY_CV_RECIPIENT,
  LINEA_ACTIVITY_HASH,
  MAINNET_ACTIVITY_HASH,
  activityCvBridgeHistoryEntry,
  activityCvCrossChainSwapBridgeHistoryEntry,
  activityLineaNetworkOverride,
  activityPredictTradingEnabledFlag,
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
  buildPredictBuyActivity,
  buildPredictClaimActivity,
  buildPredictSellActivity,
  initialStateActivityWithAccountsApi,
  initialStateActivityWithLocalTransactions,
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

// Row testIDs mirror ActivityListItemRow markup. Defined locally so this route
// suite does not import from the sibling ActivityList route (ADR 0020).
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

const USDC_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const optionTestId = (filter: ActivityTypeFilter) =>
  `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`;

const perpsOptionTestId = (filter: PerpsActivityFilter) =>
  `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`;

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
      fireEvent.press(await findByTestId('network-select-eip155:1'));

      await waitFor(() => {
        expect(
          getByTestId(activityListRowTitleTestId(MAINNET_ACTIVITY_HASH)),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(activityListRowTitleTestId(LINEA_ACTIVITY_HASH)),
        ).toBeNull();
      });

      fireEvent.press(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      );
      fireEvent.press(await findByTestId('network-select-eip155:59144'));

      await waitFor(() => {
        expect(
          getByTestId(activityListRowTitleTestId(LINEA_ACTIVITY_HASH)),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(activityListRowTitleTestId(MAINNET_ACTIVITY_HASH)),
        ).toBeNull();
      });

      fireEvent.press(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      );
      fireEvent.press(await findByTestId('network-select-eip155:1'));

      await waitFor(() => {
        expect(
          getByTestId(activityListRowTitleTestId(MAINNET_ACTIVITY_HASH)),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(activityListRowTitleTestId(LINEA_ACTIVITY_HASH)),
        ).toBeNull();
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
  it('shows Send ETH under Transactions filter with negative primary amount and a single avatar', async () => {
    const sendTransaction = buildConfirmedLocalSendTransaction();
    const sendHash = sendTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      sendTransaction,
    ]).build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(sendHash));
    expect(title).toHaveTextContent('Sent ETH');

    const subtitle = await findByTestId(
      activityListRowSubtitleTestId(sendHash),
    );
    expect(subtitle).toBeOnTheScreen();
    expect(subtitle).toHaveTextContent('To: 0x80181...229cC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(sendHash),
    );
    expect(primaryAmount).toHaveTextContent(/^-.*ETH/);

    const secondaryAmount = await findByTestId(
      activityListRowSecondaryAmountTestId(sendHash),
    );
    expect(secondaryAmount).toHaveTextContent(/^-.*USD/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(sendHash)),
    ).toBeOnTheScreen();
  });

  it('shows Receive ETH under Transactions filter with positive primary amount and a single avatar', async () => {
    const receiveHash = '0xactivitycvreceiveeth';
    setupAccountsTransactionsApiMock([
      {
        hash: receiveHash,
        timestamp: new Date().toISOString(),
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
            // Omit transferType so shouldSkipTransaction keeps this inbound row.
          },
        ],
        isError: false,
        transactionCategory: 'STANDARD',
      },
    ]);

    const state = initialStateActivityWithAccountsApi().build();
    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(receiveHash)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent('Received ETH');

    const subtitle = await findByTestId(
      activityListRowSubtitleTestId(receiveHash),
    );
    expect(subtitle).toBeOnTheScreen();
    expect(subtitle).toHaveTextContent('From: 0x80181...229cC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(receiveHash),
    );
    expect(primaryAmount).toHaveTextContent(/^\+.*ETH/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(receiveHash)),
    ).toBeOnTheScreen();
  });

  it('shows Send USDC under Transactions filter with negative primary amount and a single avatar', async () => {
    const sendTransaction = buildConfirmedLocalUsdcSendTransaction();
    const sendHash = sendTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      sendTransaction,
    ]).build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(sendHash));
    expect(title).toHaveTextContent('Sent USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(sendHash),
    );
    expect(primaryAmount).toHaveTextContent(/^-.*USDC/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(sendHash)),
    ).toBeOnTheScreen();
  });

  it('shows Receive USDC under Transactions filter with positive primary amount and a single avatar', async () => {
    const receiveHash = '0xactivitycvreceiveusdc';
    setupAccountsTransactionsApiMock([
      {
        hash: receiveHash,
        timestamp: new Date().toISOString(),
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
            // Omit contractAddress so shouldSkipTransaction keeps this inbound row.
            name: 'USD Coin',
            transferType: 'ERC20',
          },
        ],
        isError: false,
        transactionCategory: 'TRANSFER',
      },
    ]);

    const state = initialStateActivityWithAccountsApi().build();
    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(receiveHash)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent('Received USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(receiveHash),
    );
    expect(primaryAmount).toHaveTextContent(/^\+.*USDC/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(receiveHash)),
    ).toBeOnTheScreen();
  });

  it('shows Swap ETH to USDC under Transactions filter with dual avatar and negative spent amount', async () => {
    const swapHash = '0xactivitycvswapethusdc';
    const aggregator = ACTIVITY_CV_RECIPIENT;
    setupAccountsTransactionsApiMock([
      {
        hash: swapHash,
        timestamp: new Date().toISOString(),
        chainId: 1,
        from: ACTIVITY_CV_ACCOUNT,
        to: ACTIVITY_CV_ACCOUNT,
        value: '0',
        valueTransfers: [
          {
            from: ACTIVITY_CV_ACCOUNT,
            to: aggregator,
            amount: '1000000000000000000',
            decimal: 18,
            symbol: 'ETH',
            name: 'Ether',
            transferType: 'normal',
          },
          {
            from: aggregator,
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
    ]);

    const state = initialStateActivityWithAccountsApi().build();
    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

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
    // Title "Swapped"; pair in subtitle ("ETH → USDC").
    expect(title).toHaveTextContent('Swapped');
    expect(
      await findByTestId(activityListRowSubtitleTestId(swapHash)),
    ).toHaveTextContent('ETH → USDC');

    // Destination (+USDC) primary; spent ETH secondary.
    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(swapHash),
    );
    expect(primaryAmount).toHaveTextContent(/^\+.*USDC/);

    const secondaryAmount = await findByTestId(
      activityListRowSecondaryAmountTestId(swapHash),
    );
    expect(secondaryAmount).toHaveTextContent(/^-.*ETH/);

    expect(
      await findByTestId(activityListRowAvatarStackTestId(swapHash)),
    ).toBeOnTheScreen();
  });

  it('shows Bridge under Transactions filter with dual avatar, primary amount and secondary amount', async () => {
    const bridgeTransaction = buildConfirmedLocalBridgeTransaction();
    const bridgeHash = bridgeTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([bridgeTransaction])
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeStatusController: {
              txHistory: {
                [bridgeTransaction.id]: activityCvBridgeHistoryEntry,
              },
            },
          },
        },
      } as never)
      .build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(bridgeHash));
    expect(title).toHaveTextContent('Bridged USDC');
    expect(
      await findByTestId(activityListRowSubtitleTestId(bridgeHash)),
    ).toHaveTextContent('Ethereum → Linea');

    // Dest amount present → +USDC primary, -ETH secondary.
    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(bridgeHash),
    );
    expect(primaryAmount).toHaveTextContent(/^\+.*USDC/);

    const secondaryAmount = await findByTestId(
      activityListRowSecondaryAmountTestId(bridgeHash),
    );
    expect(secondaryAmount).toHaveTextContent(/^-.*ETH/);

    expect(
      await findByTestId(activityListRowAvatarStackTestId(bridgeHash)),
    ).toBeOnTheScreen();
  });

  it('shows Swapped under Transactions filter with dual avatar with bridged tokens in the subtitle, primary amount and secondary amount, when bridging different tokens on different networks', async () => {
    const swapTransaction = buildConfirmedLocalCrossChainSwapTransaction();
    const swapHash = swapTransaction.hash as string;
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

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(swapHash));
    // Cross-chain different-token unified swap: "Swapped" + token-pair subtitle.
    expect(title).toHaveTextContent('Swapped');
    expect(
      await findByTestId(activityListRowSubtitleTestId(swapHash)),
    ).toHaveTextContent('ETH → USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(swapHash),
    );
    expect(primaryAmount).toHaveTextContent(/^\+.*USDC/);

    const secondaryAmount = await findByTestId(
      activityListRowSecondaryAmountTestId(swapHash),
    );
    expect(secondaryAmount).toHaveTextContent(/^-.*ETH/);

    expect(
      await findByTestId(activityListRowAvatarStackTestId(swapHash)),
    ).toBeOnTheScreen();
  });

  it('shows Approve USDC under Transactions filter with unsigned primary amount and a single avatar', async () => {
    const approveTransaction = buildConfirmedLocalUsdcApproveTransaction();
    const approveHash = approveTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      approveTransaction,
    ]).build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(approveHash));
    expect(title).toHaveTextContent('Approved spending cap');
    expect(
      await findByTestId(activityListRowSubtitleTestId(approveHash)),
    ).toHaveTextContent('USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(approveHash),
    );
    expect(primaryAmount).toHaveTextContent('100 USDC');
    expect(primaryAmount).not.toHaveTextContent(/^[+-]/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(approveHash)),
    ).toBeOnTheScreen();
  });

  it('shows increased spending cap under Transactions filter with amount and a single avatar with subtitle of token', async () => {
    const increaseTransaction =
      buildConfirmedLocalUsdcIncreaseAllowanceTransaction();
    const increaseHash = increaseTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      increaseTransaction,
    ]).build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(increaseHash));
    expect(title).toHaveTextContent('Increased spending cap');
    expect(
      await findByTestId(activityListRowSubtitleTestId(increaseHash)),
    ).toHaveTextContent('USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(increaseHash),
    );
    expect(primaryAmount).toHaveTextContent('100 USDC');
    expect(primaryAmount).not.toHaveTextContent(/^[+-]/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(increaseHash)),
    ).toBeOnTheScreen();
  });

  it('shows Contract interaction under Transactions filter with no amount sign and a single avatar', async () => {
    const contractTransaction =
      buildConfirmedLocalContractInteractionTransaction();
    const contractHash = contractTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      contractTransaction,
    ]).build();

    const { findByTestId, queryByTestId, getAllByText } =
      renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(contractHash));
    expect(title).toHaveTextContent(
      strings('transactions.smart_contract_interaction'),
    );

    // Zero-value interaction has no primary amount.
    expect(
      queryByTestId(activityListRowPrimaryAmountTestId(contractHash)),
    ).toBeNull();

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(contractHash)),
    ).toBeOnTheScreen();
  });

  it('shows Unlimited Approval of USDC under Transactions filter with unsigned primary amount and a single avatar', async () => {
    const approveTransaction =
      buildConfirmedLocalUsdcUnlimitedApproveTransaction();
    const approveHash = approveTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      approveTransaction,
    ]).build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(approveHash));
    expect(title).toHaveTextContent('Approved spending cap');
    expect(
      await findByTestId(activityListRowSubtitleTestId(approveHash)),
    ).toHaveTextContent('USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(approveHash),
    );
    expect(primaryAmount).toHaveTextContent(
      `${strings('confirm.unlimited')} USDC`,
    );
    expect(primaryAmount).not.toHaveTextContent(/^[+-]/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(approveHash)),
    ).toBeOnTheScreen();
  });

  it('shows revoke approval of USDC under Transactions filter with unsigned primary amount and a single avatar', async () => {
    const revokeTransaction = buildConfirmedLocalUsdcRevokeTransaction();
    const revokeHash = revokeTransaction.hash as string;
    const state = initialStateActivityWithLocalTransactions([
      revokeTransaction,
    ]).build();

    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await findByTestId(activityListRowTitleTestId(revokeHash));
    expect(title).toHaveTextContent(
      strings('transactions.activity_revoke_spending_cap'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestId(revokeHash)),
    ).toHaveTextContent('USDC');

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(revokeHash),
    );
    expect(primaryAmount).toHaveTextContent('0 USDC');
    expect(primaryAmount).not.toHaveTextContent(/^[+-]/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(revokeHash)),
    ).toBeOnTheScreen();
  });

  it('shows NFT mint under Transactions filter with the collection name in the title', async () => {
    const mintHash = '0xactivitycvnftmint';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    setupAccountsTransactionsApiMock([
      {
        hash: mintHash,
        timestamp: new Date().toISOString(),
        chainId: 1,
        // from = selected account so shouldSkipTransaction does not drop this mint.
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

    const state = initialStateActivityWithAccountsApi().build();
    const { findByTestId, getAllByText } = renderActivityScreenView({ state });

    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Transactions))
          .length,
      ).toBeGreaterThan(0);
    });

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(mintHash)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent(
      `${strings('transactions.activity_nft_mint')} ${ACTIVITY_CV_NFT_COLLECTION_NAME}`,
    );

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(mintHash)),
    ).toBeOnTheScreen();
  });
});

describeForPlatforms('ActivityScreen — prediction rows', () => {
  afterEach(() => {
    clearAccountsTransactionsApiMocks();
    (
      Engine.context.PredictController.getActivity as jest.Mock
    ).mockResolvedValue([]);
  });

  it('shows Account funded under Predictions with balance subtitle, + fiat, and USDC secondary', async () => {
    const deposit = buildConfirmedLocalPredictDepositTransaction();
    const depositHash = deposit.hash as string;
    const state = initialStateActivityWithLocalTransactions([deposit])
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

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(depositHash),
    );
    expect(primaryAmount).toHaveTextContent(/^\+/);
    expect(primaryAmount).toHaveTextContent(/USD|\$/);

    const secondaryAmount = await findByTestId(
      activityListRowSecondaryAmountTestId(depositHash),
    );
    expect(secondaryAmount).toHaveTextContent(/4,?000 USDC/);
    expect(secondaryAmount).not.toHaveTextContent(/^\+/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(depositHash)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(activityListRowAvatarStackTestId(depositHash)),
    ).toBeNull();
  });

  it('shows Prediction withdrawal under Predictions with balance subtitle and negative amounts', async () => {
    const withdraw = buildConfirmedLocalPredictWithdrawTransaction();
    const withdrawHash = withdraw.hash as string;
    const state = initialStateActivityWithLocalTransactions([withdraw])
      .withRemoteFeatureFlags(activityPredictTradingEnabledFlag)
      .build();

    const { findByTestId, getAllByText } = renderActivityScreenView({
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
      await findByTestId(activityListRowTitleTestId(withdrawHash)),
    ).toHaveTextContent(strings('transactions.activity_prediction_withdrawal'));
    expect(
      await findByTestId(activityListRowSubtitleTestId(withdrawHash)),
    ).toHaveTextContent(strings('transactions.activity_predictions_balance'));

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(withdrawHash),
    );
    expect(primaryAmount).toHaveTextContent(/^-/);
    expect(primaryAmount).toHaveTextContent(/USD|\$/);

    const secondaryAmount = await findByTestId(
      activityListRowSecondaryAmountTestId(withdrawHash),
    );
    expect(secondaryAmount).toHaveTextContent(/^-.*4,?000 USDC/);

    expect(
      await findByTestId(activityListRowAvatarSingleTestId(withdrawHash)),
    ).toBeOnTheScreen();
  });

  it('shows Claimed winnings under Predictions with market subtitle and + fiat primary', async () => {
    const claim = buildPredictClaimActivity();
    (
      Engine.context.PredictController.getActivity as jest.Mock
    ).mockResolvedValue([claim]);

    const state = initialStateActivityWithAccountsApi()
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

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(claim.id)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent(
      strings('predict.transactions.claim_title'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestId(claim.id)),
    ).toHaveTextContent(ACTIVITY_CV_PREDICT_MARKET_TITLE);

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(claim.id),
    );
    expect(primaryAmount).toHaveTextContent(/^\+/);
    expect(primaryAmount).toHaveTextContent(/\$/);

    expect(
      queryByTestId(activityListRowSecondaryAmountTestId(claim.id)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(claim.id)),
    ).toBeOnTheScreen();
  });

  it('shows Cashed out under Predictions with market subtitle and + fiat primary', async () => {
    const sell = buildPredictSellActivity();
    (
      Engine.context.PredictController.getActivity as jest.Mock
    ).mockResolvedValue([sell]);

    const state = initialStateActivityWithAccountsApi()
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

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(sell.id)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent(strings('predict.transactions.sell_title'));
    expect(
      await findByTestId(activityListRowSubtitleTestId(sell.id)),
    ).toHaveTextContent(ACTIVITY_CV_PREDICT_MARKET_TITLE);

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(sell.id),
    );
    expect(primaryAmount).toHaveTextContent(/^\+/);
    expect(primaryAmount).toHaveTextContent(/\$/);

    expect(
      queryByTestId(activityListRowSecondaryAmountTestId(sell.id)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(sell.id)),
    ).toBeOnTheScreen();
  });

  it('shows Prediction placed under Predictions with market subtitle and - fiat primary', async () => {
    const buy = buildPredictBuyActivity();
    (
      Engine.context.PredictController.getActivity as jest.Mock
    ).mockResolvedValue([buy]);

    const state = initialStateActivityWithAccountsApi()
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

    const title = await waitFor(
      () => findByTestId(activityListRowTitleTestId(buy.id)),
      { timeout: 10000 },
    );
    expect(title).toHaveTextContent(
      strings('transactions.activity_prediction_placed'),
    );
    expect(
      await findByTestId(activityListRowSubtitleTestId(buy.id)),
    ).toHaveTextContent(ACTIVITY_CV_PREDICT_MARKET_TITLE);

    const primaryAmount = await findByTestId(
      activityListRowPrimaryAmountTestId(buy.id),
    );
    expect(primaryAmount).toHaveTextContent(/^-/);
    expect(primaryAmount).toHaveTextContent(/\$/);

    expect(
      queryByTestId(activityListRowSecondaryAmountTestId(buy.id)),
    ).toBeNull();
    expect(
      await findByTestId(activityListRowAvatarSingleTestId(buy.id)),
    ).toBeOnTheScreen();
  });
});

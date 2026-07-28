import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';

import Routes from '../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderActivityScreenView,
  renderActivityScreenViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import {
  ACTIVITY_CV_ACCOUNT,
  activityLineaNetworkOverride,
  initialStateActivityWithAccountsApi,
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

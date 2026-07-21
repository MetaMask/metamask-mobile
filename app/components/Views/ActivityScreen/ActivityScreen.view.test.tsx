import '../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';

import Routes from '../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  renderActivityScreenView,
  renderActivityScreenViewWithRoutes,
} from '../../../../tests/component-view/renderers/activity';
import { activityLineaNetworkOverride } from '../../../../tests/component-view/presets/activity';
import { strings } from '../../../../locales/i18n';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import { ACTIVITY_TYPE_FILTER_LABEL_KEY } from './components/ActivityTypeFilterSheet';
import { PERPS_ACTIVITY_FILTER_LABEL_KEY } from './components/PerpsActivityFilterSheet';
import { ActivityTypeFilter, PerpsActivityFilter } from './types';

const optionTestId = (filter: ActivityTypeFilter) =>
  `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`;

const perpsOptionTestId = (filter: PerpsActivityFilter) =>
  `${ActivityScreenSelectorsIDs.PERPS_FILTER_OPTION_PREFIX}${filter}`;

// Chips now show plain value labels (no "Types:"/"Network:" prefix).
const selectedTypeFilterLabel = (filter: ActivityTypeFilter) =>
  strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter]);

const perpsFilterLabel = (filter: PerpsActivityFilter) =>
  strings(PERPS_ACTIVITY_FILTER_LABEL_KEY[filter]);

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

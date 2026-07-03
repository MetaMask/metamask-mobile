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
import { ActivityTypeFilter } from './types';

const optionTestId = (filter: ActivityTypeFilter) =>
  `${ActivityScreenSelectorsIDs.TYPE_FILTER_OPTION_PREFIX}${filter}`;

const selectedTypeFilterLabel = (filter: ActivityTypeFilter) =>
  strings('activity_view.filter_types_selected', {
    label: strings(ACTIVITY_TYPE_FILTER_LABEL_KEY[filter]),
  });

describeForPlatforms('ActivityScreen', () => {
  it('updates search text and selected type filter through the real screen controls', async () => {
    const { getByPlaceholderText, getByTestId, getAllByText, findByTestId } =
      renderActivityScreenView();

    const searchInput = getByPlaceholderText(
      strings('activity_view.search_placeholder'),
    );
    fireEvent.changeText(searchInput, 'swap');

    expect(searchInput).toHaveProp('value', 'swap');

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));

    expect(
      await findByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_SHEET),
    ).toBeOnTheScreen();

    fireEvent.press(await findByTestId(optionTestId(ActivityTypeFilter.Money)));

    // The label renders on both the in-list chip and its pinned copy.
    await waitFor(() => {
      expect(
        getAllByText(selectedTypeFilterLabel(ActivityTypeFilter.Money)).length,
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
      expect(
        getAllByText(
          strings('activity_view.filter_network_selected', {
            label: 'Linea',
          }),
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  it('disables the network filter chip when a single-network domain (Perps) is selected', async () => {
    const { getByTestId, findByTestId } = renderActivityScreenView();

    // Network chip starts enabled (default type filter is Transactions).
    expect(
      getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
    ).toBeEnabled();

    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(await findByTestId(optionTestId(ActivityTypeFilter.Perps)));

    await waitFor(() => {
      expect(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      ).toBeDisabled();
    });
  });

  it('clears a stale unsupported network to "All networks" when switching to Perps', async () => {
    const {
      getByTestId,
      getAllByText,
      queryAllByText,
      findByText,
      findByTestId,
    } = renderActivityScreenView({ overrides: activityLineaNetworkOverride });

    // Pick a network that Perps does not settle on.
    fireEvent.press(
      getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
    );
    fireEvent.press(await findByText('Linea'));
    await waitFor(() => {
      expect(
        getAllByText(
          strings('activity_view.filter_network_selected', { label: 'Linea' }),
        ).length,
      ).toBeGreaterThan(0);
    });

    // Switching to Perps drops the stale network so domain rows aren't hidden;
    // the chip reads "All networks" (we don't surface a specific network).
    fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.TYPE_FILTER_CHIP));
    fireEvent.press(await findByTestId(optionTestId(ActivityTypeFilter.Perps)));

    await waitFor(() => {
      expect(
        getAllByText(strings('activity_view.filter_all_networks')).length,
      ).toBeGreaterThan(0);
    });
    // The stale Linea selection is no longer shown anywhere.
    expect(
      queryAllByText(
        strings('activity_view.filter_network_selected', { label: 'Linea' }),
      ).length,
    ).toBe(0);
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

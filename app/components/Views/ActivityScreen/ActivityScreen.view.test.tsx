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
    const { getByPlaceholderText, getByTestId, getByText, findByTestId } =
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

    await waitFor(() => {
      expect(
        getByText(selectedTypeFilterLabel(ActivityTypeFilter.Money)),
      ).toBeOnTheScreen();
    });
  });

  it('updates the selected network filter through the real network sheet', async () => {
    const { getByTestId, getByText, findByText } = renderActivityScreenView({
      overrides: activityLineaNetworkOverride,
    });

    fireEvent.press(
      getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
    );
    fireEvent.press(await findByText('Linea'));

    await waitFor(() => {
      expect(
        getByText(
          strings('activity_view.filter_network_selected', {
            label: 'Linea',
          }),
        ),
      ).toBeOnTheScreen();
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

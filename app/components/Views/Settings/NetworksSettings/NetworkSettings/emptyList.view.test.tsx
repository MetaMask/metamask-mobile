import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../tests/component-view/render';
import { initialStateSettings } from '../../../../../../tests/component-view/presets/settings';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { CHAINLIST_URL } from '../../../../../constants/urls';
import EmptyPopularList from './emptyList';

const EMPTY_POPULAR_LIST_ROUTE = 'EmptyPopularList';

const EmptyPopularListScreen = (): React.JSX.Element => (
  <EmptyPopularList goToCustomNetwork={jest.fn()} />
);

const renderEmptyPopularList = (): ReturnType<typeof renderScreenWithRoutes> =>
  renderScreenWithRoutes(
    EmptyPopularListScreen,
    { name: EMPTY_POPULAR_LIST_ROUTE },
    [
      {
        name: Routes.BROWSER.HOME,
        Component: createRouteParamsProbe(Routes.BROWSER.HOME),
      },
    ],
    { state: initialStateSettings().build() },
  );

describeForPlatforms('EmptyPopularList', () => {
  it('opens Chainlist in the browser tab', async () => {
    const { getByText, findByTestId } = renderEmptyPopularList();

    fireEvent.press(
      getByText(strings('networks.add_other_network_here'), { exact: false }),
    );

    const routeParams = await findByTestId(
      getRouteParamsProbeTestId(Routes.BROWSER.HOME),
    );

    expect(routeParams).toBeOnTheScreen();
    expect(JSON.parse(routeParams.props.children)).toEqual(
      expect.objectContaining({
        newTabUrl: CHAINLIST_URL,
        timestamp: expect.any(Number),
      }),
    );
  });
});

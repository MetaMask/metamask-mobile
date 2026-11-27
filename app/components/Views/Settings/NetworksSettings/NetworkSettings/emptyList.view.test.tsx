import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  findRouteParams,
  renderWithBrowserHomeProbe,
} from '../../../../../../tests/component-view/render';
import { initialStateSettings } from '../../../../../../tests/component-view/presets/settings';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { CHAINLIST_URL } from '../../../../../constants/urls';
import EmptyPopularList from './emptyList';

const EmptyPopularListScreen = (): React.JSX.Element => (
  <EmptyPopularList goToCustomNetwork={jest.fn()} />
);

describeForPlatforms('EmptyPopularList', () => {
  it('opens Chainlist in the browser tab', async () => {
    const { getByText, findByTestId } = renderWithBrowserHomeProbe(
      EmptyPopularListScreen,
      initialStateSettings().build(),
    );

    fireEvent.press(
      getByText(strings('networks.add_other_network_here'), { exact: false }),
    );

    expect(await findRouteParams(findByTestId, Routes.BROWSER.HOME)).toEqual(
      expect.objectContaining({
        newTabUrl: CHAINLIST_URL,
        timestamp: expect.any(Number),
      }),
    );
  });
});

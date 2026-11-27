import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  findRouteParams,
  renderWithBrowserHomeProbe,
} from '../../../../../../tests/component-view/render';
import { initialStateTrending } from '../../../../../../tests/component-view/presets/trending';
import Routes from '../../../../../constants/navigation/Routes';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteTileRowItem from './SiteTileRowItem';
import { getSiteTileRowItemTestId } from './SiteTileRowItem.testIds';

const UNISWAP_SITE: SiteData = {
  id: '1',
  name: 'Uniswap',
  url: 'https://uniswap.org',
  displayUrl: 'uniswap.org',
  // Local logo skips the favicon fetch the default icon would make.
  logoSource: { uri: 'uniswap-logo' },
};

const SiteTileScreen = (): React.JSX.Element => (
  <SiteTileRowItem site={UNISWAP_SITE} />
);

describeForPlatforms('SiteTileRowItem', () => {
  it('opens the site in the browser tab', async () => {
    const { getByTestId, findByTestId } = renderWithBrowserHomeProbe(
      SiteTileScreen,
      initialStateTrending().build(),
    );

    fireEvent.press(getByTestId(getSiteTileRowItemTestId(UNISWAP_SITE.name)));

    expect(await findRouteParams(findByTestId, Routes.BROWSER.HOME)).toEqual(
      expect.objectContaining({
        newTabUrl: UNISWAP_SITE.url,
        fromTrending: true,
        timestamp: expect.any(Number),
      }),
    );
  });
});

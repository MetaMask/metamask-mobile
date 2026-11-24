import '../../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../../tests/component-view/render';
import { initialStateTrending } from '../../../../../../tests/component-view/presets/trending';
import Routes from '../../../../../constants/navigation/Routes';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import SiteTileRowItem from './SiteTileRowItem';
import { getSiteTileRowItemTestId } from './SiteTileRowItem.testIds';

const SITE_TILE_ROUTE = 'SiteTileRowItem';

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

const renderSiteTile = (): ReturnType<typeof renderScreenWithRoutes> =>
  renderScreenWithRoutes(
    SiteTileScreen,
    { name: SITE_TILE_ROUTE },
    [
      {
        name: Routes.BROWSER.HOME,
        Component: createRouteParamsProbe(Routes.BROWSER.HOME),
      },
    ],
    { state: initialStateTrending().build() },
  );

describeForPlatforms('SiteTileRowItem', () => {
  it('opens the site in the browser tab', async () => {
    const { getByTestId, findByTestId } = renderSiteTile();

    fireEvent.press(getByTestId(getSiteTileRowItemTestId(UNISWAP_SITE.name)));

    const routeParams = await findByTestId(
      getRouteParamsProbeTestId(Routes.BROWSER.HOME),
    );

    expect(routeParams).toBeOnTheScreen();
    expect(JSON.parse(routeParams.props.children)).toEqual(
      expect.objectContaining({
        newTabUrl: UNISWAP_SITE.url,
        fromTrending: true,
        timestamp: expect.any(Number),
      }),
    );
  });
});

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
import { SiteRowItem } from './SiteRowItem';
import { getSiteRowItemTestId } from './SiteRowItem.testIds';

const SITE_ROW_ROUTE = 'SiteRowItem';

const METAMASK_SITE: SiteData = {
  id: '1',
  name: 'MetaMask',
  url: 'https://metamask.io',
  displayUrl: 'metamask.io',
  // Local logo skips the favicon fetch the default icon would make.
  logoSource: { uri: 'metamask-logo' },
};

const SiteRowScreen = (): React.JSX.Element => (
  <SiteRowItem site={METAMASK_SITE} />
);

const renderSiteRow = (): ReturnType<typeof renderScreenWithRoutes> =>
  renderScreenWithRoutes(
    SiteRowScreen,
    { name: SITE_ROW_ROUTE },
    [
      {
        name: Routes.BROWSER.HOME,
        Component: createRouteParamsProbe(Routes.BROWSER.HOME),
      },
    ],
    { state: initialStateTrending().build() },
  );

describeForPlatforms('SiteRowItem', () => {
  it('opens the site in the browser tab', async () => {
    const { getByTestId, findByTestId } = renderSiteRow();

    fireEvent.press(getByTestId(getSiteRowItemTestId(METAMASK_SITE.name)));

    const routeParams = await findByTestId(
      getRouteParamsProbeTestId(Routes.BROWSER.HOME),
    );

    expect(routeParams).toBeOnTheScreen();
    expect(JSON.parse(routeParams.props.children)).toEqual(
      expect.objectContaining({
        newTabUrl: METAMASK_SITE.url,
        fromTrending: true,
        timestamp: expect.any(Number),
      }),
    );
  });
});

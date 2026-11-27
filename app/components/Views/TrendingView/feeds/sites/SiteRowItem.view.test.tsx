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
import { SiteRowItem } from './SiteRowItem';
import { getSiteRowItemTestId } from './SiteRowItem.testIds';

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

describeForPlatforms('SiteRowItem', () => {
  it('opens the site in the browser tab', async () => {
    const { getByTestId, findByTestId } = renderWithBrowserHomeProbe(
      SiteRowScreen,
      initialStateTrending().build(),
    );

    fireEvent.press(getByTestId(getSiteRowItemTestId(METAMASK_SITE.name)));

    expect(await findRouteParams(findByTestId, Routes.BROWSER.HOME)).toEqual(
      expect.objectContaining({
        newTabUrl: METAMASK_SITE.url,
        fromTrending: true,
        timestamp: expect.any(Number),
      }),
    );
  });
});

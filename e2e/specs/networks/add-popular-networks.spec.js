'use strict';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';
import NetworkView from '../../pages/Settings/NetworksView';
import SettingsView from '../../pages/Settings/SettingsView';
import NetworkAddedModal from '../../pages/modals/NetworkAddedModal';
import NetworkApprovalModal from '../../pages/modals/NetworkApprovalModal';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

const Arbitrum = 'Arbitrum One';

describe(Regression('Add all popular networks'), () => {
  beforeAll(async () => {
    jest.setTimeout(170000);
    await TestHelpers.reverseServerPort();
  });

  it(`Add all popular networks to verify the empty list content`, async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapSettings();
        await SettingsView.tapNetworks();
        await NetworkView.tapAddNetworkButton();
        await NetworkView.tapNetworkByName(Arbitrum);
        await NetworkApprovalModal.tapApproveButton();
        await NetworkAddedModal.tapCloseButton();
      },
    );
  });
});

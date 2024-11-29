'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/TabBarComponent';

import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';

import { PopularNetworksList } from '../../resources/networks.e2e';

import SettingsView from '../../pages/Settings/SettingsView';
import NetworksView from '../../pages/Settings/NetworksView';
import TestDApp from '../../pages/Browser/TestDApp';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import PermissionSummaryBottomSheet from '../../pages/Browser/PermissionSummaryBottomSheet';

describe(SmokeCore('MultiChain Permissions System:'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should remove network after connecting to dapp', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withNetworkController(PopularNetworksList.Polygon)
          .build(),
        restartDevice: true,
      },
      async () => {
        //should navigate to browser
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        //TODO: should re add connecting to an external swap step after detox has been updated

        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();

        await TabBarComponent.tapSettings();
        await SettingsView.tapNetworks();
        await NetworksView.longPressToRemoveNetwork(
          PopularNetworksList.Polygon.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();

        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(
          PermissionSummaryBottomSheet.addNetworkPermissionContainer,
        );
      },
    );
  });
});

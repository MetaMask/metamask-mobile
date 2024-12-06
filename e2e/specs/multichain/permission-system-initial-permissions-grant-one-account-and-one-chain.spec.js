'use strict';
import TestHelpers from '../../helpers';
import { SmokeMultiChain } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import ConnectedAccountsModal from '../../pages/Browser/ConnectedAccountsModal';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';

describe(SmokeMultiChain('MultiChain Permissions System:'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should grant initial permissions for one account and one chain', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().withPermissionController().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        await Browser.navigateToTestDApp();
        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();

        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
      },
    );
  });
});

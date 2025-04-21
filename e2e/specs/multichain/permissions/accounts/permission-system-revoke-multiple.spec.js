'use strict';
import TestHelpers from '../../../../helpers';
import Browser from '../../../../pages/Browser/BrowserView';
import AccountListBottomSheet from '../../../../pages/wallet/AccountListBottomSheet';
import TabBarComponent from '../../../../pages/wallet/TabBarComponent';
import ToastModal from '../../../../pages/wallet/ToastModal';
import ConnectedAccountsModal from '../../../../pages/Browser/ConnectedAccountsModal';
import NetworkListModal from '../../../../pages/Network/NetworkListModal';
import AddAccountBottomSheet from '../../../../pages/wallet/AddAccountBottomSheet';
import { loginToApp } from '../../../../viewHelper';
import FixtureBuilder from '../../../../fixtures/fixture-builder';
import { withFixtures } from '../../../../fixtures/fixture-helper';
import Assertions from '../../../../utils/Assertions';
import { SmokeNetworkExpansion } from '../../../../tags';

const AccountTwoText = 'Account 2';

describe(SmokeNetworkExpansion('Account Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('revokes all account permissions simultaneously', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
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
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfVisible(ConnectedAccountsModal.title);
        await TestHelpers.delay(2000);

        await Assertions.checkIfNotVisible(ToastModal.notificationTitle);
        await ConnectedAccountsModal.tapConnectMoreAccountsButton();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateAccount();
        if (device.getPlatform() === 'android') {
          await Assertions.checkIfTextIsDisplayed(AccountTwoText);
        }
        await AccountListBottomSheet.tapAccountIndex(0);
        await AccountListBottomSheet.tapConnectAccountsButton();

        // should revoke accounts
        await Browser.tapNetworkAvatarButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();

        await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
        // await ConnectedAccountsModal.tapDisconnectButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        await Browser.tapNetworkAvatarButtonOnBrowser();
        await Assertions.checkIfNotVisible(ConnectedAccountsModal.title);
        await Assertions.checkIfVisible(NetworkListModal.networkScroll);
        await NetworkListModal.swipeToDismissModal();
        await Assertions.checkIfNotVisible(NetworkListModal.networkScroll);
      },
    );
  });
});

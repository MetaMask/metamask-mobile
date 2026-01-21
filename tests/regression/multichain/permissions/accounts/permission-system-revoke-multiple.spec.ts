import TestHelpers from '../../../../helpers';
import Browser from '../../../../page-objects/Browser/BrowserView';
import AccountListBottomSheet from '../../../../page-objects/wallet/AccountListBottomSheet';
import ToastModal from '../../../../page-objects/wallet/ToastModal';
import ConnectedAccountsModal from '../../../../page-objects/Browser/ConnectedAccountsModal';
import NetworkListModal from '../../../../page-objects/Network/NetworkListModal';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../framework/fixtures/FixtureHelper';
import Assertions from '../../../../framework/Assertions';
import { RegressionNetworkExpansion } from '../../../../tags';
import AddNewAccountSheet from '../../../../page-objects/wallet/AddNewAccountSheet';
import { DappVariants } from '../../../../framework/Constants';

const AccountTwoText = 'Account 2';

describe(RegressionNetworkExpansion('Account Permission Management'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('revokes all account permissions simultaneously', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        //should navigate to browser
        await loginToApp();
        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        //TODO: should re add connecting to an external swap step after detox has been updated
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);

        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );
        await ConnectedAccountsModal.tapConnectMoreAccountsButton();
        await AccountListBottomSheet.tapAddAccountButton();
        await AccountListBottomSheet.tapAddEthereumAccountButton();
        await AddNewAccountSheet.tapConfirmButton();
        if (device.getPlatform() === 'android') {
          await Assertions.expectTextDisplayed(AccountTwoText);
        }
        await AccountListBottomSheet.tapAccountIndex(0);
        await AccountListBottomSheet.tapConnectAccountsButton();

        // should revoke accounts
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await ConnectedAccountsModal.tapManagePermissionsButton();

        await ConnectedAccountsModal.tapDisconnectAllAccountsAndNetworksButton();
        // await ConnectedAccountsModal.tapDisconnectButton();
        await ConnectedAccountsModal.tapConfirmDisconnectNetworksButton();

        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToNotBeVisible(
          ConnectedAccountsModal.title,
        );
        await Assertions.expectElementToBeVisible(
          NetworkListModal.networkScroll,
        );
        await NetworkListModal.swipeToDismissModal();
        await Assertions.expectElementToNotBeVisible(
          NetworkListModal.networkScroll,
        );
      },
    );
  });
});

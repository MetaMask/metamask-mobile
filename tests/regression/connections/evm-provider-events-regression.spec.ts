import { RegressionWalletPlatform } from '../../tags';
import Assertions from '../../framework/Assertions';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM,
} from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestDApp from '../../page-objects/Browser/TestDApp';
import Browser from '../../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../page-objects/Browser/ConnectedAccountsModal';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import { DappVariants } from '../../framework/Constants';
import ToastModal from '../../page-objects/wallet/ToastModal';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';

describe(RegressionWalletPlatform('EVM Provider Events'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should notify account changes when adding and removing a permitted account for a dapp', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();
        await Browser.tapNetworkAvatarOrAccountButtonOnBrowser();
        await Assertions.expectElementToBeVisible(ConnectedAccountsModal.title);
        await Assertions.expectElementToNotBeVisible(
          ToastModal.notificationTitle,
        );

        await ConnectedAccountsModal.tapManagePermissionsButton();
        await ConnectedAccountsModal.tapPermissionsSummaryTab();
        await ConnectedAccountsModal.tapNavigateToEditAccountsPermissionsButton();
        await AccountListBottomSheet.tapAccountByName('Account 2');
        await AccountListBottomSheet.tapConnectAccountsButton();
        const connectedAccountsAfterAdd = await TestDApp.getConnectedAccounts();
        if (
          connectedAccountsAfterAdd !==
          [DEFAULT_FIXTURE_ACCOUNT_CHECKSUM, DEFAULT_FIXTURE_ACCOUNT_2].join(
            ',',
          )
        ) {
          throw new Error(
            'connected accounts did not update when account was added',
          );
        }

        await ConnectedAccountsModal.tapNavigateToEditAccountsPermissionsButton();
        await AccountListBottomSheet.tapAccountByName('Account 1');
        await AccountListBottomSheet.tapConnectAccountsButton();
        const connectedAccountsAfterRemove =
          await TestDApp.getConnectedAccounts();
        if (connectedAccountsAfterRemove !== DEFAULT_FIXTURE_ACCOUNT_2) {
          throw new Error(
            'connected accounts did not update when account was removed',
          );
        }
      },
    );
  });

  it('should notify the dapp of the selected account after permitting a previously unpermitted dapp', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.navigateToTestDApp();

        const connectedAccountsBefore = await TestDApp.getConnectedAccounts();
        if (connectedAccountsBefore !== '') {
          throw new Error('accounts already connected');
        }

        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();

        const connectedAccountsAfter = await TestDApp.getConnectedAccounts();
        if (connectedAccountsAfter !== DEFAULT_FIXTURE_ACCOUNT) {
          throw new Error('account not connected');
        }
      },
    );
  });
});

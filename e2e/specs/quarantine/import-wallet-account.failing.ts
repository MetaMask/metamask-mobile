import { loginToApp } from '../../viewHelper';
import { SmokeAccounts } from '../../tags';
import Utilities from '../../framework/Utilities';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import CommonView from '../../pages/CommonView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

describe(SmokeAccounts('Import account via private to wallet'), () => {
  // This key is for testing private key import only
  // I should NEVER hold any eth or token
  const TEST_PRIVATE_KEY =
    'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

  beforeAll(async () => {
    jest.setTimeout(200000);
    // await TestHelpers.launchApp();
  });

  it('should be able to import account', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
        );
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapImportAccount();
        await Assertions.expectElementToBeVisible(ImportAccountView.container);

        // Tap on import button to make sure alert pops up
        await Utilities.waitForElementToBeEnabled(
          ImportAccountView.importButton,
        );
        await ImportAccountView.tapImportButton();
        await CommonView.tapOKAlertButton();
        await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
        await Assertions.expectElementToBeVisible(
          SuccessImportAccountView.container,
        );
        await SuccessImportAccountView.tapCloseButton();
        await AccountListBottomSheet.swipeToDismissAccountsModal();
        await Assertions.expectElementToBeVisible(WalletView.container);
        await Assertions.expectElementToNotHaveText(
          WalletView.accountName,
          'Account 1',
        );
      },
    );
  });
});

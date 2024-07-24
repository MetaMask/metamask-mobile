'use strict';
import { SmokeAccounts } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import { withFixtures } from '../../fixtures/fixture-helper.js';
import { loginToApp } from '../../viewHelper.js';
import WalletView from '../../pages/wallet/WalletView.js';
import AccountListView from '../../pages/AccountListView.js';
import ImportAccountView from '../../pages/ImportAccountView.js';
import { AccountListViewSelectorsIDs } from '../../selectors/AccountListView.selectors.js';
import Assertions from '../../utils/Assertions.js';
// import { WalletViewSelectorsText } from '../../selectors/wallet/WalletView.selectors.js';

// This key is for testing private key import only
// It should NEVER hold any eth or token
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const IMPORTED_ACCOUNT_NAME = 'Account 3';

describe(SmokeAccounts('Imported account remove and import'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    await device.launchApp();
  });

  it('remove imported account then import private key again', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        //make sure imported account is present
        await WalletView.tapIdenticon();
        await AccountListView.isVisible();
        await AccountListView.checkAccount3VisibilityAtIndex(2, true);

        await Assertions.checkIfElementToHaveText(
          WalletView.accountName,
          IMPORTED_ACCOUNT_NAME,
        );
        // await Assertions.checkIfElementToHaveText(
        //   AccountListView.accountTypeLabel,
        //   AccountListViewSelectorsIDs.ACCOUNT_TYPE_LABEL_TEXT,
        // );

        //remove the imported account
        await AccountListView.longPressImportedAccountThree();
        await AccountListView.tapYesToRemoveImportedAccountAlertButton();
        await Assertions.checkIfElementNotToHaveText(
          WalletView.accountName,
          IMPORTED_ACCOUNT_NAME,
        );

        //import account again
        await AccountListView.tapAddAccountButton();
        await AccountListView.tapImportAccountButton();
        await ImportAccountView.isVisible();
        await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
        await ImportAccountView.isImportSuccessSreenVisible();
        await ImportAccountView.tapCloseButtonOnImportSuccess();
        await AccountListView.checkAccount3VisibilityAtIndex(2, true);
        await Assertions.checkIfElementToHaveText(
          WalletView.accountName,
          IMPORTED_ACCOUNT_NAME,
        );
      },
    );
  });
});

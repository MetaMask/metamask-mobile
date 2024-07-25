'use strict';

import { SmokeAccounts } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import { withFixtures } from '../../fixtures/fixture-helper.js';
import { loginToApp } from '../../viewHelper.js';
import WalletView from '../../pages/wallet/WalletView.js';
import AccountListView from '../../pages/AccountListView.js';
import ImportAccountView from '../../pages/ImportAccountView.js';
import Assertions from '../../utils/Assertions.js';

// This key is for testing private key import only
// It should NEVER hold any eth or token
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const IMPORTED_LABEL = 'Imported';

const accountListView = new AccountListView();

describe(
  SmokeAccounts('removes and reimports an account using a private key'),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
      await device.launchApp();
    });

    it('removes an imported account and reimports it using a private key', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedAccountKeyringController()
            .build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Ensure imported account is present
          await verifyImportedAccountPresence();

          // Remove the imported account
          await removeImportedAccount();

          // Import account again
          await importAccountAgain();
        },
      );
    });
  },
);

async function verifyImportedAccountPresence() {
  await WalletView.tapIdenticon();
  await AccountListView.isVisible();
  await AccountListView.checkAccountVisibilityAtIndex(2, true);
  await Assertions.checkIfElementToHaveText(
    accountListView.accountTypeLabel,
    IMPORTED_LABEL,
  );
}

async function removeImportedAccount() {
  await AccountListView.longPressImportedAccountThree();
  await AccountListView.tapYesToRemoveImportedAccountAlertButton();
  await AccountListView.checkAccountVisibilityAtIndex(2, false);
  await Assertions.checkIfNotVisible(accountListView.accountTypeLabel);
}

async function importAccountAgain() {
  await AccountListView.tapAddAccountButton();
  await AccountListView.tapImportAccountButton();
  await ImportAccountView.isVisible();
  await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
  await ImportAccountView.isImportSuccessSreenVisible();
  await ImportAccountView.tapCloseButtonOnImportSuccess();
  await AccountListView.checkAccountVisibilityAtIndex(2, true);
  await Assertions.checkIfElementToHaveText(
    accountListView.accountTypeLabel,
    IMPORTED_LABEL,
  );
}

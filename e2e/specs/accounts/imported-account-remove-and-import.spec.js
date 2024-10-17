'use strict';

import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { loginToApp } from '../../viewHelper.js';
import WalletView from '../../pages/wallet/WalletView.js';
import AccountListView from '../../pages/AccountListView.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView.js';
import Assertions from '../../utils/Assertions.js';
import { AccountListViewSelectorsText } from '../../selectors/AccountListView.selectors.js';
import AddAccountModal from '../../pages/modals/AddAccountModal.js';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';

const fixtureServer = new FixtureServer();
// This key is for testing private key import only
// It should NEVER hold any eth or token
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';

describe(
  Regression('removes and reimports an account using a private key'),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
      const fixture = new FixtureBuilder()
        .withImportedAccountKeyringController()
        .build();
      await startFixtureServer(fixtureServer);
      await loadFixture(fixtureServer, { fixture });
      await device.launchApp({
        launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
      });
      await loginToApp();
    });

    afterAll(async () => {
      await stopFixtureServer(fixtureServer);
    });

    it('removes an imported account and imports it again using a private key', async () => {
      // Ensure imported account is present
      await WalletView.tapIdenticon();

      // Remove the imported account
      await AccountListView.longPressImportedAccount();
      await AccountListView.tapYesToRemoveImportedAccountAlertButton();
      await Assertions.checkIfNotVisible(AccountListView.accountTypeLabel);

      // Import account again
      await AccountListView.tapAddAccountButton();
      await AddAccountModal.tapImportAccount();
      await Assertions.checkIfVisible(ImportAccountView.container);
      await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
      await Assertions.checkIfVisible(SuccessImportAccountView.container);
      await SuccessImportAccountView.tapCloseButton();
      await Assertions.checkIfElementToHaveText(
        AccountListView.accountTypeLabel,
        AccountListViewSelectorsText.ACCOUNT_TYPE_LABEL_TEXT,
      );
    });
  },
);

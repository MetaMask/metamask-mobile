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
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView.js';
import Assertions from '../../utils/Assertions.js';
import { AccountListBottomSheetSelectorsText } from '../../selectors/wallet/AccountListBottomSheet.selectors.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet.js';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';

const fixtureServer = new FixtureServer();
// This key is for testing private key import only
// It should NEVER hold any eth or token
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const ACCOUNT_INDEX = 1;

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
      await TestHelpers.launchApp({
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
      await AccountListBottomSheet.longPressAccountAtIndex(ACCOUNT_INDEX);
      await AccountListBottomSheet.tapYesToRemoveImportedAccountAlertButton();
      await Assertions.checkIfNotVisible(AccountListBottomSheet.accountTypeLabel);

      // Import account again
      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapImportAccount();
      await Assertions.checkIfVisible(ImportAccountView.container);
      await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
      await Assertions.checkIfVisible(SuccessImportAccountView.container);
      await SuccessImportAccountView.tapCloseButton();

      const tagElement = await AccountListBottomSheet.accountTagLabel;
      const tagElementAttribute = await tagElement.getAttributes();
      const tagLabel = tagElementAttribute.label;

      // Check if the account type label is visible
      await Assertions.checkIfTextMatches(
        tagLabel,
        AccountListBottomSheetSelectorsText.ACCOUNT_TYPE_LABEL_TEXT,
      );
    });
  },
);

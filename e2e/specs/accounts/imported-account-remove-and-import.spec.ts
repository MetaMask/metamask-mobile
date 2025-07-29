'use strict';

import { Regression } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import Assertions from '../../framework/Assertions';
import { AccountListBottomSheetSelectorsText } from '../../selectors/wallet/AccountListBottomSheet.selectors';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';

// This key is for testing private key import only
// It should NEVER hold any eth or token
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const ACCOUNT_INDEX = 1;

describe(
  Regression('removes and reimports an account using a private key'),
  () => {
    it('removes an imported account and imports it again using a private key', async () => {
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
          await WalletView.tapIdenticon();

          // Remove the imported account
          await AccountListBottomSheet.longPressAccountAtIndex(ACCOUNT_INDEX);
          await AccountListBottomSheet.tapYesToRemoveImportedAccountAlertButton();
          await Assertions.expectElementToNotBeVisible(
            AccountListBottomSheet.accountTypeLabel,
          );

          // Import account again
          await AccountListBottomSheet.tapAddAccountButton();
          await AddAccountBottomSheet.tapImportAccount();
          await Assertions.expectElementToBeVisible(
            ImportAccountView.container,
          );
          await ImportAccountView.enterPrivateKey(TEST_PRIVATE_KEY);
          await Assertions.expectElementToBeVisible(
            SuccessImportAccountView.container,
          );
          await SuccessImportAccountView.tapCloseButton();

          // Check if the account type label is visible
          await Assertions.expectElementToHaveLabel(
            AccountListBottomSheet.accountTagLabel,
            AccountListBottomSheetSelectorsText.ACCOUNT_TYPE_LABEL_TEXT,
            {
              description: 'Account type label',
            },
          );
        },
      );
    });
  },
);

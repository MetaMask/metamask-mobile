'use strict';

import { RegressionAccounts } from '../../tags.js';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import Assertions from '../../../tests/framework/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import { AccountListBottomSheetSelectorsText } from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../pages/MultichainAccounts/DeleteAccount';

// This key is for testing private key import only
// It should NEVER hold any eth or token
const TEST_PRIVATE_KEY =
  'cbfd798afcfd1fd8ecc48cbecb6dc7e876543395640b758a90e11d986e758ad1';
const ACCOUNT_INDEX = 1;

describe(
  RegressionAccounts('removes and reimports an account using a private key'),
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
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(
            ACCOUNT_INDEX,
          );
          await AccountDetails.tapDeleteAccountLink();
          await DeleteAccount.tapDeleteAccount();

          // Import account again
          await WalletView.tapIdenticon();
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

          await Assertions.expectTextDisplayed(
            AccountListBottomSheetSelectorsText.ACCOUNT_TYPE_LABEL_TEXT,
            {
              description: 'Account should be labeled as Imported',
            },
          );
        },
      );
    });
  },
);

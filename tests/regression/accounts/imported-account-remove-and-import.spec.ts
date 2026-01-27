'use strict';

import { RegressionAccounts } from '../../../e2e/tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import AccountListBottomSheet from '../../../e2e/pages/wallet/AccountListBottomSheet.ts';
import ImportAccountView from '../../../e2e/pages/importAccount/ImportAccountView.ts';
import Assertions from '../../framework/Assertions.ts';
import AddAccountBottomSheet from '../../../e2e/pages/wallet/AddAccountBottomSheet.ts';
import SuccessImportAccountView from '../../../e2e/pages/importAccount/SuccessImportAccountView.ts';
import { AccountListBottomSheetSelectorsText } from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds.ts';
import AccountDetails from '../../../e2e/pages/MultichainAccounts/AccountDetails.ts';
import DeleteAccount from '../../../e2e/pages/MultichainAccounts/DeleteAccount.ts';

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

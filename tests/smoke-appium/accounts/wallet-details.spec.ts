import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  loginAndOpenAccountList,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import { completeSrpQuiz } from '../../flows/accounts.flow.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails.js';
import WalletDetails from '../../page-objects/MultichainAccounts/WalletDetails.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { defaultGanacheOptions } from '../../framework/Constants.js';

appiumTest.describe(SmokeAccounts('Wallet details'), () => {
  const FIRST = 0;

  appiumTest(
    'goes to the wallet details, creates an account and exports srp',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginAndOpenAccountList({ scenarioType: 'e2e' });
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(FIRST);
          await AccountDetails.tapEditWalletName();
          await Assertions.expectTextDisplayed('Wallet 1', {
            description: 'Wallet 1 should be visible',
          });

          await WalletDetails.tapCreateAccount();
          const visibleAccounts = ['Account 1', 'Account 2', 'Account 3'];
          for (const accountName of visibleAccounts) {
            await AccountListBottomSheet.expectAccountVisibleByNameV2(
              accountName,
              { description: `${accountName} should be visible` },
            );
          }

          await WalletDetails.tapSRP();
          await completeSrpQuiz(defaultGanacheOptions.mnemonic);

          await TabBarComponent.tapWallet();
          await waitForWalletHomePlaywright();

          await WalletView.tapIdenticon();
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            {
              description:
                'Account list should be open after tapping identicon',
            },
          );
          for (const accountName of visibleAccounts) {
            await AccountListBottomSheet.expectAccountVisibleByNameV2(
              accountName,
              {
                description: `${accountName} should be visible`,
                timeout: 15_000,
              },
            );
          }
        },
      );
    },
  );
});

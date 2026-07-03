import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  loginAndOpenAccountList,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import { assertAccountCount } from '../../flows/accounts.flow.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails.js';
import AddressList from '../../page-objects/MultichainAccounts/AddressList.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';

appiumTest.describe(SmokeAccounts('Create wallet accounts - multi-SRP'), () => {
  appiumTest(
    'creates accounts across multiple SRPs and verifies new account details',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginAndOpenAccountList({ scenarioType: 'e2e' });

          await AccountListBottomSheet.tapCreateAccount(0);
          await AccountListBottomSheet.tapCreateAccount(1);

          // Counting cells verifies accounts were created across both SRPs.
          const expectedAccountCounts: Record<string, number> = {
            'Account 2': 2,
            'Account 3': 1,
          };
          for (const [accountName, expectedCount] of Object.entries(
            expectedAccountCounts,
          )) {
            await assertAccountCount(accountName, expectedCount);
          }

          await AccountListBottomSheet.scrollToBottomOfAccountList();
          await AccountListBottomSheet.tapAccountByNameV2('Account 3');
          await waitForWalletHomePlaywright();

          await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapAccountEllipsisForAccountNameV2(
            'Account 3',
          );
          await AccountDetails.tapNetworksLink();

          for (const networkName of [
            'Ethereum Main Network',
            'Linea Main Network',
            'Solana',
          ]) {
            await AddressList.expectNetworkDisplayed(networkName);
          }

          await AddressList.tapBackButton();
          await AccountDetails.tapBackButton();

          try {
            await Assertions.expectElementToBeVisible(
              AccountListBottomSheet.accountList,
              { timeout: 5_000, description: 'Account list after navigation' },
            );
            await AccountListBottomSheet.tapAccountByNameV2('Account 3');
          } catch {
            // Account list already dismissed — Account 3 remains selected.
          }

          await waitForWalletHomePlaywright(60_000);
          await Assertions.expectElementToHaveText(
            WalletView.accountName,
            'Account 3',
            {
              description: 'Selected account header should read Account 3',
            },
          );
        },
      );
    },
  );
});

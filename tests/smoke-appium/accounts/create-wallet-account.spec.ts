import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  dismissToWalletHomePlaywright,
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
            await assertAccountCount(accountName, expectedCount, 15_000);
          }

          // Account 3 is created on the first SRP (near the top). Scrolling to the
          // bottom first scrolls it off-screen and breaks Android taps.
          await AccountListBottomSheet.expectAccountVisibleByNameV2(
            'Account 3',
            {
              description: 'Account 3 should be visible after creation',
              timeout: 15_000,
            },
          );
          await AccountListBottomSheet.tapAccountByNameV2('Account 3', true);
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
            await AccountListBottomSheet.waitForAccountListVisible(10_000);
            await AccountListBottomSheet.tapAccountByNameV2('Account 3', true);
          } catch {
            // Account list already dismissed — Account 3 remains selected.
          }

          await dismissToWalletHomePlaywright();
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

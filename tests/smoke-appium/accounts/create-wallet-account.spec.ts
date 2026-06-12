import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails.js';
import AddressList from '../../page-objects/MultichainAccounts/AddressList.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import Utilities from '../../framework/Utilities.js';

appiumTest.describe(SmokeAccounts('Create wallet accounts - multi-SRP'), () => {
  // 0-based index of the last rendered account in the V2 list.
  // Verify empirically on first device run and update if it changes.
  const LAST_INDEX = 3;

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
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupMockRequest(mockServer, {
              requestMethod: 'GET',
              url: /^https:\/\/api\.merkl\.xyz\/v4\/users\/[a-zA-Z0-9]+\/rewards(\?|$)/,
              response: [],
              responseCode: 200,
            });
          },
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await WalletView.tapIdenticon();

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            { description: 'Account list should be visible' },
          );

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
            await Utilities.executeWithRetry(
              async () => {
                const cells =
                  await AccountListBottomSheet.getAccountElementsByAccountNameV2(
                    accountName,
                  );
                await Assertions.checkIfArrayHasLength(cells, expectedCount);
              },
              {
                description: `${accountName} should appear in ${expectedCount} cell(s)`,
              },
            );
          }

          await AccountListBottomSheet.scrollToBottomOfAccountList();
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(LAST_INDEX);
          await AccountDetails.tapNetworksLink();

          for (const networkName of [
            'Ethereum Main Network',
            'Linea Main Network',
            'Solana',
          ]) {
            await Assertions.expectTextDisplayed(networkName, {
              description: `${networkName} should be visible in the networks list`,
            });
          }

          await AddressList.tapBackButton();
          await AccountDetails.tapBackButton();

          await AccountListBottomSheet.tapAccountByNameV2('Account 3');

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description:
              'WalletView container should be visible after switching account',
          });
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

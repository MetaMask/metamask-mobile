import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetailsV2,
} from '../../helpers/multichain-accounts/common.js';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails.js';
import DeleteAccount from '../../page-objects/MultichainAccounts/DeleteAccount.js';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers.js';
import { Utilities } from '../../framework/index.js';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccountLink();
  await Assertions.expectElementToBeVisible(DeleteAccount.container);
  await DeleteAccount.tapDeleteAccount();
};

const assertAccountCount = async (
  accountName: string,
  expectedCount: number,
): Promise<void> => {
  await Utilities.executeWithRetry(
    async () => {
      const accountElements =
        await AccountListBottomSheet.getAccountElementsByAccountNameV2(
          accountName,
        );
      return accountElements.length === expectedCount;
    },
    {
      description: `Count accounts with name "${accountName}" in the account list`,
      timeout: 5000,
      interval: 500,
    },
  );
};

appiumTest.describe(
  SmokeAccounts('Multichain Accounts: Account Details'),
  () => {
    appiumTest(
      'deletes the account',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withImportedHdKeyringAndTwoDefaultAccountsSimpleKeyPairAccount()
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
            );

            await assertAccountCount('Imported Account 1', 1);

            await goToAccountDetailsV2({
              ...SIMPLE_KEYPAIR_ACCOUNT,
              index: 2,
            });
            await deleteAccount();
            // Go back to account list
            await WalletView.tapIdenticon();

            // Assert that the account is no longer present in the account list
            await assertAccountCount('Imported Account 1', 0);
          },
        );
      },
    );
  },
);

import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  SIMPLE_KEYPAIR_ACCOUNT,
  goToAccountDetailsV2,
} from '../../helpers/multichain-accounts/common.js';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails.js';
import DeleteAccount from '../../page-objects/MultichainAccounts/DeleteAccount.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { loginAndOpenAccountList } from '../../flows/wallet.flow.js';
import { assertAccountCount } from '../../flows/accounts.flow.js';

const deleteAccount = async () => {
  await AccountDetails.tapDeleteAccountLink();
  await Assertions.expectElementToBeVisible(DeleteAccount.container);
  await DeleteAccount.tapDeleteAccount();
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
          },
          async () => {
            await loginAndOpenAccountList({ scenarioType: 'e2e' });

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

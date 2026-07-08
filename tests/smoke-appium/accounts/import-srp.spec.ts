import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginAndOpenAccountList } from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import Assertions from '../../framework/Assertions.js';
import ImportSrpView from '../../page-objects/importSrp/ImportSrpView.js';
import {
  inputSrp,
  openImportSrpFromAccountList,
} from '../../flows/accounts.flow.js';
import { IDENTITY_TEAM_SEED_PHRASE } from '../../smoke/identity/utils/constants.js';

// We now have account indexes "per wallets", thus the new account for that new SRP (wallet), will
// be: "Account 1".
const IMPORTED_ACCOUNT_NAME = 'Account 1';

appiumTest.describe(SmokeAccounts('Multichain import SRP account'), () => {
  appiumTest(
    'should import account with SRP',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginAndOpenAccountList({ scenarioType: 'e2e' });
          await openImportSrpFromAccountList();
          await inputSrp(IDENTITY_TEAM_SEED_PHRASE);
          await ImportSrpView.tapImportButton();
          await Assertions.expectElementToHaveText(
            WalletView.accountName,
            IMPORTED_ACCOUNT_NAME,
            {
              description: `Expect selected account to be ${IMPORTED_ACCOUNT_NAME}`,
            },
          );
        },
      );
    },
  );
});

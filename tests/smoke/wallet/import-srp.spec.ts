import { SmokeWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import { loginToApp } from '../../../e2e/viewHelper';
import Assertions from '../../framework/Assertions';
import ImportSrpView from '../../../e2e/pages/importSrp/ImportSrpView';
import { goToImportSrp, inputSrp } from '../../flows/accounts.flow.ts';
import { IDENTITY_TEAM_SEED_PHRASE } from '../../../e2e/specs/identity/utils/constants';

// We now have account indexes "per wallets", thus the new account for that new SRP (wallet), will
// be: "Account 1".
const IMPORTED_ACCOUNT_NAME = 'Account 1';

describe(SmokeWalletPlatform('Multichain import SRP account'), () => {
  it('should import account with SRP', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await goToImportSrp();
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
  });
});

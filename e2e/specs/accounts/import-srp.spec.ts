import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../../tests/framework/Assertions';
import ImportSrpView from '../../pages/importSrp/ImportSrpView';
import { goToImportSrp, inputSrp } from '../multisrp/utils';
import { IDENTITY_TEAM_SEED_PHRASE } from '../identity/utils/constants';

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

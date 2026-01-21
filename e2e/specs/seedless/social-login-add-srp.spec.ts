import { SmokeAccounts } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import ImportSrpView from '../../pages/importSrp/ImportSrpView';
import { Mockttp } from 'mockttp';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { goToImportSrp, inputSrp } from '../multisrp/utils';
import { IDENTITY_TEAM_SEED_PHRASE_2 } from '../identity/utils/constants';

const IMPORTED_ACCOUNT_NAME = 'Account 1';

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureMultichainAccountsAccountDetailsV2(true),
  );
};

describe(SmokeAccounts('Social Login - Add New SRP'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('should allow social login user to import a new SRP', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        // Login to app
        await loginToApp();

        // Verify user is on Wallet screen
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Navigate to Import SRP flow
        await goToImportSrp();

        // Enter the SRP to import
        await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);

        // Tap Import button
        await ImportSrpView.tapImportButton();

        // Verify the new account from imported SRP is active
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

import { Mockttp } from 'mockttp';

import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import Assertions from '../../../tests/framework/Assertions';

import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import ImportSrpView from '../../pages/importSrp/ImportSrpView';

import { createOAuthMockttpService } from '../../../tests/api-mocking/seedless-onboarding';
import { E2EOAuthHelpers } from '../../module-mocking/oauth';
import { SmokeWalletPlatform } from '../../tags';
import { IDENTITY_TEAM_SEED_PHRASE } from '../identity/utils/constants';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { completeGoogleNewUserOnboarding } from './utils';

const IMPORTED_ACCOUNT_NAME = 'Account 1';

describe(SmokeWalletPlatform('Google Login - Add New SRP'), () => {
  beforeAll(async () => {
    jest.setTimeout(300000);
  });

  beforeEach(async () => {
    E2EOAuthHelpers.reset();
    E2EOAuthHelpers.configureGoogleNewUser();
  });

  it('creates wallet with Google login and adds a new SRP', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          const oAuthMockttpService = createOAuthMockttpService();
          oAuthMockttpService.configureGoogleNewUser();
          await oAuthMockttpService.setup(mockServer);

          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(true),
          );
        },
      },
      async () => {
        // user onboarding
        await completeGoogleNewUserOnboarding();

        // Navigate to Import SRP flow
        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account list should be visible',
          },
        );

        await AccountListBottomSheet.tapAddAccountButton();

        await AddAccountBottomSheet.tapImportSrp();

        await Assertions.expectElementToBeVisible(ImportSrpView.container, {
          description: 'Import SRP screen should be visible',
        });

        // Enter the SRP
        await ImportSrpView.enterSrp(IDENTITY_TEAM_SEED_PHRASE);

        await ImportSrpView.tapImportButton();

        // Verify the imported account is selected
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

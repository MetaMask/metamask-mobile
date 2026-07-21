import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import AddAccountBottomSheet from '../../page-objects/wallet/AddAccountBottomSheet.js';
import ImportSrpView from '../../page-objects/importSrp/ImportSrpView.js';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { IDENTITY_TEAM_SEED_PHRASE } from '../../smoke/identity/utils/constants.js';
import type { Mockttp } from 'mockttp';
import {
  completeGoogleNewUserOnboarding,
  setupGoogleNewUserOAuthMock,
} from './helpers/seedless-helpers.js';

const IMPORTED_ACCOUNT_NAME = 'Account 1';

const googleNewUserWithFeatureFlagsMock = async (
  mockServer: Mockttp,
): Promise<void> => {
  await setupGoogleNewUserOAuthMock(mockServer);
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
    predictGtmOnboardingModalEnabled: {
      enabled: false,
      minimumVersion: '7.60.0',
    },
  });
};

appiumTest.describe(
  SmokeSeedlessOnboarding('Google Login - Add New SRP'),
  () => {
    appiumTest(
      'creates wallet with Google login and adds a new SRP',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder({ onboarding: true }).build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: googleNewUserWithFeatureFlagsMock,
          },
          async () => {
            await completeGoogleNewUserOnboarding();

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

            await ImportSrpView.enterSrp(IDENTITY_TEAM_SEED_PHRASE);

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
  },
);

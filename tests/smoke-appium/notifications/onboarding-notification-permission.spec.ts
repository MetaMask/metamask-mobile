import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  importWalletWithRecoveryPhrase,
  dismissOnboardingInterestQuestionnaire,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import OnboardingNotificationPermissionView from '../../page-objects/Onboarding/OnboardingNotificationPermissionView.js';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../../smoke/identity/utils/constants.js';

// Requested built-app regression: CV cannot validate native module linkage and
// the complete SRP import transition. CV covers consent/state behavior. The smoke
// driver grants/accepts permission by default; actual OS denial is manual QA.
appiumTest.describe(
  SmokeWalletPlatform('Onboarding notification permission'),
  () => {
    appiumTest(
      'enables notifications after importing a wallet',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withOnboardingFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: async (mockServer) => {
              await setupRemoteFeatureFlagsMock(mockServer, {
                assetsNotificationsEnabled: true,
                assetsEnableNotificationsByDefault: true,
              });
            },
          },
          async () => {
            await importWalletWithRecoveryPhrase({
              seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
              password: IDENTITY_TEAM_PASSWORD,
              optInToMarketing: false,
              stopAtNotificationPermission: true,
            });
            await OnboardingNotificationPermissionView.enable();
            await dismissOnboardingInterestQuestionnaire();
            await waitForWalletHomePlaywright();
          },
        );
      },
    );
  },
);

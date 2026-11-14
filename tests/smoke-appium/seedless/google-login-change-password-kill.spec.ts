import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import SettingsView from '../../page-objects/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import ChangePasswordView from '../../page-objects/Settings/SecurityAndPrivacy/ChangePasswordView.js';
import {
  TEST_PASSWORD,
  armSeedlessPasswordChangeKillAfter,
  completeGoogleNewUserOnboarding,
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER,
  setupGoogleNewUserOAuthMock,
  terminateAndRelaunchApp,
  unlockApp,
  waitForSeedlessPasswordChangeKillReady,
  type SeedlessPasswordChangeKillAfter,
} from './helpers/seedless-helpers.js';

const NEW_PASSWORD = 'NewPass456!@#';

const WAVE_2_KILLS: SeedlessPasswordChangeKillAfter[] = [
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.SeedlessChangePassword,
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeyringChange,
  SEEDLESS_PASSWORD_CHANGE_KILL_AFTER.KeySyncPending,
];

/**
 * Layer gate: process death after a persisted hop. CV cannot cold-start the
 * OS process. Integration cannot terminate the app. Unlock recovery after
 * kill is the device boundary.
 *
 * The app arms the hop via deep link, persists, then halts
 * (`#seedless-password-change-kill-ready`). Appium terminates then; it does
 * not sleep against TOPRF.
 *
 * Skipped with the TO-678 change-password smoke until that path is green.
 */
appiumTest.describe.skip(
  SmokeSeedlessOnboarding('Google Login - Change Password Kill'),
  () => {
    for (const hop of WAVE_2_KILLS) {
      appiumTest(
        `kills after ${hop} then unlocks with the new password`,
        async ({ driver: _driver, currentDeviceDetails }) => {
          await withFixtures(
            {
              fixture: new FixtureBuilder({ onboarding: true }).build(),
              restartDevice: true,
              currentDeviceDetails,
              testSpecificMock: setupGoogleNewUserOAuthMock,
            },
            async () => {
              await completeGoogleNewUserOnboarding();

              await TabBarComponent.tapSettings();
              await SettingsView.tapSecurityAndPrivacy();
              await SecurityAndPrivacy.scrollToChangePassword();
              await SecurityAndPrivacy.tapChangePassword();

              await armSeedlessPasswordChangeKillAfter(hop);

              await ChangePasswordView.changePassword(
                TEST_PASSWORD,
                NEW_PASSWORD,
              );

              await waitForSeedlessPasswordChangeKillReady();
              await terminateAndRelaunchApp(currentDeviceDetails);
              await unlockApp(NEW_PASSWORD);
            },
          );
        },
      );
    }
  },
);

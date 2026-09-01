import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import SettingsView from '../../page-objects/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import ChangePasswordView from '../../page-objects/Settings/SecurityAndPrivacy/ChangePasswordView.js';
import ToastModal from '../../page-objects/wallet/ToastModal.js';
import { ChangePasswordViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/ChangePasswordView.selectors.js';
import {
  TEST_PASSWORD,
  completeGoogleNewUserOnboarding,
  lockApp,
  setupGoogleNewUserOAuthMock,
  unlockApp,
} from './helpers/seedless-helpers.js';

const NEW_PASSWORD = 'NewPass456!@#';

/**
 * TO-678: Seedless change password after Google mock onboard.
 * Asserts success toast, then lock/unlock with the new password.
 */
appiumTest.describe(
  SmokeSeedlessOnboarding('Google Login - Change Password'),
  () => {
    appiumTest(
      'changes password after seedless onboarding and unlocks with new password',
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

            // changePassword waits for ResetPassword screen testID (not the
            // Settings "Change password" button text, which is ambiguous).
            await ChangePasswordView.changePassword(
              TEST_PASSWORD,
              NEW_PASSWORD,
            );

            await Assertions.expectElementToBeVisible(
              ToastModal.notificationTitle,
              {
                description:
                  'Password updated toast should appear after successful change',
                timeout: 30000,
              },
            );
            await Assertions.expectElementToHaveText(
              ToastModal.notificationTitle,
              ChangePasswordViewSelectorsText.PASSWORD_UPDATED_TOAST,
              {
                description: 'Toast title should say password was saved',
              },
            );

            await Assertions.expectElementToBeVisible(
              SecurityAndPrivacy.securityAndPrivacyHeading,
              {
                description:
                  'Should return to Security & Privacy after password change',
                timeout: 15000,
              },
            );

            await lockApp();
            await unlockApp(NEW_PASSWORD);
          },
        );
      },
    );
  },
);

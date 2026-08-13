import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  FIXTURE_PASSWORD,
  lockApp,
  loginWithFixturePassword,
  unlockApp,
} from './helpers/seedless-helpers.js';

/**
 * Device smoke: lock / unlock via keychain + login screen.
 * Does not re-run Google onboard (covered by google-login-new-user).
 */
appiumTest.describe(
  SmokeSeedlessOnboarding('Google Login - Lock and Unlock'),
  () => {
    appiumTest(
      'locks and unlocks a fixture wallet',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginWithFixturePassword();

            await lockApp();

            await unlockApp(FIXTURE_PASSWORD);
          },
        );
      },
    );
  },
);

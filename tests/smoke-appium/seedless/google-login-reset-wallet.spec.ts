import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  lockApp,
  loginWithFixturePassword,
  resetWallet,
} from './helpers/seedless-helpers.js';

/**
 * Device smoke: reset wallet from the login screen (native vault wipe).
 * Does not re-run Google onboard (covered by google-login-new-user).
 */
appiumTest.describe(
  SmokeSeedlessOnboarding('Google Login - Reset Wallet'),
  () => {
    appiumTest(
      'locks a fixture wallet and resets it from the login screen',
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

            await resetWallet();
          },
        );
      },
    );
  },
);

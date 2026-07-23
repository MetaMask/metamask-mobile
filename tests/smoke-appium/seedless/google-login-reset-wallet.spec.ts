import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { PlatformDetector } from '../../framework/PlatformLocator.js';
import {
  completeGoogleNewUserOnboarding,
  lockApp,
  loginWithFixturePassword,
  resetWallet,
  setupGoogleNewUserOAuthMock,
} from './helpers/seedless-helpers.js';

appiumTest.describe(
  SmokeSeedlessOnboarding('Google Login - Reset Wallet'),
  () => {
    appiumTest(
      'onboards with Google login, locks, and resets the wallet',
      async ({ driver: _driver, currentDeviceDetails }) => {
        const fixture = PlatformDetector.isIOS()
          ? new FixtureBuilder().build()
          : new FixtureBuilder({ onboarding: true }).build();

        await withFixtures(
          {
            fixture,
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupGoogleNewUserOAuthMock,
          },
          async () => {
            if (PlatformDetector.isIOS()) {
              await loginWithFixturePassword();
            } else {
              await completeGoogleNewUserOnboarding();
            }

            await lockApp();

            await resetWallet();
          },
        );
      },
    );
  },
);

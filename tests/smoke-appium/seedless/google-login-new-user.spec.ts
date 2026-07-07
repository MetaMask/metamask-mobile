import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  completeGoogleNewUserOnboarding,
  setupGoogleNewUserOAuthMock,
} from './helpers/seedless-helpers.js';

appiumTest.describe(SmokeSeedlessOnboarding('Google Login - New User'), () => {
  appiumTest(
    'creates a new wallet with Google login',
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
        },
      );
    },
  );
});

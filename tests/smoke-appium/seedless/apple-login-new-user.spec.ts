import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  completeAppleNewUserOnboarding,
  setupAppleNewUserOAuthMock,
} from './helpers/seedless-helpers.js';

appiumTest.describe(SmokeSeedlessOnboarding('Apple Login - New User'), () => {
  appiumTest(
    'creates a new wallet with Apple login',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder({ onboarding: true }).build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: setupAppleNewUserOAuthMock,
        },
        async () => {
          await completeAppleNewUserOnboarding();
        },
      );
    },
  );
});

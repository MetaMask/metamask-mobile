import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSeedlessOnboarding } from '../../tags.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  completeTelegramNewUserOnboarding,
  setupTelegramNewUserOAuthMock,
} from './helpers/seedless-helpers.js';

/**
 * Device smoke: Telegram OAuth mock → password → wallet home.
 * Screen-level UI belongs in component-view tests.
 */
appiumTest.describe(
  SmokeSeedlessOnboarding('Telegram Login - New User'),
  () => {
    appiumTest(
      'creates a new wallet with Telegram login',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder({ onboarding: true }).build(),
            restartDevice: true,
            currentDeviceDetails,
            testSpecificMock: setupTelegramNewUserOAuthMock,
          },
          async () => {
            await completeTelegramNewUserOnboarding();
          },
        );
      },
    );
  },
);

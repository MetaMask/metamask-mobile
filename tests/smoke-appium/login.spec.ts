import { test as appiumTest } from '../framework/fixtures/playwright/index.js';
import { SmokeAppium } from '../tags.js';
import { loginToApp, loginToAppPlaywright } from '../flows/wallet.flow.js';
import TabBarComponent from '../page-objects/wallet/TabBarComponent.js';
import SettingsView from '../page-objects/Settings/SettingsView.js';
import SecurityAndPrivacy from '../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import FixtureBuilder from '../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../framework/fixtures/FixtureHelper.js';
import Assertions from '../framework/Assertions.js';
import { completeSrpQuiz } from '../flows/accounts.flow.js';
import { defaultGanacheOptions } from '../framework/Constants.js';
import PlaywrightUtilities from '../framework/PlaywrightUtilities.js';
import { asPlaywrightElement } from '../framework/index.js';

appiumTest.describe(SmokeAppium('Login to app'), () => {
  appiumTest(
    'should login successfully @SmokeAppium',
    async ({
      driver: _driver, // required: sets globalThis.driver so FrameworkDetector picks up Appium
      currentDeviceDetails,
    }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({
            scenarioType: 'e2e',
          });
          await TabBarComponent.tapHome();
        },
      );
    },
  );
});

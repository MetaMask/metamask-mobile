import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { completeSrpQuiz } from '../../flows/accounts.flow.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import SettingsView from '../../page-objects/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { defaultGanacheOptions } from '../../framework/Constants.js';
import Assertions from '../../framework/Assertions.js';

appiumTest.describe(
  SmokeAccounts('Secret Recovery Phrase Reveal from Settings'),
  () => {
    appiumTest(
      'navigate to reveal SRP screen and make the quiz',
      async ({ driver: _driver, currentDeviceDetails }) => {
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
            await TabBarComponent.tapSettings();
            await SettingsView.tapSecurityAndPrivacy();
            await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();
            await completeSrpQuiz(defaultGanacheOptions.mnemonic);

            await Assertions.expectElementToBeVisible(
              SecurityAndPrivacy.securityAndPrivacyHeading,
            );
          },
        );
      },
    );
  },
);

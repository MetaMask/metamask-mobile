import { SmokeAccounts } from '../../tags.js';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import SettingsView from '../../page-objects/Settings/SettingsView';
import SecurityAndPrivacy from '../../page-objects/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { completeSrpQuiz } from '../multisrp/utils';
import { defaultGanacheOptions } from '../../framework/Constants';

describe(SmokeAccounts('Secret Recovery Phrase Reveal from Settings'), () => {
  it('navigate to reveal SRP screen and make the quiz', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();
        await completeSrpQuiz(defaultGanacheOptions.mnemonic);

        await Assertions.expectElementToBeVisible(
          SecurityAndPrivacy.securityAndPrivacyHeading,
        );
      },
    );
  });
});

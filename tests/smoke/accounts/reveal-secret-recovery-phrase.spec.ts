import { SmokeAccounts } from '../../../e2e/tags.js';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import SettingsView from '../../../e2e/pages/Settings/SettingsView.ts';
import SecurityAndPrivacy from '../../../e2e/pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import Assertions from '../../framework/Assertions.ts';
import { completeSrpQuiz } from '../../../e2e/specs/multisrp/utils.ts';
import { defaultGanacheOptions } from '../../framework/Constants.ts';

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

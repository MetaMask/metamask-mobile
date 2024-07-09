'use strict';

import { SmokeAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';

import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.js';
import RevealSeedViewSelectorsIDs from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';

import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
// import Assertions from '../../utils/Assertions';

describe(SmokeAccounts('reveal secret recovery phrase'), () => {
  it('completes quiz after wrong answers', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        completedOnboarding: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Navigate to the settings
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();
        await RevealSecretRecoveryPhrase.tapGetStarted();
        await RevealSecretRecoveryPhrase.tapQuestionOneWrongAnswer();
      },
    );
  });
});

'use strict';

import { SmokeAccounts } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.js';
import { RevealSeedViewSelectorsIDs } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder.js';

describe(SmokeAccounts('Secret Recovery Phrase Quiz'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('completes successfully after correcting wrong answers', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();
        // Navigate settings to the Reveal Secret Recovery Phrase screen
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();
        //Start the quiz
        await RevealSecretRecoveryPhrase.tapGetStarted();
        //Answer the first question wrong
        await RevealSecretRecoveryPhrase.tapQuestionOneWrongAnswer();
        await TestHelpers.checkIfVisible(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_WRONG_TITLE,
        );
        //Try again
        await RevealSecretRecoveryPhrase.tapTryAgainOne();
        //Answer the first question right
        await RevealSecretRecoveryPhrase.tapQuestionOneRightAnswer();
        await TestHelpers.checkIfVisible(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_RIGHT_TITLE,
        );
        await RevealSecretRecoveryPhrase.tapContinueOne();
        //Answer the second question wrong
        await RevealSecretRecoveryPhrase.tapQuestionTwoWrongAnswer();
        await TestHelpers.checkIfVisible(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_WRONG_TITLE,
        );
        //Try again
        await RevealSecretRecoveryPhrase.tapTryAgainTwo();
        //Answer the second question right
        await RevealSecretRecoveryPhrase.tapQuestionTwoRightAnswer();
        await TestHelpers.checkIfVisible(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_RIGHT_TITLE,
        );
        await RevealSecretRecoveryPhrase.tapContinueTwo();
        // land at reveal SRP view prompt for password
        await TestHelpers.checkIfVisible(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        );
      },
    );
  });
});

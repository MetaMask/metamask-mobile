'use strict';

import { SmokeAccounts } from '../../tags';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../viewHelper';

import TabBarComponent from '../../pages/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.js';
import { RevealSeedViewSelectorsIDs } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';

// import { LoginView } from '../../pages/LoginView.js';

import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';

describe(SmokeAccounts('reveal secret recovery phrase'), () => {
  it('completes quiz after wrong answers', async () => {
    const PASSWORD = '123123123';

    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        completedOnboarding: true,
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

        // click into password input box
        await TestHelpers.waitAndTap(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        );
        //Enter password
        await TestHelpers.typeTextAndHideKeyboard(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
          PASSWORD,
        );

        // can see tap and hold but not activating animations and not showing the secret recovery phrase
        await TestHelpers.tapAndLongPress(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_LONG_PRESS_BUTTON_ID,
        );
      },
    );
  });
});

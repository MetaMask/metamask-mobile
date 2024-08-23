'use strict';

import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import SecurityQuizModal from '../../pages/modals/SecurityQuizModal.js';
import {
  SecurityQuizQuestionOneModalSelectorsText,
  SecurityQuizQuestionTwoModalSelectorsText,
} from '../../selectors/Modals/SecurityQuizModal.selectors';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.js';
import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';

import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import Assertions from '../../utils/Assertions';

describe(Regression('Secret Recovery Phrase Reveal from Settings'), () => {
  const PASSWORD = '123123123';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('reveals Secret Recovery Phrase after completing the security quiz', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Navigate to Reveal SRP screen
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();

        // Start the quiz
        await SecurityQuizModal.tapGetStartedButton();

        // Question 1
        await Assertions.checkIfVisible(SecurityQuizModal.getQuizQuestionOne);
        await SecurityQuizModal.tapQuestionOneWrongAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_WRONG_ANSWER_RESPONSE_TITLE,
        );
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_WRONG_ANSWER_RESPONSE_DESCRIPTION,
        );
        await SecurityQuizModal.tapQuestionOneWrongAnswerTryAgainButton();
        await Assertions.checkIfVisible(SecurityQuizModal.getQuizQuestionOne);
        await SecurityQuizModal.tapQuestionOneRightAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_RIGHT_ANSWER_RESPONSE_TITLE,
        );
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_RIGHT_ANSWER_RESPONSE_DESCRIPTION,
        );
        await SecurityQuizModal.tapQuestionOneContinueButton();
        await Assertions.checkIfNotVisible(
          SecurityQuizModal.questionOneRightContinueButton,
        );

        // Question 2
        await Assertions.checkIfVisible(SecurityQuizModal.getQuizQuestionTwo);
        await SecurityQuizModal.tapQuestionTwoWrongAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_WRONG_ANSWER_RESPONSE_TITLE,
        );
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_WRONG_ANSWER_RESPONSE_DESCRIPTION,
        );
        await SecurityQuizModal.tapQuestionTwoWrongAnswerTryAgainButton();
        await Assertions.checkIfVisible(SecurityQuizModal.getQuizQuestionTwo);
        await SecurityQuizModal.tapQuestionTwoRightAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_RIGHT_ANSWER_RESPONSE_TITLE,
        );
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_RIGHT_ANSWER_RESPONSE_DESCRIPTION,
        );
        await SecurityQuizModal.tapQuestionTwoContinueButton();
        await Assertions.checkIfNotVisible(
          SecurityQuizModal.questionTwoRightContinueButton,
        );

        // Enter password after completing quiz
        await TestHelpers.waitAndTap(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
        );
        await TestHelpers.typeTextAndHideKeyboard(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
          PASSWORD,
        );
        // Tap on reveal SRP button
        await TestHelpers.waitAndTap(
          RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_REVEAL_BUTTON_ID,
        );

        // Confirm that the SRP container is displayed
        await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);
        // Confirm that SRP Title is displayed
        await Assertions.checkIfTextIsDisplayed(
          RevealSeedViewSelectorsText.REVEAL_SECRET_RECOVERY_PHRASE_TITLE_TEXT,
        );
        // Confirm that correct SRP text is displayed accurately
        await Assertions.checkIfTextIsDisplayed(defaultGanacheOptions.mnemonic);
        // Copy to clipboard
        await Assertions.checkIfVisible(
          RevealSecretRecoveryPhrase.touchableBox,
        );
        await TestHelpers.tap(
          RevealSeedViewSelectorsIDs.REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
        );
      },
    );
  });
});

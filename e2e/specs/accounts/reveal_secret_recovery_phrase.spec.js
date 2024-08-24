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
} from '../../selectors/Modals/SecurityQuizModal.selectors.js';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase.js';
import {
  RevealSeedViewSelectorsIDs,
  RevealSeedViewSelectorsText,
} from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';

import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import Assertions from '../../utils/Assertions.js';

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

        // Question 1 answer wrong, acknowledge error, then retry with correct answer
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

        // Question 2 answer wrong, acknowledge error, then retry with correct answer
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
        await TestHelpers.typeTextAndHideKeyboard(
          RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID,
          PASSWORD,
        );
        // Tap on reveal SRP button
        await TestHelpers.waitAndTap(
          RevealSeedViewSelectorsIDs.SECRET_CREDENTIAL_REVEAL_BUTTON_ID,
        );
        // Confirm that the SRP container is displayed
        await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);
        // Confirm that SRP Title is displayed
        await Assertions.checkIfTextIsDisplayed(
          RevealSeedViewSelectorsText.REVEAL_SECRET_CREDENTIAL_TITLE_TEXT,
        );

        // Confirm that expected SRP text is displayed
        await Assertions.checkIfTextIsDisplayed(defaultGanacheOptions.mnemonic);

        // Copy to clipboard
        // Android devices running OS version < 11 (API level 29) will not see the copy to clipboard button presented
        // This will cause the following step to fail if e2e were being run on an older android OS prior to our minimum API level 29
        // See details here: https://github.com/MetaMask/metamask-mobile/pull/4170
        await TestHelpers.tap(
          RevealSeedViewSelectorsIDs.COPY_PRIVATE_CREDENTIAL_TO_CLIPBOARD_BUTTON,
        );
        // Tap done
        await TestHelpers.waitAndTapText(
          RevealSeedViewSelectorsText.REVEAL_SECRET_CREDENTIAL_DONE,
        );
        // Confirm that the SRP container is not displayed
        await Assertions.checkIfNotVisible(
          RevealSecretRecoveryPhrase.container,
        );
      },
    );
  });
});

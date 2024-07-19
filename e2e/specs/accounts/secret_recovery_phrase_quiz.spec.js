'use strict';

import { SmokeAccounts } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import SecurityQuizModal from '../../pages/modals/SecurityQuizModal.js';
import { RevealSeedViewSelectorsIDs } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';
import {
  SecurityQuizQuestionOneModalSelectorsText,
  SecurityQuizQuestionTwoModalSelectorsText,
} from '../../selectors/Modals/SecurityQuizModal.selectors';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import Assertions from '../../utils/Assertions';

describe(SmokeAccounts('Secret Recovery Phrase Quiz'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  it('completes quiz after correcting wrong answers', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withGanacheNetwork().build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        // Navigate to Reveal Secret Recovery Phrase screen
        await TabBarComponent.tapSettings();
        await SettingsView.tapSecurityAndPrivacy();
        await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();

        // Start the quiz
        await SecurityQuizModal.tapGetStartedButton();

        // Question 1
        await SecurityQuizModal.tapQuestionOneWrongAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_WRONG_ANSWER_RESPONSE,
        );
        await SecurityQuizModal.tapQuestionOneWrongAnswerTryAgainButton();
        await SecurityQuizModal.tapQuestionOneRightAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_RIGHT_ANSWER_RESPONSE,
        );
        await SecurityQuizModal.tapQuestionOneContinueButton();

        // // // Question 2
        await SecurityQuizModal.tapQuestionTwoWrongAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_WRONG_ANSWER_RESPONSE,
        );
        await SecurityQuizModal.tapQuestionTwoWrongAnswerTryAgainButton();
        await SecurityQuizModal.tapQuestionTwoRightAnswerButton();
        await Assertions.checkIfTextIsDisplayed(
          SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_RIGHT_ANSWER_RESPONSE,
        );
        await SecurityQuizModal.tapQuestionTwoContinueButton();
      },
    );
  });
});

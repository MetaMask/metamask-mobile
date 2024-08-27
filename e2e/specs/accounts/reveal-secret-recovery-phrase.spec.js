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
import { RevealSeedViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors.js';

import FixtureServer from '../../fixtures/fixture-server.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import {
  defaultGanacheOptions,
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper.js';
import { getFixturesServerPort } from '../../fixtures/utils.js';
import Assertions from '../../utils/Assertions.js';

const fixtureServer = new FixtureServer();

describe(Regression('Secret Recovery Phrase Reveal from Settings'), () => {
  const PASSWORD = '123123123';

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(async () => {
    const fixture = new FixtureBuilder().withDefaultFixture().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('reveals Secret Recovery Phrase after completing the security quiz', async () => {
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

    // Enter password and tap to reveal
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );

    // Tap to reveal
    // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
    await RevealSecretRecoveryPhrase.tapToReveal();

    // Confirm that the SRP container, title, and text are displayed
    await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);
    await Assertions.checkIfTextIsDisplayed(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_TITLE_TEXT,
    );
    await Assertions.checkIfTextIsDisplayed(defaultGanacheOptions.mnemonic);

    // Copy to clipboard
    // Android devices running OS version < 11 (API level 29) will not see the copy to clipboard button presented
    // This will cause the following step to fail if e2e were being run on an older android OS prior to our minimum API level 29
    // See details here: https://github.com/MetaMask/metamask-mobile/pull/4170
    await RevealSecretRecoveryPhrase.tapToCopyCredentialToClipboard();

    // Tap to reveal QR code and confirm it is displayed
    await RevealSecretRecoveryPhrase.tapToRevealPrivateCredentialQRCode();
    await Assertions.checkIfVisible(
      RevealSecretRecoveryPhrase.revealCredentialQRCodeImage,
    );

    // scroll to done and tap after opening QR code
    await RevealSecretRecoveryPhrase.scrollToDone();
    await TestHelpers.waitAndTapText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );

    // Confirm that the security and privacy screen is displayed
    await Assertions.checkIfVisible(
      SecurityAndPrivacy.securityAndPrivacyHeading,
    );
  });
});

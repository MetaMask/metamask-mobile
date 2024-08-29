'use strict';
import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import SrpQuizModal from '../../pages/modals/SrpQuizModal';
import {
  SrpSecurityQuestionOneSelectors,
  SrpSecurityQuestionTwoSelectors,
} from '../../selectors/Modals/SrpQuizModal.selectors';
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
const PASSWORD = '123123123';
const INCORRECT_PASSWORD = 'wrongpassword';
const QUIZ_QUESTION_1 = 1;
const QUIZ_QUESTION_2 = 2;

describe(Regression('Secret Recovery Phrase Reveal from Settings'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
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

  it('should navigate to reveal SRP screen and start quiz', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();
    await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();
    await SrpQuizModal.tapGetStartedButton();
    await Assertions.checkIfVisible(SrpQuizModal.getQuizQuestion(1));
  });

  it('should answer question 1 incorrectly and try again', async () => {
    await SrpQuizModal.tapQuestionWrongAnswerButton(QUIZ_QUESTION_1);
    await Assertions.checkIfTextIsDisplayed(
      SrpSecurityQuestionOneSelectors.Text.WRONG_ANSWER_RESPONSE_TITLE,
    );
    await SrpQuizModal.tapQuestionWrongAnswerTryAgainButton(QUIZ_QUESTION_1);
    await Assertions.checkIfVisible(
      SrpQuizModal.getQuizQuestion(QUIZ_QUESTION_1),
    );
  });

  it('should answer question 1 correctly', async () => {
    await SrpQuizModal.tapQuestionRightAnswerButton(QUIZ_QUESTION_1);
    await Assertions.checkIfTextIsDisplayed(
      SrpSecurityQuestionOneSelectors.Text.RIGHT_ANSWER_RESPONSE_TITLE,
    );
    await SrpQuizModal.tapQuestionContinueButton(QUIZ_QUESTION_1);
    await Assertions.checkIfNotVisible(
      SrpQuizModal.getQuestionRightContinueButton(QUIZ_QUESTION_1),
    );
  });

  it('should answer question 2 incorrectly and try again', async () => {
    await SrpQuizModal.tapQuestionWrongAnswerButton(QUIZ_QUESTION_2);
    await Assertions.checkIfTextIsDisplayed(
      SrpSecurityQuestionTwoSelectors.Text.WRONG_ANSWER_RESPONSE_TITLE,
    );
    await SrpQuizModal.tapQuestionWrongAnswerTryAgainButton(QUIZ_QUESTION_2);
    await Assertions.checkIfVisible(
      SrpQuizModal.getQuizQuestion(QUIZ_QUESTION_2),
    );
  });

  it('should answer question 2 correctly', async () => {
    await SrpQuizModal.tapQuestionRightAnswerButton(QUIZ_QUESTION_2);
    await Assertions.checkIfTextIsDisplayed(
      SrpSecurityQuestionTwoSelectors.Text.RIGHT_ANSWER_RESPONSE_TITLE,
    );
    await SrpQuizModal.tapQuestionContinueButton(QUIZ_QUESTION_2);
    await Assertions.checkIfNotVisible(
      SrpQuizModal.getQuestionRightContinueButton(QUIZ_QUESTION_2),
    );
  });

  it('should reveal Secret Recovery Phrase', async () => {
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );
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

    // Scroll to done and tap after opening QR code
    await RevealSecretRecoveryPhrase.scrollToDone();
    await TestHelpers.waitAndTapText(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_DONE,
    );

    // Confirm that the security and privacy screen is displayed
    await Assertions.checkIfVisible(
      SecurityAndPrivacy.securityAndPrivacyHeading,
    );
  });

  it('does not reveal Secret Recovery Phrase when the password is incorrect', async () => {
    await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();

    // Start the quiz
    await SrpQuizModal.tapGetStartedButton();

    // Handle Question 1 with correct answers only
    await SrpQuizModal.tapQuestionRightAnswerButton(QUIZ_QUESTION_1);
    await SrpQuizModal.tapQuestionContinueButton(QUIZ_QUESTION_1);

    // Handle Question 2 with correct answers only
    await SrpQuizModal.tapQuestionRightAnswerButton(QUIZ_QUESTION_2);
    await SrpQuizModal.tapQuestionContinueButton(QUIZ_QUESTION_2);

    // Enter incorrect password and attempt to reveal
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      INCORRECT_PASSWORD,
    );

    // Confirm that an error message is displayed
    await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.passwordWarning);

    // Confirm that tap to reveal is not offered
    await Assertions.checkIfNotVisible(
      RevealSecretRecoveryPhrase.revealSecretRecoveryPhraseButton,
    );
  });
});

'use strict';

import { Regression } from '../../tags.js';
import TestHelpers from '../../helpers.js';
import { loginToApp } from '../../viewHelper.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import SettingsView from '../../pages/Settings/SettingsView.js';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView.js';
import SrpQuizModal from '../../pages/modals/SrpQuizModal.js';
import {
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionOneSelectorsText,
  SrpSecurityQuestionTwoSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsText,
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

  const handleSRPQuizQuestion = async (
    questionSelectorsIDs,
    questionSelectorsText,
    handleIncorrect = false,
  ) => {
    if (handleIncorrect) {
      await SrpQuizModal.tapQuestionWrongAnswerButton(questionSelectorsIDs);
      await Assertions.checkIfTextIsDisplayed(
        questionSelectorsText.WRONG_ANSWER_RESPONSE_TITLE,
      );
      await Assertions.checkIfTextIsDisplayed(
        questionSelectorsText.WRONG_ANSWER_RESPONSE_DESCRIPTION,
      );
      await SrpQuizModal.tapQuestionWrongAnswerTryAgainButton(
        questionSelectorsIDs,
      );
      await Assertions.checkIfVisible(
        SrpQuizModal.getQuizQuestion(questionSelectorsText),
      );
    }
    await SrpQuizModal.tapQuestionRightAnswerButton(questionSelectorsIDs);
    await Assertions.checkIfTextIsDisplayed(
      questionSelectorsText.RIGHT_ANSWER_RESPONSE_TITLE,
    );
    await Assertions.checkIfTextIsDisplayed(
      questionSelectorsText.RIGHT_ANSWER_RESPONSE_DESCRIPTION,
    );
    await SrpQuizModal.tapQuestionContinueButton(questionSelectorsIDs);
    await Assertions.checkIfNotVisible(
      SrpQuizModal.getQuestionRightContinueButton(questionSelectorsIDs),
    );
  };

  it('reveals Secret Recovery Phrase after completing the security quiz with incorrect and correct answers', async () => {
    // Navigate to Reveal SRP screen
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();
    await SecurityAndPrivacy.tapRevealSecretRecoveryPhraseButton();

    // Start the quiz
    await SrpQuizModal.tapGetStartedButton();

    // Handle Question 1 with incorrect and correct answers
    await handleSRPQuizQuestion(
      SrpSecurityQuestionOneSelectorsIDs,
      SrpSecurityQuestionOneSelectorsText,
      true,
    );

    // Handle Question 2 with incorrect and correct answers
    await handleSRPQuizQuestion(
      SrpSecurityQuestionTwoSelectorsIDs,
      SrpSecurityQuestionTwoSelectorsText,
      true,
    );

    // Enter password and tap to reveal
    await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
      PASSWORD,
    );

    // Tap to reveal
    await RevealSecretRecoveryPhrase.tapToReveal();

    // Confirm that the SRP container, title, and text are displayed
    await Assertions.checkIfVisible(RevealSecretRecoveryPhrase.container);
    await Assertions.checkIfTextIsDisplayed(
      RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_TITLE_TEXT,
    );
    await Assertions.checkIfTextIsDisplayed(defaultGanacheOptions.mnemonic);

    // Copy to clipboard
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
    await handleSRPQuizQuestion(
      SrpSecurityQuestionOneSelectorsIDs,
      SrpSecurityQuestionOneSelectorsText,
    );

    // Handle Question 2 with correct answers only
    await handleSRPQuizQuestion(
      SrpSecurityQuestionTwoSelectorsIDs,
      SrpSecurityQuestionTwoSelectorsText,
    );

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

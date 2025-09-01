import { SmokeAccounts } from '../../tags.js';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import SecurityAndPrivacy from '../../pages/Settings/SecurityAndPrivacy/SecurityAndPrivacyView';
import SrpQuizModal from '../../pages/Settings/SecurityAndPrivacy/SrpQuizModal';
import {
  SrpSecurityQuestionOneSelectorsText,
  SrpSecurityQuestionTwoSelectorsText,
} from '../../selectors/Settings/SecurityAndPrivacy/SrpQuizModal.selectors';
import RevealSecretRecoveryPhrase from '../../pages/Settings/SecurityAndPrivacy/RevealSecretRecoveryPhrase';
import { RevealSeedViewSelectorsText } from '../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { defaultGanacheOptions } from '../../framework/Constants';

const PASSWORD = '123123123';
const INCORRECT_PASSWORD = 'wrongpassword';
const QUIZ_QUESTION_1 = 1;
const QUIZ_QUESTION_2 = 2;

/**
 * This is a little helper to avoid repeating code.
 * This function answers a question incorrectly and then correctly
 * @param question - The question number to answer
 */
const answerQuestionIncorrectlyAndThenCorrect = async (question: number) => {
  const quizQuestion =
    question === QUIZ_QUESTION_1
      ? SrpSecurityQuestionOneSelectorsText
      : SrpSecurityQuestionTwoSelectorsText;
  await SrpQuizModal.tapQuestionWrongAnswerButton(question);
  await Assertions.expectTextDisplayed(
    quizQuestion.WRONG_ANSWER_RESPONSE_TITLE,
  );
  await SrpQuizModal.tapQuestionWrongAnswerTryAgainButton(question);
  await Assertions.expectElementToBeVisible(
    SrpQuizModal.getQuizQuestion(question),
  );
  await SrpQuizModal.tapQuestionRightAnswerButton(question);
  await Assertions.expectTextDisplayed(
    quizQuestion.RIGHT_ANSWER_RESPONSE_TITLE,
  );
  await SrpQuizModal.tapQuestionContinueButton(question);
  await Assertions.expectElementToNotBeVisible(
    SrpQuizModal.getQuestionRightContinueButton(question),
  );
};

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
        await SrpQuizModal.tapGetStartedButton();
        await Assertions.expectElementToBeVisible(
          SrpQuizModal.getQuizQuestion(QUIZ_QUESTION_1),
        );
        await answerQuestionIncorrectlyAndThenCorrect(QUIZ_QUESTION_1);
        await answerQuestionIncorrectlyAndThenCorrect(QUIZ_QUESTION_2);

        // Enter credentials to reveal SRP
        await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
          PASSWORD,
        );

        // If the following step fails, ensure you are using a test build with tap and hold to reveal animation disabled
        await RevealSecretRecoveryPhrase.tapToReveal();
        await Assertions.expectElementToBeVisible(
          RevealSecretRecoveryPhrase.container,
        );
        await Assertions.expectTextDisplayed(
          RevealSeedViewSelectorsText.REVEAL_CREDENTIAL_SRP_TITLE_TEXT,
        );
        await Assertions.expectTextDisplayed(defaultGanacheOptions.mnemonic);
        await RevealSecretRecoveryPhrase.scrollToCopyToClipboardButton();

        await RevealSecretRecoveryPhrase.tapToRevealPrivateCredentialQRCode();

        if (device.getPlatform() === 'ios') {
          // For some reason, the QR code is visible on Android but detox cannot find it
          await Assertions.expectElementToBeVisible(
            RevealSecretRecoveryPhrase.revealCredentialQRCodeImage,
          );
        }

        await RevealSecretRecoveryPhrase.scrollToDone();
        await RevealSecretRecoveryPhrase.tapDoneButton();
        await Assertions.expectElementToBeVisible(
          SecurityAndPrivacy.securityAndPrivacyHeading,
        );
      },
    );
  });

  it('does not reveal Secret Recovery Phrase when the password is incorrect', async () => {
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
        await SrpQuizModal.tapGetStartedButton();
        await Assertions.expectElementToBeVisible(
          SrpQuizModal.getQuizQuestion(QUIZ_QUESTION_1),
        );
        await answerQuestionIncorrectlyAndThenCorrect(QUIZ_QUESTION_1);
        await answerQuestionIncorrectlyAndThenCorrect(QUIZ_QUESTION_2);

        await RevealSecretRecoveryPhrase.enterPasswordToRevealSecretCredential(
          INCORRECT_PASSWORD,
        );
        await Assertions.expectElementToBeVisible(
          RevealSecretRecoveryPhrase.passwordWarning,
        );
        await Assertions.expectElementToNotBeVisible(
          RevealSecretRecoveryPhrase.revealSecretRecoveryPhraseButton,
        );
      },
    );
  });
});

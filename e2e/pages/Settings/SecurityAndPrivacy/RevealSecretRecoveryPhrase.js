import { RevealSeedViewSelectorsIDs } from '../../../selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class RevealSecretRecoveryPhrase {
  get container() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CONTAINER_ID,
    );
  }

  get getStarted() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_GET_STARTED_BUTTON_ID,
    );
  }

  get quizContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_CONTAINER_ID,
    );
  }

  get learnMoreButton() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_LEARN_MORE_BUTTON_ID,
    );
  }

  get questionOneContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_CONTAINER_ID,
    );
  }

  get questionOneWrongAnswer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_WRONG_ANSWER_ID,
    );
  }

  get responseOneWrongContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_RESPONSE_ONE_WRONG_CONTAINER_ID,
    );
  }

  get tryAgainOne() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_WRONG_ANSWER_TRY_AGAIN_ID,
    );
  }

  get questionOneRightAnswer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_RIGHT_ANSWER_ID,
    );
  }

  get questionOneRightContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_RIGHT_ANSWER_CONTAINER_ID,
    );
  }

  get continueOne() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_ONE_RIGHT_CONTINUE_ID,
    );
  }

  get questionTwoContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_CONTAINER_ID,
    );
  }

  get questionTwoWrongAnswer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_WRONG_ANSWER_ID,
    );
  }

  get responseTwoWrongContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_RESPONSE_TWO_WRONG_CONTAINER_ID,
    );
  }

  get tryAgainTwo() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_WRONG_ANSWER_TRY_AGAIN_ID,
    );
  }

  get questionTwoRightAnswer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_RIGHT_ANSWER_ID,
    );
  }

  get questionTwoRightContainer() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_RIGHT_ANSWER_CONTAINER_ID,
    );
  }

  get continueTwo() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_QUIZ_QUESTION_TWO_RIGHT_CONTINUE_ID,
    );
  }

  get passwordInput() {
    return Matchers.getElementByID(RevealSeedViewSelectorsIDs.PASSWORD_INPUT);
  }

  get passwordWarning() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID,
    );
  }

  get touchableBox() {
    return Matchers.getElementByID(
      RevealSeedViewSelectorsIDs.REVEAL_SECRET_RECOVERY_PHRASE_TOUCHABLE_BOX_ID,
    );
  }

  get recoveryPhrase() {
    return Matchers.getElementByText(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_TEXT,
    );
  }

  async enterPassword(password) {
    await Gestures.typeTextAndHideKeyboard(this.passwordInput, password);
  }

  async tapGetStarted() {
    await Gestures.waitAndTap(this.getStarted);
  }
}

export default new RevealSecretRecoveryPhrase();

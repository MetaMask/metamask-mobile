import {
  SrpQuizGetStartedSelectorsIDs,
  SrpQuizGetStartedSelectorsText,
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionOneSelectorsText,
  SrpSecurityQuestionTwoSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsText,
} from '../../../selectors/Settings/SecurityAndPrivacy/SrpQuizModal.selectors';
import Matchers from '../../../utils/Matchers';
import Gestures from '../../../utils/Gestures';

class SrpQuizModal {
  // Getters for common elements
  get getStartedContainer() {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.CONTAINER);
  }

  get getStartedScreenDismiss() {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.DISMISS);
  }

  get modalIntroduction() {
    return Matchers.getElementByText(
      SrpQuizGetStartedSelectorsText.INTRODUCTION,
    );
  }

  get getStartedButton() {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.BUTTON);
  }

  // Mapping question number to selectors
  getQuestionSelectors(questionNumber) {
    switch (questionNumber) {
      case 1:
        return {
          ids: SrpSecurityQuestionOneSelectorsIDs,
          text: SrpSecurityQuestionOneSelectorsText,
        };
      case 2:
        return {
          ids: SrpSecurityQuestionTwoSelectorsIDs,
          text: SrpSecurityQuestionTwoSelectorsText,
        };
      default:
        throw new Error(`Invalid question number: ${questionNumber}`);
    }
  }

  // Getters for question elements
  getQuestionContainer(questionNumber) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.CONTAINER);
  }

  getQuestionDismiss(questionNumber) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.DISMISS);
  }

  getQuizQuestion(questionNumber) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.QUESTION);
  }

  getQuestionWrongAnswer(questionNumber) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.WRONG_ANSWER);
  }

  getQuestionWrongAnswerResponseTitle(questionNumber) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.WRONG_ANSWER_RESPONSE_TITLE);
  }

  getQuestionWrongAnswerResponseDescription(questionNumber) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.WRONG_ANSWER_RESPONSE_DESCRIPTION);
  }

  getQuestionWrongAnswerTryAgainButton(questionNumber) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.WRONG_ANSWER_TRY_AGAIN_BUTTON);
  }

  getQuestionRightAnswerButton(questionNumber) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.RIGHT_ANSWER);
  }

  getQuestionRightAnswerResponseTitle(questionNumber) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.RIGHT_ANSWER_RESPONSE_TITLE);
  }

  getQuestionRightAnswerResponseDescription(questionNumber) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.RIGHT_ANSWER_RESPONSE_DESCRIPTION);
  }

  getQuestionRightContinueButton(questionNumber) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.RIGHT_CONTINUE);
  }

  // Methods for common actions
  async tapQuizGetStartedScreenDismiss() {
    await Gestures.waitAndTap(this.getStartedScreenDismiss);
  }

  async tapGetStartedButton() {
    await Gestures.waitAndTap(this.getStartedButton);
  }

  // Methods for question actions
  async tapQuestionDismiss(questionNumber) {
    await Gestures.waitAndTap(this.getQuestionDismiss(questionNumber));
  }

  async tapQuestionWrongAnswerButton(questionNumber) {
    await Gestures.waitAndTap(this.getQuestionWrongAnswer(questionNumber));
  }

  async tapQuestionWrongAnswerTryAgainButton(questionNumber) {
    await Gestures.waitAndTap(
      this.getQuestionWrongAnswerTryAgainButton(questionNumber),
    );
  }

  async tapQuestionRightAnswerButton(questionNumber) {
    await Gestures.waitAndTap(
      this.getQuestionRightAnswerButton(questionNumber),
    );
  }

  async tapQuestionContinueButton(questionNumber) {
    await Gestures.waitAndTap(
      this.getQuestionRightContinueButton(questionNumber),
    );
  }
}

export default new SrpQuizModal();

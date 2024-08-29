import {
  SrpQuizGetStartedSelectorsIDs,
  SrpQuizGetStartedSelectorsText,
} from '../../selectors/Modals/SrpQuizModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class SrpQuizModal {
  // Getters for common elements
  get getStartedContainer() {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.CONTAINER);
  }

  get getStartedDismiss() {
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

  // Getters for question elements
  getQuestionContainer(questionSelectorsIDs) {
    return Matchers.getElementByID(questionSelectorsIDs.CONTAINER);
  }

  getQuestionDismiss(questionSelectorsIDs) {
    return Matchers.getElementByID(questionSelectorsIDs.DISMISS);
  }

  getQuizQuestion(questionSelectorsText) {
    return Matchers.getElementByText(questionSelectorsText.QUESTION);
  }

  getQuestionWrongAnswer(questionSelectorsIDs) {
    return Matchers.getElementByID(questionSelectorsIDs.WRONG_ANSWER);
  }

  getQuestionWrongAnswerResponseTitle(questionSelectorsText) {
    return Matchers.getElementByText(
      questionSelectorsText.WRONG_ANSWER_RESPONSE_TITLE,
    );
  }

  getQuestionWrongAnswerResponseDescription(questionSelectorsText) {
    return Matchers.getElementByText(
      questionSelectorsText.WRONG_ANSWER_RESPONSE_DESCRIPTION,
    );
  }

  getQuestionWrongAnswerTryAgainButton(questionSelectorsIDs) {
    return Matchers.getElementByID(
      questionSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON,
    );
  }

  getQuestionRightAnswerButton(questionSelectorsIDs) {
    return Matchers.getElementByID(questionSelectorsIDs.RIGHT_ANSWER);
  }

  getQuestionRightAnswerResponseTitle(questionSelectorsText) {
    return Matchers.getElementByText(
      questionSelectorsText.RIGHT_ANSWER_RESPONSE_TITLE,
    );
  }

  getQuestionRightAnswerResponseDescription(questionSelectorsText) {
    return Matchers.getElementByText(
      questionSelectorsText.RIGHT_ANSWER_RESPONSE_DESCRIPTION,
    );
  }

  getQuestionRightContinueButton(questionSelectorsIDs) {
    return Matchers.getElementByID(questionSelectorsIDs.RIGHT_CONTINUE);
  }

  // Methods for common actions
  async tapGetStartedDismiss() {
    await Gestures.waitAndTap(this.getStartedDismiss);
  }

  async tapGetStartedButton() {
    await Gestures.waitAndTap(this.getStartedButton);
  }

  // Methods for question actions
  async tapQuestionDismiss(questionSelectorsIDs) {
    await Gestures.waitAndTap(this.getQuestionDismiss(questionSelectorsIDs));
  }

  async tapQuestionWrongAnswerButton(questionSelectorsIDs) {
    await Gestures.waitAndTap(
      this.getQuestionWrongAnswer(questionSelectorsIDs),
    );
  }

  async tapQuestionWrongAnswerTryAgainButton(questionSelectorsIDs) {
    await Gestures.waitAndTap(
      this.getQuestionWrongAnswerTryAgainButton(questionSelectorsIDs),
    );
  }

  async tapQuestionRightAnswerButton(questionSelectorsIDs) {
    await Gestures.waitAndTap(
      this.getQuestionRightAnswerButton(questionSelectorsIDs),
    );
  }

  async tapQuestionContinueButton(questionSelectorsIDs) {
    await Gestures.waitAndTap(
      this.getQuestionRightContinueButton(questionSelectorsIDs),
    );
  }
}

export default new SrpQuizModal();

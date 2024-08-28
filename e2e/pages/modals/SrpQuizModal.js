import {
  SrpQuizGetStartedModalSelectors,
  SrpSecurityQuestionOneModalSelectors,
  SrpSecurityQuestionTwoModalSelectors,
} from '../../selectors/Modals/SrpQuizModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class SrpQuizModal {
  // Getters for common elements
  get getStartedContainer() {
    return Matchers.getElementByID(
      SrpQuizGetStartedModalSelectors.IDs.CONTAINER,
    );
  }

  get getStartedDismiss() {
    return Matchers.getElementByID(SrpQuizGetStartedModalSelectors.IDs.DISMISS);
  }

  get modalIntroduction() {
    return Matchers.getElementByText(
      SrpQuizGetStartedModalSelectors.Text.INTRODUCTION,
    );
  }

  get getStartedButton() {
    return Matchers.getElementByID(SrpQuizGetStartedModalSelectors.IDs.BUTTON);
  }

  // Getters for question elements
  getQuestionContainer(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByID(
          SrpSecurityQuestionOneModalSelectors.IDs.CONTAINER,
        )
      : Matchers.getElementByID(
          SrpSecurityQuestionTwoModalSelectors.IDs.CONTAINER,
        );
  }

  getQuestionDismiss(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByID(
          SrpSecurityQuestionOneModalSelectors.IDs.DISMISS,
        )
      : Matchers.getElementByID(
          SrpSecurityQuestionTwoModalSelectors.IDs.DISMISS,
        );
  }

  getQuizQuestion(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByText(
          SrpSecurityQuestionOneModalSelectors.Text.QUESTION,
        )
      : Matchers.getElementByText(
          SrpSecurityQuestionTwoModalSelectors.Text.QUESTION,
        );
  }

  getQuestionWrongAnswer(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByID(
          SrpSecurityQuestionOneModalSelectors.IDs.WRONG_ANSWER,
        )
      : Matchers.getElementByID(
          SrpSecurityQuestionTwoModalSelectors.IDs.WRONG_ANSWER,
        );
  }

  getQuestionWrongAnswerResponseTitle(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByText(
          SrpSecurityQuestionOneModalSelectors.Text.WRONG_ANSWER_RESPONSE_TITLE,
        )
      : Matchers.getElementByText(
          SrpSecurityQuestionTwoModalSelectors.Text.WRONG_ANSWER_RESPONSE_TITLE,
        );
  }

  getQuestionWrongAnswerResponseDescription(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByText(
          SrpSecurityQuestionOneModalSelectors.Text
            .WRONG_ANSWER_RESPONSE_DESCRIPTION,
        )
      : Matchers.getElementByText(
          SrpSecurityQuestionTwoModalSelectors.Text
            .WRONG_ANSWER_RESPONSE_DESCRIPTION,
        );
  }

  getQuestionWrongAnswerTryAgainButton(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByID(
          SrpSecurityQuestionOneModalSelectors.IDs
            .WRONG_ANSWER_TRY_AGAIN_BUTTON,
        )
      : Matchers.getElementByID(
          SrpSecurityQuestionTwoModalSelectors.IDs
            .WRONG_ANSWER_TRY_AGAIN_BUTTON,
        );
  }

  getQuestionRightAnswerButton(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByID(
          SrpSecurityQuestionOneModalSelectors.IDs.RIGHT_ANSWER,
        )
      : Matchers.getElementByID(
          SrpSecurityQuestionTwoModalSelectors.IDs.RIGHT_ANSWER,
        );
  }

  getQuestionRightAnswerResponseTitle(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByText(
          SrpSecurityQuestionOneModalSelectors.Text.RIGHT_ANSWER_RESPONSE_TITLE,
        )
      : Matchers.getElementByText(
          SrpSecurityQuestionTwoModalSelectors.Text.RIGHT_ANSWER_RESPONSE_TITLE,
        );
  }

  getQuestionRightAnswerResponseDescription(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByText(
          SrpSecurityQuestionOneModalSelectors.Text
            .RIGHT_ANSWER_RESPONSE_DESCRIPTION,
        )
      : Matchers.getElementByText(
          SrpSecurityQuestionTwoModalSelectors.Text
            .RIGHT_ANSWER_RESPONSE_DESCRIPTION,
        );
  }

  getQuestionRightContinueButton(questionNumber) {
    return questionNumber === 1
      ? Matchers.getElementByID(
          SrpSecurityQuestionOneModalSelectors.IDs.RIGHT_CONTINUE,
        )
      : Matchers.getElementByID(
          SrpSecurityQuestionTwoModalSelectors.IDs.RIGHT_CONTINUE,
        );
  }

  // Methods for common actions
  async tapGetStartedDismiss() {
    await Gestures.waitAndTap(this.getStartedDismiss);
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

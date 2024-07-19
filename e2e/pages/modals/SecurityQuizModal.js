import {
  SecurityQuizGetStartedModalSelectorsIDs,
  SecurityQuizGetStartedModalSelectorsText,
  SecurityQuestionOneModelSelectorsIDs,
  SecurityQuizQuestionOneModalSelectorsText,
  SecurityQuestionTwoModelSelectorsIDs,
  SecurityQuizQuestionTwoModalSelectorsText,
} from '../../selectors/Modals/SecurityQuizModal.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class SecurityQuizModal {
  get getStartedContainer() {
    return Matchers.getElementByID(
      SecurityQuizGetStartedModalSelectorsIDs.QUIZ_GET_STARTED_CONTAINER,
    );
  }

  get getStartedDismiss() {
    return Matchers.getElementByID(
      SecurityQuizGetStartedModalSelectorsIDs.QUIZ_GET_STARTED_DISMISS_BUTTON,
    );
  }

  get modalIntroduction() {
    return Matchers.getElementByText(
      SecurityQuizGetStartedModalSelectorsText.QUIZ_INTRODUCTION,
    );
  }

  get getStartedButton() {
    return Matchers.getElementByID(
      SecurityQuizGetStartedModalSelectorsIDs.QUIZ_GET_STARTED_BUTTON,
    );
  }

  get questionOneContainer() {
    return Matchers.getElementByID(
      SecurityQuestionOneModelSelectorsIDs.QUIZ_QUESTION_ONE_CONTAINER,
    );
  }

  get questionOneDismiss() {
    return Matchers.getElementByID(
      SecurityQuestionOneModelSelectorsIDs.QUIZ_QUESTION_ONE_DISMISS_BUTTON,
    );
  }

  get getQuizQuestionOne() {
    return Matchers.getElementByText(
      SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE,
    );
  }

  get questionOneWrongAnswer() {
    return Matchers.getElementByID(
      SecurityQuestionOneModelSelectorsIDs.QUIZ_QUESTION_ONE_WRONG_ANSWER,
    );
  }

  get questionOneWrongAnswerTitle() {
    return Matchers.getElementByText(
      SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_WRONG_ANSWER_TITLE,
    );
  }

  get questionOneWrongAnswerResponse() {
    return Matchers.getElementByText(
      SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_WRONG_ANSWER_RESPONSE,
    );
  }

  get questionOneWrongAnswerTryAgainButton() {
    return Matchers.getElementByID(
      SecurityQuestionOneModelSelectorsIDs.QUIZ_QUESTION_ONE_WRONG_ANSWER_TRY_AGAIN_BUTTON,
    );
  }

  get questionOneRightAnswer() {
    return Matchers.getElementByID(
      SecurityQuestionOneModelSelectorsIDs.QUIZ_QUESTION_ONE_RIGHT_ANSWER,
    );
  }

  get questionOneRightAnswerTitle() {
    return Matchers.getElementByText(
      SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_RIGHT_ANSWER_TITLE,
    );
  }

  get questionOneRightAnswerResponse() {
    return Matchers.getElementByText(
      SecurityQuizQuestionOneModalSelectorsText.QUIZ_QUESTION_ONE_RIGHT_ANSWER_RESPONSE,
    );
  }

  get questionOneRightContinueButton() {
    return Matchers.getElementByID(
      SecurityQuestionOneModelSelectorsIDs.QUIZ_QUESTION_ONE_RIGHT_CONTINUE,
    );
  }

  get questionTwoContainer() {
    return Matchers.getElementByID(
      SecurityQuestionTwoModelSelectorsIDs.QUIZ_QUESTION_TWO_CONTAINER,
    );
  }

  get questionTwoDismiss() {
    return Matchers.getElementByID(
      SecurityQuestionTwoModelSelectorsIDs.QUIZ_QUESTION_TWO_DISMISS_BUTTON,
    );
  }

  get getQuizQuestionTwo() {
    return Matchers.getElementByText(
      SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO,
    );
  }

  get questionTwoWrongAnswer() {
    return Matchers.getElementByID(
      SecurityQuestionTwoModelSelectorsIDs.QUIZ_QUESTION_TWO_WRONG_ANSWER,
    );
  }

  get questionTwoWrongAnswerTitle() {
    return Matchers.getElementByText(
      SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_WRONG_ANSWER_TITLE,
    );
  }

  get questionTwoWrongAnswerResponse() {
    return Matchers.getElementByText(
      SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_WRONG_ANSWER_RESPONSE,
    );
  }

  get questionTwoWrongAnswerTryAgainButton() {
    return Matchers.getElementByID(
      SecurityQuestionTwoModelSelectorsIDs.QUIZ_QUESTION_TWO_WRONG_ANSWER_TRY_AGAIN_BUTTON,
    );
  }

  get questionTwoRightAnswer() {
    return Matchers.getElementByID(
      SecurityQuestionTwoModelSelectorsIDs.QUIZ_QUESTION_TWO_RIGHT_ANSWER,
    );
  }

  get questionTwoRightAnswerTitle() {
    return Matchers.getElementByText(
      SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_RIGHT_ANSWER_TITLE,
    );
  }

  get questionTwoRightAnswerResponse() {
    return Matchers.getElementByText(
      SecurityQuizQuestionTwoModalSelectorsText.QUIZ_QUESTION_TWO_RIGHT_ANSWER_RESPONSE,
    );
  }

  get questionTwoRightContinueButton() {
    return Matchers.getElementByID(
      SecurityQuestionTwoModelSelectorsIDs.QUIZ_QUESTION_TWO_RIGHT_CONTINUE,
    );
  }

  async tapGetStartedDismiss() {
    await Gestures.waitAndTap(this.getStartedDismiss);
  }

  async tapGetStartedButton() {
    await Gestures.waitAndTap(this.getStartedButton);
  }

  async tapQuestionOneDismiss() {
    await Gestures.waitAndTap(this.questionOneDismiss);
  }

  async tapQuestionOneWrongAnswerButton() {
    await Gestures.waitAndTap(this.questionOneWrongAnswer);
  }

  async tapQuestionOneWrongAnswerTryAgainButton() {
    await Gestures.waitAndTap(this.questionOneWrongAnswerTryAgainButton);
  }

  async tapQuestionOneRightAnswerButton() {
    await Gestures.waitAndTap(this.questionOneRightAnswer);
  }

  async tapQuestionOneContinueButton() {
    await Gestures.waitAndTap(this.questionOneRightContinueButton);
  }

  async tapQuestionTwoDismiss() {
    await Gestures.waitAndTap(this.questionTwoDismiss);
  }

  async tapQuestionTwoWrongAnswerButton() {
    await Gestures.waitAndTap(this.questionTwoWrongAnswer);
  }

  async tapQuestionTwoWrongAnswerTryAgainButton() {
    await Gestures.waitAndTap(this.questionTwoWrongAnswerTryAgainButton);
  }

  async tapQuestionTwoRightAnswerButton() {
    await Gestures.waitAndTap(this.questionTwoRightAnswer);
  }

  async tapQuestionTwoContinueButton() {
    await Gestures.waitAndTap(this.questionTwoRightContinueButton);
  }
}

export default new SecurityQuizModal();

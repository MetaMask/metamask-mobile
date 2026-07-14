import {
  SrpQuizGetStartedSelectorsIDs,
  SrpQuizGetStartedSelectorsText,
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionOneSelectorsText,
  SrpSecurityQuestionTwoSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsText,
} from '../../../../app/components/Views/Quiz/SRPQuiz/SrpQuizModal.testIds';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { EncapsulatedElementType } from '../../../framework';
import UnifiedGestures from '../../../framework/UnifiedGestures';

class SrpQuizModal {
  get getStartedContainer(): EncapsulatedElementType {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.CONTAINER);
  }

  get getStartedScreenDismiss(): EncapsulatedElementType {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.DISMISS);
  }

  get modalIntroduction(): EncapsulatedElementType {
    return Matchers.getElementByText(
      SrpQuizGetStartedSelectorsText.INTRODUCTION,
    );
  }

  get getStartedButton(): EncapsulatedElementType {
    return Matchers.getElementByID(SrpQuizGetStartedSelectorsIDs.BUTTON);
  }

  getQuestionSelectors(questionNumber: number) {
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

  getQuestionContainer(questionNumber: number) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.CONTAINER);
  }

  getQuestionDismiss(questionNumber: number) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.DISMISS);
  }

  getQuizQuestion(questionNumber: number) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.QUESTION);
  }

  getQuestionWrongAnswer(questionNumber: number) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.WRONG_ANSWER);
  }

  getQuestionWrongAnswerResponseTitle(questionNumber: number) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.WRONG_ANSWER_RESPONSE_TITLE);
  }

  getQuestionWrongAnswerResponseDescription(questionNumber: number) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.WRONG_ANSWER_RESPONSE_DESCRIPTION);
  }

  getQuestionWrongAnswerTryAgainButton(questionNumber: number) {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.WRONG_ANSWER_TRY_AGAIN_BUTTON);
  }

  getQuestionRightAnswerButton(
    questionNumber: number,
  ): EncapsulatedElementType {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.RIGHT_ANSWER);
  }

  getQuestionRightAnswerResponseTitle(questionNumber: number) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.RIGHT_ANSWER_RESPONSE_TITLE);
  }

  getQuestionRightAnswerResponseDescription(questionNumber: number) {
    const { text } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByText(text.RIGHT_ANSWER_RESPONSE_DESCRIPTION);
  }

  getQuestionRightContinueButton(
    questionNumber: number,
  ): EncapsulatedElementType {
    const { ids } = this.getQuestionSelectors(questionNumber);
    return Matchers.getElementByID(ids.RIGHT_CONTINUE);
  }

  async tapQuizGetStartedScreenDismiss(): Promise<void> {
    await Gestures.waitAndTap(this.getStartedScreenDismiss, {
      elemDescription: 'Srp Quiz - Get Started Screen Dismiss',
    });
  }

  async tapGetStartedButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.getStartedButton, {
      description: 'Srp Quiz - Get Started Button',
    });
  }

  async tapQuestionDismiss(questionNumber: number): Promise<void> {
    await Gestures.waitAndTap(this.getQuestionDismiss(questionNumber), {
      elemDescription: `Srp Quiz - Question ${questionNumber} Dismiss`,
    });
  }

  async tapQuestionWrongAnswerButton(questionNumber: number): Promise<void> {
    await Gestures.waitAndTap(this.getQuestionWrongAnswer(questionNumber), {
      elemDescription: `Srp Quiz - Question ${questionNumber} Wrong Answer`,
    });
  }

  async tapQuestionWrongAnswerTryAgainButton(
    questionNumber: number,
  ): Promise<void> {
    await Gestures.waitAndTap(
      this.getQuestionWrongAnswerTryAgainButton(questionNumber),
      {
        elemDescription: `Srp Quiz - Question ${questionNumber} Wrong Answer Try Again`,
      },
    );
  }

  async tapQuestionRightAnswerButton(questionNumber: number): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.getQuestionRightAnswerButton(questionNumber),
      {
        description: `Srp Quiz - Question ${questionNumber} Right Answer`,
      },
    );
  }

  async tapQuestionContinueButton(questionNumber: number): Promise<void> {
    await UnifiedGestures.waitAndTap(
      this.getQuestionRightContinueButton(questionNumber),
      {
        description: `Srp Quiz - Question ${questionNumber} Right Continue`,
      },
    );
  }
}

export default new SrpQuizModal();

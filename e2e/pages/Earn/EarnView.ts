import { EarnViewSelectors } from '../../selectors/Earn/EarnView.selectors';

import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';

class EarnView {
  get depositText(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.EARN_DEPOSIT);
  }

  get withdrawText(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.EARN_WITHDRAW);
  }

  get spendCapText(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.SPEND_CAP);
  }

  get reviewButton(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.REVIEW_BUTTON);
  }

  get confirmButton(): DetoxElement {
    return Matchers.getElementByID(EarnViewSelectors.CONFIRM_BUTTON);
  }

  get approveButton(): DetoxElement {
    return Matchers.getElementByID(EarnViewSelectors.APPROVE_BUTTON);
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByID(EarnViewSelectors.NEXT_BUTTON);
  }

  get completeStepProgress(): DetoxElement {
    return Matchers.getElementByID(EarnViewSelectors.COMPLETE_STEP_PROGRESS);
  }

  get txtRequest(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.TXT_REQUEST);
  }

  get txtHistory(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.TXT_HISTORY);
  }

  get txtApprove(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.TXT_APPROVE);
  }

  get txtLending(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.TXT_LENDING);
  }

  get txtWithdraw(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.TXT_WITHDRAW);
  }

  get txtSubmittedToast(): DetoxElement {
    return Matchers.getElementByText(EarnViewSelectors.TXT_SUBMITTED);
  }

  async tokenInReview(token: string): DetoxElement {
    return Matchers.getElementByText(token);
  }

  async enterAmount(amount: string) {
    for (const digit of amount) {
      const button = Matchers.getElementByText(digit);
      await Gestures.waitAndTap(button);
    }
  }

  async tapReview() {
    await Gestures.waitAndTap(this.reviewButton);
  }

  async tapConfirm() {
    await Utilities.waitForElementToStopMoving(this.confirmButton);
    await Gestures.waitAndTap(this.confirmButton);
  }

  async tapApprove() {
    await Gestures.waitAndTap(this.approveButton);
  }

  async tapNext() {
    await Gestures.waitAndTap(this.nextButton);
  }
}

export default new EarnView();

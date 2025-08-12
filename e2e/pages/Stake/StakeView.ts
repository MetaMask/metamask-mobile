import { StakeViewSelectors } from '../../selectors/Stake/StakeView.selectors.js';

import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class StakeView {
  get stakeContainer(): DetoxElement {
    return Matchers.getElementByText(StakeViewSelectors.STAKE_CONTAINER);
  }

  get unstakeContainer(): DetoxElement {
    return Matchers.getElementByText(StakeViewSelectors.UNSTAKE_CONTAINER);
  }

  get reviewButton(): DetoxElement {
    return Matchers.getElementByText(StakeViewSelectors.REVIEW_BUTTON);
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByText(StakeViewSelectors.CONTINUE);
  }

  async selectAmount(amount: string) {
    const amountButton = Matchers.getElementByText(amount);
    await Gestures.waitAndTap(amountButton);
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

  async tapContinue() {
    await Gestures.waitAndTap(this.continueButton);
  }
}

export default new StakeView();

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

  get confirmButton(): DetoxElement {
    return Matchers.getElementByText(StakeViewSelectors.CONFIRM);
  }

  async selectAmount(amount: string) {
    const amountButton = Matchers.getElementByText(amount);
    await Gestures.waitAndTap(amountButton);
  }

 async enterAmount(amount: string) {
  for (const digit of amount) {
    const button = await Matchers.getElementByText(digit);
    await Gestures.waitAndTap(button, { delayBeforeTap: 500 });
  }
}

  async tapReview() {
    await Gestures.waitAndTap(this.reviewButton, { delayBeforeTap: 1000});
  }

  async tapConfirm() {
    await Gestures.waitAndTap(this.confirmButton, { delayBeforeTap: 1000});
  }
}

export default new StakeView();

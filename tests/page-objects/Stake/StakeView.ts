import { StakeViewSelectors } from '../../locators/Stake/StakeView.selectors.js';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

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

  async selectAmount(amount: string): Promise<void> {
    const amountButton = Matchers.getElementByText(amount);
    await Gestures.waitAndTap(amountButton);
  }

  async enterAmount(amount: string): Promise<void> {
    for (const digit of amount) {
      const button = Matchers.getElementByText(digit);
      await Gestures.waitAndTap(button, {
        elemDescription: `Digit ${digit} in Stake Amount`,
      });
    }
  }

  async tapReview(): Promise<void> {
    await Gestures.waitAndTap(this.reviewButton, {
      elemDescription: 'Review Button in Stake View',
    });
  }

  async tapConfirm(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Stake View',
    });
  }
}

export default new StakeView();

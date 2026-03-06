import { StakeViewSelectors } from '../../selectors/Stake/StakeView.selectors.js';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Utilities from '../../framework/Utilities';

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

  async tapReview(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.reviewButton, {
      timeout,
      elemDescription: 'Review Button in Stake View',
    });
  }

  async tapReviewWithRetry(timeout = 90000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      await Gestures.waitAndTap(this.reviewButton, {
        timeout: 5000,
        elemDescription: 'Review Button in Stake View',
      });
      try {
        await Utilities.waitForElementToBeEnabled(this.confirmButton, 5000);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    throw new Error(
      `Confirm screen did not appear after tapping Review within ${timeout}ms`,
    );
  }

  async tapConfirm(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      timeout,
      elemDescription: 'Confirm Button in Stake View',
    });
  }
}

export default new StakeView();

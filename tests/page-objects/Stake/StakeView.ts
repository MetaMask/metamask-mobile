import { StakeViewSelectors } from '../../selectors/Stake/StakeView.selectors.js';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class StakeView {
  get stakeContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(StakeViewSelectors.STAKE_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementByText(StakeViewSelectors.STAKE_CONTAINER),
    });
  }

  get unstakeContainer(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(StakeViewSelectors.UNSTAKE_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          StakeViewSelectors.UNSTAKE_CONTAINER,
        ),
    });
  }

  get reviewButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(StakeViewSelectors.REVIEW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementByText(StakeViewSelectors.REVIEW_BUTTON),
    });
  }

  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(StakeViewSelectors.CONFIRM),
      appium: () =>
        PlaywrightMatchers.getElementByText(StakeViewSelectors.CONFIRM),
    });
  }

  async selectAmount(amount: string): Promise<void> {
    const amountButton = Matchers.getElementByText(amount);
    await UnifiedGestures.waitAndTap(amountButton);
  }

  async enterAmount(amount: string): Promise<void> {
    for (const digit of amount) {
      const button = Matchers.getElementByText(digit);
      await UnifiedGestures.waitAndTap(button, {
        elemDescription: `Digit ${digit} in Stake Amount`,
      });
    }
  }

  async tapReview(timeout?: number): Promise<void> {
    await UnifiedGestures.waitAndTap(this.reviewButton, {
      timeout,
      elemDescription: 'Review Button in Stake View',
    });
  }

  async tapReviewWithRetry(timeout = 90000): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        // Only tap review if we haven't already navigated to the confirm screen
        const onConfirmScreen = await Utilities.isElementVisible(
          this.confirmButton,
          2000,
        );
        if (!onConfirmScreen) {
          await UnifiedGestures.waitAndTap(this.reviewButton, {
            timeout: 5000,
            elemDescription: 'Review Button in Stake View',
          });
        }
        await Utilities.waitForElementToBeEnabled(this.confirmButton, 5000);
      },
      {
        timeout,
        description: 'Tap Review and wait for Confirm screen',
        elemDescription: 'Review → Confirm flow in Stake View',
      },
    );
  }

  async tapConfirm(timeout?: number): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      timeout,
      elemDescription: 'Confirm Button in Stake View',
    });
  }
}

export default new StakeView();
